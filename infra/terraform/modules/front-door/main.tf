# Azure Front Door with WAF Module
# Enterprise-grade CDN, load balancing, and Web Application Firewall

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================================================
# FRONT DOOR PREMIUM PROFILE
# ============================================================================

resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = var.front_door_name
  resource_group_name = var.resource_group_name
  sku_name            = "Premium_AzureFrontDoor" # Required for WAF

  tags = var.tags
}

# ============================================================================
# WAF POLICY
# ============================================================================

resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                              = "${var.front_door_name}-waf"
  resource_group_name               = var.resource_group_name
  sku_name                          = azurerm_cdn_frontdoor_profile.main.sku_name
  enabled                           = true
  mode                              = var.waf_mode # "Prevention" or "Detection"
  redirect_url                      = var.waf_redirect_url
  custom_block_response_status_code = 403
  custom_block_response_body        = base64encode(jsonencode({
    error   = "Forbidden"
    message = "Request blocked by Web Application Firewall"
  }))

  tags = var.tags

  # OWASP 3.2 Core Rule Set
  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"

    # Optional: Override specific rules if needed
    dynamic "override" {
      for_each = var.waf_rule_overrides
      content {
        rule_group_name = override.value.rule_group_name

        dynamic "rule" {
          for_each = override.value.rules
          content {
            rule_id = rule.value.rule_id
            enabled = rule.value.enabled
            action  = rule.value.action
          }
        }
      }
    }
  }

  # Bot Protection Managed Rule Set
  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Custom Rule: Rate Limiting (1000 requests per minute per IP)
  custom_rule {
    name                           = "RateLimitByIP"
    enabled                        = true
    priority                       = 100
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = var.rate_limit_requests_per_minute
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable     = "SocketAddr"
      operator           = "IPMatch"
      negation_condition = false
      match_values       = ["0.0.0.0/0", "::/0"] # All IPs
    }
  }

  # Custom Rule: Block Known Bad User Agents
  custom_rule {
    name     = "BlockBadUserAgents"
    enabled  = true
    priority = 200
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable     = "RequestHeader"
      selector           = "User-Agent"
      operator           = "Contains"
      negation_condition = false
      match_values = [
        "sqlmap",
        "nikto",
        "nmap",
        "masscan",
        "zgrab",
        "python-requests", # Block automated scripts (enable with caution)
        "curl",            # Block curl (enable with caution)
        "wget"             # Block wget (enable with caution)
      ]
      transforms = ["Lowercase"]
    }
  }

  # Custom Rule: Block SQL Injection in Query String
  custom_rule {
    name     = "BlockSQLInjection"
    enabled  = true
    priority = 300
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable     = "QueryString"
      operator           = "Contains"
      negation_condition = false
      match_values = [
        "' OR ",
        "' or ",
        "1=1",
        "1 = 1",
        "union select",
        "UNION SELECT",
        "drop table",
        "DROP TABLE",
        "--",
        "/*",
        "*/",
        "xp_cmdshell",
        "exec(",
        "EXEC(",
        "cast(",
        "CAST("
      ]
      transforms = ["UrlDecode"]
    }
  }

  # Custom Rule: Block XSS Patterns
  custom_rule {
    name     = "BlockXSSPatterns"
    enabled  = true
    priority = 400
    type     = "MatchRule"
    action   = "Block"

    match_condition {
      match_variable     = "QueryString"
      operator           = "Contains"
      negation_condition = false
      match_values = [
        "<script",
        "javascript:",
        "onerror=",
        "onload=",
        "onclick=",
        "onmouseover=",
        "onfocus=",
        "eval(",
        "document.cookie",
        "document.location",
        "window.location"
      ]
      transforms = ["Lowercase", "UrlDecode"]
    }
  }

  # Custom Rule: Geographic Restriction (optional)
  dynamic "custom_rule" {
    for_each = length(var.allowed_countries) > 0 ? [1] : []
    content {
      name     = "GeoRestriction"
      enabled  = true
      priority = 50
      type     = "MatchRule"
      action   = "Block"

      match_condition {
        match_variable     = "RemoteAddr"
        operator           = "GeoMatch"
        negation_condition = true # Block if NOT in allowed countries
        match_values       = var.allowed_countries
      }
    }
  }
}

# ============================================================================
# ORIGIN GROUPS
# ============================================================================

# Web Application Origin Group
resource "azurerm_cdn_frontdoor_origin_group" "web" {
  name                     = "${var.front_door_name}-web-origin"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
    additional_latency_in_milliseconds = 50
  }

  health_probe {
    path                = var.web_health_probe_path
    request_type        = "HEAD"
    protocol            = "Https"
    interval_in_seconds = 30
  }
}

# API Origin Group
resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "${var.front_door_name}-api-origin"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
    additional_latency_in_milliseconds = 0 # Lower latency for API
  }

  health_probe {
    path                = var.api_health_probe_path
    request_type        = "GET"
    protocol            = "Https"
    interval_in_seconds = 30
  }
}

# ============================================================================
# ORIGINS
# ============================================================================

# Web Origin (Container Apps)
resource "azurerm_cdn_frontdoor_origin" "web" {
  name                          = "${var.front_door_name}-web"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web.id
  enabled                       = true

  certificate_name_check_enabled = true

  host_name          = var.web_backend_host
  http_port          = 80
  https_port         = 443
  origin_host_header = var.web_backend_host
  priority           = 1
  weight             = 1000
}

