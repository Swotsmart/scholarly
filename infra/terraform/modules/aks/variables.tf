variable "cluster_name" {
  description = "Name of the AKS cluster"
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

variable "dns_prefix" {
  description = "DNS prefix for the cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

# System node pool
variable "system_node_count" {
  description = "Initial number of system nodes"
  type        = number
  default     = 2
}

variable "system_node_size" {
  description = "VM size for system nodes"
  type        = string
  default     = "Standard_D2s_v3" # 2 vCPU, 8 GB RAM
}

variable "system_node_min" {
  description = "Minimum system nodes (autoscaling)"
  type        = number
  default     = 2
}

variable "system_node_max" {
  description = "Maximum system nodes (autoscaling)"
  type        = number
  default     = 4
}

# Application node pool
variable "create_app_node_pool" {
  description = "Create a separate node pool for application workloads"
  type        = bool
  default     = false
}

variable "app_node_count" {
  description = "Initial number of app nodes"
  type        = number
  default     = 2
}

variable "app_node_size" {
  description = "VM size for app nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "app_node_min" {
  description = "Minimum app nodes (autoscaling)"
  type        = number
  default     = 1
}

variable "app_node_max" {
  description = "Maximum app nodes (autoscaling)"
  type        = number
  default     = 5
}

variable "app_node_taints" {
  description = "Taints for app node pool"
  type        = list(string)
  default     = []
}

# General node configuration
variable "os_disk_size_gb" {
  description = "OS disk size in GB"
  type        = number
  default     = 128
}

variable "enable_auto_scaling" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "availability_zones" {
  description = "Availability zones for HA"
  type        = list(string)
  default     = ["1", "2", "3"]
}

# Networking
variable "vnet_subnet_id" {
  description = "Subnet ID for the cluster"
  type        = string
  default     = null
}

variable "network_plugin" {
  description = "Network plugin (azure or kubenet)"
  type        = string
  default     = "azure"
}

variable "network_policy" {
  description = "Network policy (azure, calico, or null)"
  type        = string
  default     = "azure"
}

# Security
variable "azure_policy_enabled" {
  description = "Enable Azure Policy addon"
  type        = bool
  default     = true
}

variable "azure_rbac_enabled" {
  description = "Enable Azure RBAC for Kubernetes"
  type        = bool
  default     = true
}

variable "admin_group_object_ids" {
  description = "AAD group object IDs for cluster admin access"
  type        = list(string)
  default     = []
}

# Integration
variable "acr_id" {
  description = "ACR resource ID for image pull access"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "Log Analytics retention in days"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
