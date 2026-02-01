# Production Environment - Enterprise-Grade Deployment
# Full production configuration with HA, security, and compliance

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state - uncomment and configure
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "scholarlystate"
  #   container_name       = "tfstate"
  #   key                  = "prod.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "location" {
  default = "australiaeast"
}

variable "environment" {
  default = "prod"
}

variable "project" {
  default = "scholarly"
}

variable "jwt_secret" {
  description = "JWT secret (min 32 characters) - ignored if use_key_vault is true"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_group_object_ids" {
  description = "AAD group object IDs for AKS admin access"
  type        = list(string)
  default     = []
}

variable "deploy_aks" {
  description = "Deploy AKS cluster (set to false to save costs)"
  type        = bool
  default     = false
}

variable "enable_ddos_protection" {
  description = "Enable DDoS Protection Standard (additional cost)"
  type        = bool
  default     = true
}

variable "enable_front_door" {
  description = "Enable Azure Front Door with WAF"
  type        = bool
  default     = true
}

variable "enable_key_vault" {
  description = "Enable Azure Key Vault for secrets management"
  type        = bool
  default     = true
}

variable "custom_domain" {
  description = "Custom domain for Front Door (e.g., app.scholarly.edu.au)"
  type        = string
  default     = null
}

variable "allowed_countries" {
  description = "Allowed countries for geo-restriction (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = ["AU", "NZ"] # Australia and New Zealand
}

# ============================================================================
# LOCALS
# ============================================================================

locals {
  resource_prefix = "${var.project}-${var.environment}"
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = "production"
  }
}

# ============================================================================
# RESOURCE GROUP
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.tags
}

# ============================================================================
# LOG ANALYTICS
# ============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.tags
}

# ============================================================================
# NETWORKING MODULE
# ============================================================================

module "networking" {
  source = "../../modules/networking"

  vnet_name           = "${local.resource_prefix}-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  vnet_address_space  = ["10.0.0.0/16"]

  container_apps_subnet_cidr    = "10.0.0.0/21"
  postgresql_subnet_cidr        = "10.0.16.0/24"
  private_endpoints_subnet_cidr = "10.0.17.0/24"
  aks_subnet_cidr               = "10.0.32.0/20"
  create_aks_subnet             = var.deploy_aks

  ddos_protection_plan_id  = var.enable_ddos_protection ? module.ddos[0].ddos_protection_plan_id : null
  create_private_dns_zones = true

  tags = local.tags
}

# ============================================================================
# DDOS PROTECTION MODULE
# ============================================================================

module "ddos" {
  count  = var.enable_ddos_protection ? 1 : 0
  source = "../../modules/ddos"

  ddos_plan_name      = "${local.resource_prefix}-ddos"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  protected_vnet_id   = module.networking.vnet_id

  enable_alerts              = true
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = local.tags
}

# ============================================================================
# KEY VAULT MODULE
# ============================================================================

module "key_vault" {
  count  = var.enable_key_vault ? 1 : 0
  source = "../../modules/key-vault"

  key_vault_name               = "${replace(local.resource_prefix, "-", "")}kv"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  sku_name                     = "standard"
  purge_protection_enabled     = true
  soft_delete_retention_days   = 90

  generate_jwt_secret          = true
  database_connection_string   = module.postgresql.connection_string
  create_placeholder_secrets   = true

  enable_private_endpoint      = true
  private_endpoint_subnet_id   = module.networking.private_endpoints_subnet_id
  vnet_id                      = module.networking.vnet_id
  create_private_dns_zone      = false # Using module.networking DNS zones

  admin_object_ids             = var.admin_group_object_ids
  log_analytics_workspace_id   = azurerm_log_analytics_workspace.main.id

  tags = local.tags

  depends_on = [module.networking, module.postgresql]
}

# ============================================================================
# CONTAINER REGISTRY
# ============================================================================

module "acr" {
  source = "../../modules/acr"

  acr_name            = replace("${local.resource_prefix}acr", "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard" # Upgrade to Premium for geo-replication
  admin_enabled       = true
  tags                = local.tags
}

# ============================================================================
# POSTGRESQL DATABASE
# ============================================================================

module "postgresql" {
  source = "../../modules/postgresql"

