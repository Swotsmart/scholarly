# Front Door Module Outputs

output "profile_id" {
  description = "The ID of the Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "profile_name" {
  description = "The name of the Front Door profile"
  value       = azurerm_cdn_frontdoor_profile.main.name
}

output "endpoint_id" {
  description = "The ID of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.id
}

output "endpoint_host_name" {
  description = "The hostname of the Front Door endpoint"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "endpoint_url" {
  description = "The full URL of the Front Door endpoint"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "waf_policy_id" {
  description = "The ID of the WAF policy"
  value       = azurerm_cdn_frontdoor_firewall_policy.main.id
}

output "waf_policy_name" {
  description = "The name of the WAF policy"
  value       = azurerm_cdn_frontdoor_firewall_policy.main.name
}

output "web_origin_group_id" {
  description = "The ID of the web origin group"
  value       = azurerm_cdn_frontdoor_origin_group.web.id
}

output "api_origin_group_id" {
  description = "The ID of the API origin group"
  value       = azurerm_cdn_frontdoor_origin_group.api.id
}

output "custom_domain_id" {
  description = "The ID of the custom domain (if configured)"
  value       = var.custom_domain != null ? azurerm_cdn_frontdoor_custom_domain.main[0].id : null
}

output "custom_domain_validation_token" {
  description = "The validation token for the custom domain (if configured)"
  value       = var.custom_domain != null ? azurerm_cdn_frontdoor_custom_domain.main[0].validation_token : null
}