# API Origin (Container Apps)
resource "azurerm_cdn_frontdoor_origin" "api" {
  name                          = "${var.front_door_name}-api"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  enabled                       = true

  certificate_name_check_enabled = true

  host_name          = var.api_backend_host
  http_port          = 80
  https_port         = 443
  origin_host_header = var.api_backend_host
  priority           = 1
  weight             = 1000
}

# ============================================================================
# ENDPOINTS
# ============================================================================

resource "azurerm_cdn_frontdoor_endpoint" "main" {
  name                     = var.front_door_name
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  enabled                  = true

  tags = var.tags
}

# ============================================================================
# ROUTES
# ============================================================================

# API Route (/api/*)
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "${var.front_door_name}-api-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.api.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.api_rules.id]
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/api/*", "/health", "/webhook/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
    content_types_to_compress     = ["application/json", "text/plain"]
  }
}

# Web Route (everything else)
resource "azurerm_cdn_frontdoor_route" "web" {
  name                          = "${var.front_door_name}-web-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.main.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.web.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.web.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.web_rules.id]
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "text/html",
      "text/css",
      "text/javascript",
      "application/javascript",
      "application/json",
      "application/xml",
      "image/svg+xml"
    ]
  }
}

# ============================================================================
# RULE SETS
# ============================================================================

# API Rule Set
resource "azurerm_cdn_frontdoor_rule_set" "api_rules" {
  name                     = "apirules"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

# API Security Headers Rule
resource "azurerm_cdn_frontdoor_rule" "api_security_headers" {
  name                      = "AddAPISecurityHeaders"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.api_rules.id
  order                     = 1
  behavior_on_match         = "Continue"

  actions {
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-Content-Type-Options"
      value         = "nosniff"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-Frame-Options"
      value         = "DENY"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-XSS-Protection"
      value         = "1; mode=block"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "Strict-Transport-Security"
      value         = "max-age=31536000; includeSubDomains"
    }
  }
}

# Web Rule Set
resource "azurerm_cdn_frontdoor_rule_set" "web_rules" {
  name                     = "webrules"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
}

# Static Asset Caching Rule
resource "azurerm_cdn_frontdoor_rule" "static_cache" {
  name                      = "CacheStaticAssets"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.web_rules.id
  order                     = 1
  behavior_on_match         = "Continue"

  conditions {
    url_file_extension_condition {
      operator         = "Equal"
      match_values     = ["js", "css", "png", "jpg", "jpeg", "gif", "ico", "svg", "woff", "woff2", "ttf", "eot"]
      negate_condition = false
      transforms       = ["Lowercase"]
    }
  }

  actions {
    route_configuration_override_action {
      cache_behavior                = "OverrideAlways"
      cache_duration                = "7.00:00:00" # 7 days
      compression_enabled           = true
      query_string_caching_behavior = "IgnoreQueryString"
    }
  }
}

# Web Security Headers Rule
resource "azurerm_cdn_frontdoor_rule" "web_security_headers" {
  name                      = "AddWebSecurityHeaders"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.web_rules.id
  order                     = 2
  behavior_on_match         = "Continue"

  actions {
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-Content-Type-Options"
      value         = "nosniff"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-Frame-Options"
      value         = "SAMEORIGIN"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "X-XSS-Protection"
      value         = "1; mode=block"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "Strict-Transport-Security"
      value         = "max-age=31536000; includeSubDomains"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "Content-Security-Policy"
      value         = var.content_security_policy
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "Referrer-Policy"
      value         = "strict-origin-when-cross-origin"
    }
    response_header_action {
      header_action = "Overwrite"
      header_name   = "Permissions-Policy"
      value         = "camera=(), microphone=(), geolocation=()"
    }
  }
}

# ============================================================================
# SECURITY POLICY (WAF ASSOCIATION)
# ============================================================================

resource "azurerm_cdn_frontdoor_security_policy" "main" {
  name                     = "${var.front_door_name}-security-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.main.id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.main.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}

# ============================================================================
# CUSTOM DOMAIN (OPTIONAL)
# ============================================================================

resource "azurerm_cdn_frontdoor_custom_domain" "main" {
  count                    = var.custom_domain != null ? 1 : 0
  name                     = replace(var.custom_domain, ".", "-")
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = var.custom_domain

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

# ============================================================================
# DIAGNOSTIC SETTINGS
# ============================================================================

resource "azurerm_monitor_diagnostic_setting" "front_door" {
  count                      = var.log_analytics_workspace_id != null ? 1 : 0
  name                       = "${var.front_door_name}-diagnostics"
  target_resource_id         = azurerm_cdn_frontdoor_profile.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "FrontDoorAccessLog"
  }

  enabled_log {
    category = "FrontDoorHealthProbeLog"
  }

  enabled_log {
    category = "FrontDoorWebApplicationFirewallLog"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "front_door_id" {
  description = "Front Door profile ID"
  value       = azurerm_cdn_frontdoor_profile.main.id
}

output "front_door_endpoint_host" {
  description = "Front Door endpoint hostname"
  value       = azurerm_cdn_frontdoor_endpoint.main.host_name
}

output "front_door_url" {
  description = "Front Door URL"
  value       = "https://${azurerm_cdn_frontdoor_endpoint.main.host_name}"
}

output "waf_policy_id" {
  description = "WAF policy ID"
  value       = azurerm_cdn_frontdoor_firewall_policy.main.id
}

output "custom_domain_validation_token" {
  description = "Custom domain validation token (if custom domain configured)"
  value       = var.custom_domain != null ? azurerm_cdn_frontdoor_custom_domain.main[0].validation_token : null
}