  server_name         = "${local.resource_prefix}-db"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  database_name       = "scholarly"

  # Production settings
  sku_name                      = "GP_Standard_D2s_v3" # General Purpose, 2 vCores (~$125/month)
  storage_mb                    = 65536                 # 64 GB
  high_availability_enabled     = true                  # Zone-redundant HA
  backup_retention_days         = 35
  geo_redundant_backup_enabled  = true
  public_network_access_enabled = false # Private endpoint only
  allow_all_ips                 = false

  # VNet integration
  delegated_subnet_id = module.networking.postgresql_subnet_id
  private_dns_zone_id = module.networking.postgresql_private_dns_zone_id

  tags = local.tags

  depends_on = [module.networking]
}

# ============================================================================
# AKS CLUSTER (OPTIONAL)
# ============================================================================

module "aks" {
  count  = var.deploy_aks ? 1 : 0
  source = "../../modules/aks"

  cluster_name        = "${local.resource_prefix}-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  dns_prefix          = local.resource_prefix
  kubernetes_version  = "1.28"

  # System node pool - HA across 3 zones
  system_node_count = 2
  system_node_size  = "Standard_D2s_v3"
  system_node_min   = 2
  system_node_max   = 4

  # Networking
  vnet_subnet_id = module.networking.aks_subnet_id
  network_plugin = "azure"
  network_policy = "azure"

  # HA configuration
  availability_zones  = ["1", "2", "3"]
  enable_auto_scaling = true

  # Security
  azure_policy_enabled       = true
  azure_rbac_enabled         = true
  admin_group_object_ids     = var.admin_group_object_ids

  # ACR integration
  acr_id = module.acr.acr_id

  tags = local.tags

  depends_on = [module.networking]
}

# ============================================================================
# CONTAINER APPS
# ============================================================================

module "container_apps" {
  source = "../../modules/container-apps"

  environment_name           = "${local.resource_prefix}-env"
  app_name                   = local.resource_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # VNet integration
  infrastructure_subnet_id = module.networking.container_apps_subnet_id

  # Container configuration
  container_image    = "${module.acr.acr_login_server}/${var.project}:latest"
  acr_login_server   = module.acr.acr_login_server
  acr_admin_username = module.acr.acr_admin_username
  acr_admin_password = module.acr.acr_admin_password

  # Production scaling
  min_replicas = 1
  max_replicas = 5
  cpu          = 1
  memory       = "2Gi"

  # Application config - use Key Vault references when enabled
  environment     = "production"
  database_url    = var.enable_key_vault ? "" : module.postgresql.connection_string
  jwt_secret      = var.enable_key_vault ? "" : var.jwt_secret
  allowed_origins = var.custom_domain != null ? "https://${var.custom_domain}" : "https://scholarly.example.com"

  # Key Vault integration
  key_vault_id             = var.enable_key_vault ? module.key_vault[0].key_vault_id : null
  key_vault_uri            = var.enable_key_vault ? module.key_vault[0].key_vault_uri : null
  use_key_vault_references = var.enable_key_vault

  tags = local.tags

  depends_on = [module.acr, module.postgresql, module.networking, module.key_vault]
}

# ============================================================================
# FRONT DOOR WITH WAF
# ============================================================================

module "front_door" {
  count  = var.enable_front_door ? 1 : 0
  source = "../../modules/front-door"

  front_door_name     = "${local.resource_prefix}-fd"
  resource_group_name = azurerm_resource_group.main.name

  # Backend configuration
  web_backend_host = module.container_apps.app_fqdn
  api_backend_host = module.container_apps.app_fqdn

  # Health probes
  web_health_probe_path = "/"
  api_health_probe_path = "/health"

  # WAF configuration
  waf_mode                       = "Prevention"
  rate_limit_requests_per_minute = 1000
  allowed_countries              = var.allowed_countries

  # Custom domain
  custom_domain = var.custom_domain

  # Security headers
  content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.stripe.com"

  # Logging
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = local.tags

