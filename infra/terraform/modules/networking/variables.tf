# Networking Module Variables

variable "vnet_name" {
  description = "Name of the Virtual Network"
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

variable "vnet_address_space" {
  description = "Address space for the VNet"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Subnet CIDRs
variable "container_apps_subnet_cidr" {
  description = "CIDR for Container Apps subnet"
  type        = string
  default     = "10.0.0.0/21"
}

variable "postgresql_subnet_cidr" {
  description = "CIDR for PostgreSQL subnet"
  type        = string
  default     = "10.0.16.0/24"
}

variable "private_endpoints_subnet_cidr" {
  description = "CIDR for Private Endpoints subnet"
  type        = string
  default     = "10.0.17.0/24"
}

variable "aks_subnet_cidr" {
  description = "CIDR for AKS subnet"
  type        = string
  default     = "10.0.32.0/20"
}

variable "create_aks_subnet" {
  description = "Create AKS subnet"
  type        = bool
  default     = false
}

# DDoS Protection
variable "ddos_protection_plan_id" {
  description = "ID of DDoS Protection Plan to associate"
  type        = string
  default     = null
}

# Private DNS
variable "create_private_dns_zones" {
  description = "Create private DNS zones for Azure services"
  type        = bool
  default     = true
}
