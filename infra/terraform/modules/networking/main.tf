# Azure Networking Module
# Virtual Network, Subnets, NSGs, and Private Endpoints

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# VIRTUAL NETWORK
# ============================================================================

resource "azurerm_virtual_network" "main" {
  name                = var.vnet_name
  address_space       = var.vnet_address_space
  location            = var.location
  resource_group_name = var.resource_group_name

  # DDoS Protection Plan association
  dynamic "ddos_protection_plan" {
    for_each = var.ddos_protection_plan_id != null ? [1] : []
    content {
      id     = var.ddos_protection_plan_id
      enable = true
    }
  }

  tags = var.tags
}

# ============================================================================
# SUBNETS
# ============================================================================

# Container Apps Subnet
resource "azurerm_subnet" "container_apps" {
  name                 = "container-apps-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.container_apps_subnet_cidr]

  service_endpoints = [
    "Microsoft.KeyVault",
    "Microsoft.Storage",
    "Microsoft.Sql"
  ]

  delegation {
    name = "container-apps"
    service_delegation {
      name = "Microsoft.App/environments"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# PostgreSQL Subnet
resource "azurerm_subnet" "postgresql" {
  name                 = "postgresql-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.postgresql_subnet_cidr]

  service_endpoints = [
    "Microsoft.Storage"
  ]

  delegation {
    name = "postgresql"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# Private Endpoints Subnet
resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.private_endpoints_subnet_cidr]

  private_endpoint_network_policies_enabled = false
}

# AKS Subnet (optional)
resource "azurerm_subnet" "aks" {
  count                = var.create_aks_subnet ? 1 : 0
  name                 = "aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_cidr]

  service_endpoints = [
    "Microsoft.KeyVault",
    "Microsoft.Storage",
    "Microsoft.Sql",
    "Microsoft.ContainerRegistry"
  ]
}

# ============================================================================
# NETWORK SECURITY GROUPS
# ============================================================================

# Container Apps NSG
resource "azurerm_network_security_group" "container_apps" {
  name                = "${var.vnet_name}-container-apps-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# PostgreSQL NSG
resource "azurerm_network_security_group" "postgresql" {
  name                = "${var.vnet_name}-postgresql-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Private Endpoints NSG
resource "azurerm_network_security_group" "private_endpoints" {
  name                = "${var.vnet_name}-private-endpoints-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# ============================================================================
# NSG RULES - Container Apps
# ============================================================================

# Inbound: Allow Azure Front Door
resource "azurerm_network_security_rule" "container_apps_inbound_front_door" {
  name                        = "AllowFrontDoorInbound"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefix       = "AzureFrontDoor.Backend"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Inbound: Allow Azure Load Balancer health probes
resource "azurerm_network_security_rule" "container_apps_inbound_lb" {
  name                        = "AllowAzureLoadBalancer"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "AzureLoadBalancer"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Inbound: Allow VNet internal traffic
resource "azurerm_network_security_rule" "container_apps_inbound_vnet" {
  name                        = "AllowVNetInbound"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "VirtualNetwork"
  destination_address_prefix  = "VirtualNetwork"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Inbound: Deny all other traffic
resource "azurerm_network_security_rule" "container_apps_inbound_deny" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow PostgreSQL
resource "azurerm_network_security_rule" "container_apps_outbound_postgresql" {
  name                        = "AllowPostgreSQLOutbound"
  priority                    = 100
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "5432"
  source_address_prefix       = "*"
  destination_address_prefix  = var.postgresql_subnet_cidr
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow Key Vault
resource "azurerm_network_security_rule" "container_apps_outbound_keyvault" {
  name                        = "AllowKeyVaultOutbound"
  priority                    = 110
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "AzureKeyVault"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow Azure Active Directory
resource "azurerm_network_security_rule" "container_apps_outbound_aad" {
  name                        = "AllowAADOutbound"
  priority                    = 120
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "AzureActiveDirectory"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow Azure Monitor
resource "azurerm_network_security_rule" "container_apps_outbound_monitor" {
  name                        = "AllowAzureMonitorOutbound"
  priority                    = 130
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "AzureMonitor"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow Container Registry
resource "azurerm_network_security_rule" "container_apps_outbound_acr" {
  name                        = "AllowACROutbound"
  priority                    = 140
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "AzureContainerRegistry"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow HTTPS to Internet (for external APIs: Stripe, SendGrid, AI services)
resource "azurerm_network_security_rule" "container_apps_outbound_https" {
  name                        = "AllowHTTPSOutbound"
  priority                    = 200
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "Internet"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# Outbound: Allow DNS
resource "azurerm_network_security_rule" "container_apps_outbound_dns" {
  name                        = "AllowDNSOutbound"
  priority                    = 210
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "53"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.container_apps.name
}

# ============================================================================
# NSG RULES - PostgreSQL
# ============================================================================

# Inbound: Allow only from Container Apps subnet
resource "azurerm_network_security_rule" "postgresql_inbound_container_apps" {
  name                        = "AllowContainerAppsInbound"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "5432"
  source_address_prefix       = var.container_apps_subnet_cidr
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.postgresql.name
}

# Inbound: Allow Azure services (for management)
resource "azurerm_network_security_rule" "postgresql_inbound_azure" {
  name                        = "AllowAzureServicesInbound"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "5432"
  source_address_prefix       = "AzureCloud"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.postgresql.name
}

# Inbound: Deny all other traffic
resource "azurerm_network_security_rule" "postgresql_inbound_deny" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.postgresql.name
}

# Outbound: Allow Azure Storage (for backups)
resource "azurerm_network_security_rule" "postgresql_outbound_storage" {
  name                        = "AllowStorageOutbound"
  priority                    = 100
  direction                   = "Outbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "Storage"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.postgresql.name
}

# Outbound: Deny all other traffic
resource "azurerm_network_security_rule" "postgresql_outbound_deny" {
  name                        = "DenyAllOutbound"
  priority                    = 4096
  direction                   = "Outbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = var.resource_group_name
  network_security_group_name = azurerm_network_security_group.postgresql.name
}

# ============================================================================
# NSG ASSOCIATIONS
# ============================================================================

resource "azurerm_subnet_network_security_group_association" "container_apps" {
  subnet_id                 = azurerm_subnet.container_apps.id
  network_security_group_id = azurerm_network_security_group.container_apps.id
}

resource "azurerm_subnet_network_security_group_association" "postgresql" {
  subnet_id                 = azurerm_subnet.postgresql.id
  network_security_group_id = azurerm_network_security_group.postgresql.id
}

resource "azurerm_subnet_network_security_group_association" "private_endpoints" {
  subnet_id                 = azurerm_subnet.private_endpoints.id
  network_security_group_id = azurerm_network_security_group.private_endpoints.id
}

# ============================================================================
# PRIVATE DNS ZONES
# ============================================================================

# PostgreSQL Private DNS Zone
resource "azurerm_private_dns_zone" "postgresql" {
  count               = var.create_private_dns_zones ? 1 : 0
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  count                 = var.create_private_dns_zones ? 1 : 0
  name                  = "${var.vnet_name}-postgresql-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql[0].name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.tags
}

# Key Vault Private DNS Zone
resource "azurerm_private_dns_zone" "key_vault" {
  count               = var.create_private_dns_zones ? 1 : 0
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "key_vault" {
  count                 = var.create_private_dns_zones ? 1 : 0
  name                  = "${var.vnet_name}-keyvault-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.key_vault[0].name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.tags
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vnet_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.main.name
}

output "container_apps_subnet_id" {
  description = "Container Apps subnet ID"
  value       = azurerm_subnet.container_apps.id
}

output "postgresql_subnet_id" {
  description = "PostgreSQL subnet ID"
  value       = azurerm_subnet.postgresql.id
}

output "private_endpoints_subnet_id" {
  description = "Private Endpoints subnet ID"
  value       = azurerm_subnet.private_endpoints.id
}

output "aks_subnet_id" {
  description = "AKS subnet ID"
  value       = var.create_aks_subnet ? azurerm_subnet.aks[0].id : null
}

output "container_apps_nsg_id" {
  description = "Container Apps NSG ID"
  value       = azurerm_network_security_group.container_apps.id
}

output "postgresql_nsg_id" {
  description = "PostgreSQL NSG ID"
  value       = azurerm_network_security_group.postgresql.id
}

output "postgresql_private_dns_zone_id" {
  description = "PostgreSQL private DNS zone ID"
  value       = var.create_private_dns_zones ? azurerm_private_dns_zone.postgresql[0].id : null
}

output "key_vault_private_dns_zone_id" {
  description = "Key Vault private DNS zone ID"
  value       = var.create_private_dns_zones ? azurerm_private_dns_zone.key_vault[0].id : null
}