  depends_on = [module.container_apps]
}

# ============================================================================
# ALERT ACTION GROUP
# ============================================================================

resource "azurerm_monitor_action_group" "critical" {
  name                = "${local.resource_prefix}-critical-alerts"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "CritAlerts"

  # Email notifications - add your team emails
  # email_receiver {
  #   name          = "ops-team"
  #   email_address = "ops@scholarly.edu.au"
  # }

  tags = local.tags
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "vnet_id" {
  value = module.networking.vnet_id
}

output "acr_login_server" {
  value = module.acr.acr_login_server
}

output "database_fqdn" {
  value = module.postgresql.server_fqdn
}

output "container_apps_url" {
  value = module.container_apps.app_url
}

output "container_apps_fqdn" {
  value = module.container_apps.app_fqdn
}

output "front_door_url" {
  value       = var.enable_front_door ? module.front_door[0].endpoint_url : null
  description = "Front Door endpoint URL (use this for production traffic)"
}

output "front_door_host" {
  value       = var.enable_front_door ? module.front_door[0].endpoint_host_name : null
  description = "Front Door hostname for DNS configuration"
}

output "key_vault_uri" {
  value       = var.enable_key_vault ? module.key_vault[0].key_vault_uri : null
  description = "Key Vault URI for secrets access"
}

output "ddos_protection_plan_id" {
  value       = var.enable_ddos_protection ? module.ddos[0].ddos_protection_plan_id : null
  description = "DDoS Protection Plan ID"
}

output "aks_cluster_name" {
  value = var.deploy_aks ? module.aks[0].cluster_name : "AKS not deployed"
}

output "aks_kube_config" {
  value     = var.deploy_aks ? module.aks[0].kube_config : ""
  sensitive = true
}

# Instructions output
output "next_steps" {
  value = <<-EOT

    ====================================================
    PRODUCTION DEPLOYMENT COMPLETE
    ====================================================

    Application URL: ${var.enable_front_door ? module.front_door[0].endpoint_url : module.container_apps.app_url}

    SECURITY FEATURES ENABLED:
    ✓ Azure Front Door with WAF (OWASP 3.2, Bot Protection)
    ✓ DDoS Protection Standard: ${var.enable_ddos_protection ? "Enabled" : "Disabled"}
    ✓ Key Vault for secrets management: ${var.enable_key_vault ? "Enabled" : "Disabled"}
    ✓ Private endpoints for database
    ✓ NSG rules restricting traffic

    ${var.enable_key_vault ? "SECRETS TO CONFIGURE IN KEY VAULT:" : ""}
    ${var.enable_key_vault ? "- anthropic-api-key: Add your Anthropic API key" : ""}
    ${var.enable_key_vault ? "- openai-api-key: Add your OpenAI API key" : ""}
    ${var.enable_key_vault ? "- stripe-secret-key: Add your Stripe secret key" : ""}
    ${var.enable_key_vault ? "- stripe-webhook-secret: Add your Stripe webhook secret" : ""}
    ${var.enable_key_vault ? "- sendgrid-api-key: Add your SendGrid API key" : ""}

    ${var.custom_domain != null ? "CUSTOM DOMAIN SETUP:" : ""}
    ${var.custom_domain != null ? "1. Add CNAME record: ${var.custom_domain} -> ${module.front_door[0].endpoint_host_name}" : ""}
    ${var.custom_domain != null ? "2. Wait for SSL certificate provisioning (~10 minutes)" : ""}

    DEPLOYMENT COMMANDS:
      az acr login --name ${replace("${local.resource_prefix}acr", "-", "")}
      docker build -t ${module.acr.acr_login_server}/${var.project}:latest .
      docker push ${module.acr.acr_login_server}/${var.project}:latest

    VERIFICATION:
      # Test WAF (should be blocked):
      curl "${var.enable_front_door ? module.front_door[0].endpoint_url : module.container_apps.app_url}/api?id=1%20OR%201=1"

      # Test health endpoint:
      curl "${var.enable_front_door ? module.front_door[0].endpoint_url : module.container_apps.app_url}/health"

    %{if var.deploy_aks}
    KUBERNETES ACCESS:
      az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${local.resource_prefix}-aks
    %{else}
    AKS is not deployed. Set deploy_aks = true to enable.
    %{endif}

    ====================================================
  EOT
}
