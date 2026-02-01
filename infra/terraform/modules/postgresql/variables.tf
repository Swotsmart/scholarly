# PostgreSQL Module Variables

variable "server_name" {
  description = "Name of the PostgreSQL server"
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

variable "postgresql_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "administrator_login" {
  description = "Administrator login name"
  type        = string
  default     = "scholarlyadmin"
}

variable "administrator_password" {
  description = "Administrator password (generated if not provided)"
  type        = string
  default     = null
  sensitive   = true
}

variable "sku_name" {
  description = "SKU name for the server"
  type        = string
  default     = "B_Standard_B1ms" # Burstable, 1 vCore, 2GB RAM (~$12/month)
}

variable "storage_mb" {
  description = "Storage size in MB"
  type        = number
  default     = 32768 # 32 GB
}

variable "database_name" {
  description = "Name of the application database"
  type        = string
  default     = "scholarly"
}

# High Availability
variable "high_availability_enabled" {
  description = "Enable zone-redundant high availability"
  type        = bool
  default     = false
}

variable "standby_availability_zone" {
  description = "Availability zone for standby server"
  type        = string
  default     = "2"
}

# Backup
variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "geo_redundant_backup_enabled" {
  description = "Enable geo-redundant backups"
  type        = bool
  default     = false
}

# Networking
variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

variable "allow_all_ips" {
  description = "Allow connections from all IPs (dev only)"
  type        = bool
  default     = false
}

variable "allowed_ip_addresses" {
  description = "List of IP addresses to allow"
  type        = list(string)
  default     = []
}

variable "delegated_subnet_id" {
  description = "Subnet ID for VNet integration (private connectivity)"
  type        = string
  default     = null
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for private endpoint"
  type        = string
  default     = null
}

# Security
variable "enable_aad_auth" {
  description = "Enable Azure Active Directory authentication"
  type        = bool
  default     = false
}

# Logging
variable "log_min_duration_statement" {
  description = "Log queries taking longer than this (ms). -1 to disable, 0 to log all."
  type        = string
  default     = "1000" # Log queries taking more than 1 second
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
