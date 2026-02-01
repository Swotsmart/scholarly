# Azure DDoS Protection Standard Module
# Enterprise-grade DDoS protection for Azure resources

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# DDOS PROTECTION PLAN
# ============================================================================

resource "azurerm_network_ddos_protection_plan" "main" {
  name                = var.ddos_plan_name
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# ============================================================================
# ALERT RULES
# ============================================================================

# Alert: DDoS Attack Detected
resource "azurerm_monitor_metric_alert" "ddos_attack" {
  count               = var.enable_alerts ? 1 : 0
  name                = "${var.ddos_plan_name}-attack-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.protected_vnet_id]
  description         = "Alert when DDoS attack is detected on protected VNet"
  severity            = 0 # Critical
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/virtualNetworks"
    metric_name      = "IfUnderDDoSAttack"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 0
  }

  dynamic "action" {
    for_each = var.alert_action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

# Alert: High Inbound Packets Dropped
resource "azurerm_monitor_metric_alert" "packets_dropped" {
  count               = var.enable_alerts ? 1 : 0
  name                = "${var.ddos_plan_name}-packets-dropped-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.protected_vnet_id]
  description         = "Alert when significant packets are being dropped due to DDoS mitigation"
  severity            = 1 # Error
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "DDoSDroppedPackets"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = var.packets_dropped_threshold
  }

  dynamic "action" {
    for_each = var.alert_action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

# Alert: High Bytes Dropped
resource "azurerm_monitor_metric_alert" "bytes_dropped" {
  count               = var.enable_alerts ? 1 : 0
  name                = "${var.ddos_plan_name}-bytes-dropped-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.protected_vnet_id]
  description         = "Alert when significant bytes are being dropped due to DDoS mitigation"
  severity            = 1 # Error
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "BytesDroppedDDoS"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = var.bytes_dropped_threshold
  }

  dynamic "action" {
    for_each = var.alert_action_group_ids
    content {
      action_group_id = action.value
    }
  }

  tags = var.tags
}

# ============================================================================
# DIAGNOSTIC SETTINGS
# ============================================================================

resource "azurerm_monitor_diagnostic_setting" "ddos" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.ddos_plan_name}-diagnostics"
  target_resource_id         = azurerm_network_ddos_protection_plan.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "ddos_protection_plan_id" {
  description = "DDoS Protection Plan ID"
  value       = azurerm_network_ddos_protection_plan.main.id
}

output "ddos_protection_plan_name" {
  description = "DDoS Protection Plan name"
  value       = azurerm_network_ddos_protection_plan.main.name
}

output "virtual_network_ids" {
  description = "Virtual Network IDs associated with this DDoS Protection Plan"
  value       = azurerm_network_ddos_protection_plan.main.virtual_network_ids
}
