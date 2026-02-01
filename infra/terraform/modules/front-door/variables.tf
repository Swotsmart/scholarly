# Front Door Module Variables

variable "front_door_name" {
  description = "Name of the Front Door profile"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# WAF Configuration
variable "waf_mode" {
  description = "WAF mode: 'Prevention' or 'Detection'"
  type        = string
  default     = "Prevention"

  validation {
    condition     = contains(["Prevention", "Detection"], var.waf_mode)
    error_message = "WAF mode must be 'Prevention' or 'Detection'."
  }
}

variable "waf_redirect_url" {
  description = "URL to redirect blocked requests (optional)"
  type        = string
  default     = null
}

variable "rate_limit_requests_per_minute" {
  description = "Maximum requests per minute per IP before rate limiting"
  type        = number
  default     = 1000
}

variable "waf_rule_overrides" {
  description = "WAF rule overrides for specific rules"
  type = list(object({
    rule_group_name = string
    rules = list(object({
      rule_id = string
      enabled = bool
      action  = string
    }))
  }))
  default = []
}

variable "allowed_countries" {
  description = "List of allowed country codes (ISO 3166-1 alpha-2). Empty list disables geo-restriction."
  type        = list(string)
  default     = []
}

# Backend Configuration
variable "web_backend_host" {
  description = "Hostname of the web application backend (Container Apps FQDN)"
  type        = string
}

variable "api_backend_host" {
  description = "Hostname of the API backend (Container Apps FQDN)"
  type        = string
}

variable "web_health_probe_path" {
  description = "Health probe path for web backend"
  type        = string
  default     = "/"
}

variable "api_health_probe_path" {
  description = "Health probe path for API backend"
  type        = string
  default     = "/health"
}

# Security Headers
variable "content_security_policy" {
  description = "Content Security Policy header value"
  type        = string
  default     = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com https://api.openai.com https://api.stripe.com"
}

# Custom Domain
variable "custom_domain" {
  description = "Custom domain name (e.g., app.scholarly.edu.au)"
  type        = string
  default     = null
}

# Logging
variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = null
}
