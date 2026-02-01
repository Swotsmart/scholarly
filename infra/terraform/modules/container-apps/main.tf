# Azure Container Apps Module
# Primary deployment target with Key Vault integration and VNet support

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# USER-ASSIGNED MANAGED IDENTITY
# ============================================================================

resource "azurerm_user_assigned_identity" "scholarly" {
  count               = var.use_key_vault_references ? 1 : 0
  name                = "${var.app_name}-identity"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags
}

# Key Vault access for managed identity
resource "azurerm_key_vault_access_policy" "container_apps" {
  count        = var.use_key_vault_references && var.key_vault_id != null ? 1 : 0
  key_vault_id = var.key_vault_id
  tenant_id    = azurerm_user_assigned_identity.scholarly[0].tenant_id
  object_id    = azurerm_user_assigned_identity.scholarly[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]
}

# ============================================================================
# CONTAINER APPS ENVIRONMENT
# ============================================================================

resource "azurerm_container_app_environment" "main" {
  name                           = var.environment_name
  location                       = var.location
  resource_group_name            = var.resource_group_name
  log_analytics_workspace_id     = var.log_analytics_workspace_id
  infrastructure_subnet_id       = var.infrastructure_subnet_id
  internal_load_balancer_enabled = var.internal_only

  tags = var.tags
}

# ============================================================================
# CONTAINER APP
# ============================================================================

resource "azurerm_container_app" "scholarly" {
  name                         = var.app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  # Managed Identity for Key Vault access
  dynamic "identity" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.scholarly[0].id]
    }
  }

  # Registry credentials
  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }

  # Secrets - direct values or Key Vault references
  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }

  # Database URL - either direct or Key Vault reference
  dynamic "secret" {
    for_each = var.use_key_vault_references ? [] : [1]
    content {
      name  = "database-url"
      value = var.database_url
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "database-url"
      key_vault_secret_id = "${var.key_vault_uri}secrets/database-url"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  # JWT Secret - either direct or Key Vault reference
  dynamic "secret" {
    for_each = var.use_key_vault_references ? [] : [1]
    content {
      name  = "jwt-secret"
      value = var.jwt_secret
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "jwt-secret"
      key_vault_secret_id = "${var.key_vault_uri}secrets/jwt-secret"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  # Third-party API secrets from Key Vault
  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "anthropic-api-key"
      key_vault_secret_id = "${var.key_vault_uri}secrets/anthropic-api-key"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "openai-api-key"
      key_vault_secret_id = "${var.key_vault_uri}secrets/openai-api-key"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "stripe-secret-key"
      key_vault_secret_id = "${var.key_vault_uri}secrets/stripe-secret-key"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "stripe-webhook-secret"
      key_vault_secret_id = "${var.key_vault_uri}secrets/stripe-webhook-secret"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_references ? [1] : []
    content {
      name                = "sendgrid-api-key"
      key_vault_secret_id = "${var.key_vault_uri}secrets/sendgrid-api-key"
      identity            = azurerm_user_assigned_identity.scholarly[0].id
    }
  }

  # Ingress configuration
  ingress {
    external_enabled = !var.internal_only
    target_port      = 3000
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  # Container configuration
  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "scholarly"
      image  = var.container_image
      cpu    = var.cpu
      memory = var.memory

      # Core environment variables
      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = var.allowed_origins
      }

      # AI service configuration
      env {
        name  = "AI_PROVIDER"
        value = var.ai_provider
      }

      dynamic "env" {
        for_each = var.use_key_vault_references ? [1] : []
        content {
          name        = "ANTHROPIC_API_KEY"
          secret_name = "anthropic-api-key"
        }
      }

      dynamic "env" {
        for_each = var.use_key_vault_references ? [1] : []
        content {
          name        = "OPENAI_API_KEY"
          secret_name = "openai-api-key"
        }
      }

      # Payment service configuration
      dynamic "env" {
        for_each = var.use_key_vault_references ? [1] : []
        content {
          name        = "STRIPE_SECRET_KEY"
          secret_name = "stripe-secret-key"
        }
      }

      dynamic "env" {
        for_each = var.use_key_vault_references ? [1] : []
        content {
          name        = "STRIPE_WEBHOOK_SECRET"
          secret_name = "stripe-webhook-secret"
        }
      }

      # Email service configuration
      dynamic "env" {
        for_each = var.use_key_vault_references ? [1] : []
        content {
          name        = "SENDGRID_API_KEY"
          secret_name = "sendgrid-api-key"
        }
      }

      env {
        name  = "EMAIL_FROM"
        value = var.email_from
      }

      env {
        name  = "EMAIL_FROM_NAME"
        value = var.email_from_name
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 3000

        initial_delay    = 10
        interval_seconds = 30
        timeout          = 3
        failure_count_threshold = 3
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        path      = "/health"
        port      = 3000

        interval_seconds = 10
        timeout          = 3
        failure_count_threshold = 3
      }
    }

    # Scaling rules
    dynamic "http_scale_rule" {
      for_each = var.enable_http_scaling ? [1] : []
      content {
        name                = "http-scaling"
        concurrent_requests = var.concurrent_requests_per_replica
      }
    }
  }

  tags = var.tags

  depends_on = [azurerm_key_vault_access_policy.container_apps]
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.main.id
}

output "environment_static_ip" {
  description = "Container Apps Environment static IP address"
  value       = azurerm_container_app_environment.main.static_ip_address
}

output "environment_default_domain" {
  description = "Container Apps Environment default domain"
  value       = azurerm_container_app_environment.main.default_domain
}

output "app_id" {
  description = "Container App ID"
  value       = azurerm_container_app.scholarly.id
}

output "app_fqdn" {
  description = "Container App FQDN"
  value       = azurerm_container_app.scholarly.ingress[0].fqdn
}

output "app_url" {
  description = "Container App URL"
  value       = "https://${azurerm_container_app.scholarly.ingress[0].fqdn}"
}

output "latest_revision_name" {
  description = "Latest revision name"
  value       = azurerm_container_app.scholarly.latest_revision_name
}

output "managed_identity_principal_id" {
  description = "Managed identity principal ID (for Key Vault access)"
  value       = var.use_key_vault_references ? azurerm_user_assigned_identity.scholarly[0].principal_id : null
}

output "managed_identity_client_id" {
  description = "Managed identity client ID"
  value       = var.use_key_vault_references ? azurerm_user_assigned_identity.scholarly[0].client_id : null
}
