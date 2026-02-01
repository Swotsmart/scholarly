# DDoS Protection Module Variables

variable "ddos_plan_name" {
  description = "Name of the DDoS Protection Plan"
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

variable "protected_vnet_id" {
  description = "ID of the VNet to protect with DDoS Protection"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Alert Configuration
variable "enable_alerts" {
  description = "Enable DDoS attack alerts"
  type        = bool
  default     = true
}

variable "alert_action_group_ids" {
  description = "List of Action Group IDs to notify on alerts"
  type        = list(string)
  default     = []
}

variable "packets_dropped_threshold" {
  description = "Threshold for packets dropped alert (total packets in 5 min window)"
  type        = number
  default     = 10000
}

variable "bytes_dropped_threshold" {
  description = "Threshold for bytes dropped alert (total bytes in 5 min window)"
  type        = number
  default     = 100000000 # 100 MB
}

# Logging
variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}
