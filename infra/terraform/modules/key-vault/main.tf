# Azure Key Vault Module
# Secure secrets management for Scholarly application

terraform {
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
}

# Get current Azure client configuration
data "azurerm_client_config" "current" {}

# ============================================================================
# KEY VAULT
# ============================================================================

resource "azurerm_key_vault" "main" {
  name                        = var.key_vault_name
  location                    = var.location
  resource_group_name         = var.resource_group_name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = var.sku_name
  enabled_for_disk_encryption = false
  soft_delete_retention_days  = var.soft_delete_retention_days
  purge_protection_enabled    = var.purge_protection_enabled

  # Network rules - restrict access
  network_acls {
    default_action             = var.enable_private_endpoint ? "Deny" : "Allow"
    bypass                     = "AzureServices"
    ip_rules                   = var.allowed_ip_ranges
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = var.tags
}

# ============================================================================
# ACCESS POLICIES
# ============================================================================

# Terraform deployment access (full access for management)
resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Purge",
    "Recover",
    "Backup",
    "Restore"
  ]

  key_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Purge",
    "Recover",
    "Backup",
    "Restore"
  ]

  certificate_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Purge",
    "Recover",
    "Backup",
    "Restore"
  ]
}

# Container Apps managed identity access (read-only secrets)
resource "azurerm_key_vault_access_policy" "container_apps" {
  count        = var.container_apps_identity_principal_id != null ? 1 : 0
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.container_apps_identity_principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# Additional admin access policies
resource "azurerm_key_vault_access_policy" "admins" {
  for_each     = toset(var.admin_object_ids)
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = each.value

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Recover",
    "Backup",
    "Restore"
  ]

  key_permissions = [
    "Get",
    "List"
  ]
}

# ============================================================================
# SECRETS - Auto-generated
# ============================================================================

# Generate JWT Secret (64 characters)
resource "random_password" "jwt_secret" {
  count   = var.generate_jwt_secret ? 1 : 0
  length  = 64
  special = true
  upper   = true
  lower   = true
  numeric = true
}

# Store JWT Secret
resource "azurerm_key_vault_secret" "jwt_secret" {
  count        = var.generate_jwt_secret ? 1 : 0
  name         = "jwt-secret"
  value        = random_password.jwt_secret[0].result
  key_vault_id = azurerm_key_vault.main.id
  content_type = "application/json"

  tags = merge(var.tags, {
    purpose = "JWT token signing"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

# Store Database URL
resource "azurerm_key_vault_secret" "database_url" {
  count        = var.database_connection_string != null ? 1 : 0
  name         = "database-url"
  value        = var.database_connection_string
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "PostgreSQL connection string"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]
}

# Placeholder secrets (to be filled via Azure Portal)
resource "azurerm_key_vault_secret" "anthropic_api_key" {
  count        = var.create_placeholder_secrets ? 1 : 0
  name         = "anthropic-api-key"
  value        = "PLACEHOLDER-ADD-VIA-PORTAL"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "Anthropic Claude API key"
    status  = "placeholder"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]

  lifecycle {
    ignore_changes = [value] # Don't overwrite once manually set
  }
}

resource "azurerm_key_vault_secret" "openai_api_key" {
  count        = var.create_placeholder_secrets ? 1 : 0
  name         = "openai-api-key"
  value        = "PLACEHOLDER-ADD-VIA-PORTAL"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "OpenAI API key"
    status  = "placeholder"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "stripe_secret_key" {
  count        = var.create_placeholder_secrets ? 1 : 0
  name         = "stripe-secret-key"
  value        = "PLACEHOLDER-ADD-VIA-PORTAL"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "Stripe secret API key"
    status  = "placeholder"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "stripe_webhook_secret" {
  count        = var.create_placeholder_secrets ? 1 : 0
  name         = "stripe-webhook-secret"
  value        = "PLACEHOLDER-ADD-VIA-PORTAL"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "Stripe webhook signing secret"
    status  = "placeholder"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "sendgrid_api_key" {
  count        = var.create_placeholder_secrets ? 1 : 0
  name         = "sendgrid-api-key"
  value        = "PLACEHOLDER-ADD-VIA-PORTAL"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  tags = merge(var.tags, {
    purpose = "SendGrid email API key"
    status  = "placeholder"
  })

  depends_on = [azurerm_key_vault_access_policy.terraform]

  lifecycle {
    ignore_changes = [value]
  }
}

# ============================================================================
# PRIVATE ENDPOINT (Optional)
# ============================================================================

resource "azurerm_private_endpoint" "key_vault" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.key_vault_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.key_vault_name}-psc"
    private_connection_resource_id = azurerm_key_vault.main.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  tags = var.tags
}

# Private DNS Zone for Key Vault
resource "azurerm_private_dns_zone" "key_vault" {
  count               = var.enable_private_endpoint && var.create_private_dns_zone ? 1 : 0
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "key_vault" {
  count                 = var.enable_private_endpoint && var.create_private_dns_zone ? 1 : 0
  name                  = "${var.key_vault_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.key_vault[0].name
  virtual_network_id    = var.vnet_id

  tags = var.tags
}

resource "azurerm_private_dns_a_record" "key_vault" {
  count               = var.enable_private_endpoint && var.create_private_dns_zone ? 1 : 0
  name                = var.key_vault_name
  zone_name           = azurerm_private_dns_zone.key_vault[0].name
  resource_group_name = var.resource_group_name
  ttl                 = 300
  records             = [azurerm_private_endpoint.key_vault[0].private_service_connection[0].private_ip_address]
}

# ============================================================================
# DIAGNOSTIC SETTINGS
# ============================================================================

resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.key_vault_name}-diagnostics"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "key_vault_id" {
  description = "Key Vault ID"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "jwt_secret_id" {
  description = "JWT secret ID in Key Vault"
  value       = var.generate_jwt_secret ? azurerm_key_vault_secret.jwt_secret[0].id : null
}

output "jwt_secret_uri" {
  description = "JWT secret URI (for referencing in Container Apps)"
  value       = var.generate_jwt_secret ? azurerm_key_vault_secret.jwt_secret[0].versionless_id : null
}

output "database_url_secret_uri" {
  description = "Database URL secret URI"
  value       = var.database_connection_string != null ? azurerm_key_vault_secret.database_url[0].versionless_id : null
}

output "private_endpoint_ip" {
  description = "Private endpoint IP address"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.key_vault[0].private_service_connection[0].private_ip_address : null
}
