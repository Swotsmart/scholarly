# Development Environment - Container Apps
# Cost-optimized for development and early production

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

  # Uncomment to use remote state
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "scholarlystate"
  #   container_name       = "tfstate"
  #   key                  = "dev.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Variables
variable "location" {
  default = "australiaeast"
}

variable "environment" {
  default = "dev"
}

variable "project" {
  default = "scholarly"
}

variable "jwt_secret" {
  description = "JWT secret (min 32 characters)"
  type        = string
  sensitive   = true
}

# Locals
locals {
  resource_prefix = "${var.project}-${var.environment}"
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.tags
}

# Log Analytics for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# Container Registry
module "acr" {
  source = "../../modules/acr"

  acr_name            = replace("${local.resource_prefix}acr", "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true
  tags                = local.tags
}

# PostgreSQL Database
module "postgresql" {
  source = "../../modules/postgresql"

  server_name         = "${local.resource_prefix}-db"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  database_name       = "scholarly"

  # Dev settings - minimal resources
  sku_name                  = "B_Standard_B1ms" # ~$12/month
  storage_mb                = 32768
  high_availability_enabled = false
  backup_retention_days     = 7
  allow_all_ips             = true # Dev only - remove for production

  tags = local.tags
}

# Container Apps
module "container_apps" {
  source = "../../modules/container-apps"

  environment_name           = "${local.resource_prefix}-env"
  app_name                   = local.resource_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Container configuration
  container_image    = "${module.acr.acr_login_server}/${var.project}:latest"
  acr_login_server   = module.acr.acr_login_server
  acr_admin_username = module.acr.acr_admin_username
  acr_admin_password = module.acr.acr_admin_password

  # Dev scaling - scale to zero when idle
  min_replicas = 0
  max_replicas = 2
  cpu          = 0.5
  memory       = "1Gi"

  # Application config
  environment     = "development"
  database_url    = module.postgresql.connection_string
  jwt_secret      = var.jwt_secret
  allowed_origins = "*"

  tags = local.tags

  depends_on = [module.acr, module.postgresql]
}

# Outputs
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  value = module.acr.acr_login_server
}

output "acr_admin_username" {
  value     = module.acr.acr_admin_username
  sensitive = true
}

output "acr_admin_password" {
  value     = module.acr.acr_admin_password
  sensitive = true
}

output "database_connection_string" {
  value     = module.postgresql.connection_string
  sensitive = true
}

output "app_url" {
  value = module.container_apps.app_url
}

output "app_fqdn" {
  value = module.container_apps.app_fqdn
}
