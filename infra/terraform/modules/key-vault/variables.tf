# Key Vault Module Variables

variable "key_vault_name" {
  description = "Name of the Key Vault (must be globally unique)"
  type        = string

  validation {
    condition     = length(var.key_vault_name) >= 3 && length(var.key_vault_name) <= 24
    error_message = "Key Vault name must be between 3 and 24 characters."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "sku_name" {
  description = "Key Vault SKU (standard or premium)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU must be 'standard' or 'premium'."
  }
}

variable "soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted vaults"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention must be between 7 and 90 days."
  }
}

variable "purge_protection_enabled" {
  description = "Enable purge protection (prevents permanent deletion)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Access Control
variable "admin_object_ids" {
  description = "List of Azure AD object IDs for admin access"
  type        = list(string)
  default     = []
}

variable "container_apps_identity_principal_id" {
  description = "Principal ID of Container Apps managed identity"
  type        = string
  default     = null
}

# Secrets Generation
variable "generate_jwt_secret" {
  description = "Generate a new JWT secret"
  type        = bool
  default     = true
}

variable "database_connection_string" {
  description = "PostgreSQL connection string to store"
  type        = string
  sensitive   = true
  default     = null
}

variable "create_placeholder_secrets" {
  description = "Create placeholder secrets for third-party API keys"
  type        = bool
  default     = true
}

# Network Configuration
variable "enable_private_endpoint" {
  description = "Enable private endpoint for Key Vault"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = null
}

variable "vnet_id" {
  description = "VNet ID for private DNS zone link"
  type        = string
  default     = null
}

variable "create_private_dns_zone" {
  description = "Create private DNS zone for Key Vault"
  type        = bool
  default     = true
}

variable "allowed_ip_ranges" {
  description = "List of allowed IP ranges (CIDR notation)"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of subnet IDs allowed to access Key Vault"
  type        = list(string)
  default     = []
}

# Logging
variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}
