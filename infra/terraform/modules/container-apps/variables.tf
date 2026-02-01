# Container Apps Module Variables

variable "environment_name" {
  description = "Name of the Container Apps environment"
  type        = string
}

variable "app_name" {
  description = "Name of the Container App"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for monitoring"
  type        = string
  default     = null
}

# Networking
variable "infrastructure_subnet_id" {
  description = "Subnet ID for Container Apps infrastructure (VNet integration)"
  type        = string
  default     = null
}

variable "internal_only" {
  description = "Only allow internal access (no public endpoint)"
  type        = bool
  default     = false
}

# Container Registry
variable "acr_login_server" {
  description = "ACR login server URL"
  type        = string
}

variable "acr_admin_username" {
  description = "ACR admin username"
  type        = string
  sensitive   = true
}

variable "acr_admin_password" {
  description = "ACR admin password"
  type        = string
  sensitive   = true
}

# Container configuration
variable "container_image" {
  description = "Full container image path"
  type        = string
}

variable "cpu" {
  description = "CPU allocation (e.g., 0.5, 1, 2)"
  type        = number
  default     = 0.5
}

variable "memory" {
  description = "Memory allocation (e.g., 1Gi, 2Gi)"
  type        = string
  default     = "1Gi"
}

# Scaling
variable "min_replicas" {
  description = "Minimum number of replicas"
  type        = number
  default     = 0
}

variable "max_replicas" {
  description = "Maximum number of replicas"
  type        = number
  default     = 3
}

variable "enable_http_scaling" {
  description = "Enable HTTP-based autoscaling"
  type        = bool
  default     = true
}

variable "concurrent_requests_per_replica" {
  description = "Number of concurrent requests per replica before scaling"
  type        = number
  default     = 50
}

# Application configuration
variable "environment" {
  description = "Environment name (development, production)"
  type        = string
  default     = "production"
}

variable "database_url" {
  description = "PostgreSQL connection string (ignored if use_key_vault_references is true)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret key (ignored if use_key_vault_references is true)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "*"
}

# Key Vault integration
variable "use_key_vault_references" {
  description = "Use Key Vault references for secrets instead of direct values"
  type        = bool
  default     = false
}

variable "key_vault_id" {
  description = "Key Vault ID for access policy"
  type        = string
  default     = null
}

variable "key_vault_uri" {
  description = "Key Vault URI for secret references"
  type        = string
  default     = null
}

# AI service configuration
variable "ai_provider" {
  description = "AI provider to use (openai or anthropic)"
  type        = string
  default     = "anthropic"

  validation {
    condition     = contains(["openai", "anthropic"], var.ai_provider)
    error_message = "AI provider must be 'openai' or 'anthropic'."
  }
}

# Email service configuration
variable "email_from" {
  description = "Email from address"
  type        = string
  default     = "noreply@scholarly.edu.au"
}

variable "email_from_name" {
  description = "Email from name"
  type        = string
  default     = "Scholarly"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
