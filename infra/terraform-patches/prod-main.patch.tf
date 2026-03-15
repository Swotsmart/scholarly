# =============================================================================
# PATCH: infra/terraform/environments/prod/main.tf
# =============================================================================
# ADD math_kernel_url to the module "container_apps" block.
#
# LOCATE: allowed_origins line (line ~331 in live file):
#   allowed_origins = var.custom_domain != null ? "https://${var.custom_domain}" : "https://scholarly.example.com"
#
# ADD directly after that line (before the Key Vault integration block):
# =============================================================================

  # Math Kernel service (CAS-powered assessment rubrics)
  math_kernel_url  = var.math_kernel_url

# =============================================================================
# ALSO ADD to the variables section of prod/main.tf (after the jwt_secret variable block):
# =============================================================================

variable "math_kernel_url" {
  description = "URL of the deployed MathKernel CAS service (Azure Container App)"
  type        = string
  default     = ""   # Set via TF_VAR_math_kernel_url or terraform.tfvars in production
}

# =============================================================================
# PRODUCTION NOTE:
# In production, math_kernel_url should be set to the internal Container App URL,
# e.g. "https://scholarly-mathkernel.internalazurecontainerapps.io"
# This keeps the CAS traffic on the Azure VNet — no egress costs.
#
# VERIFICATION:
#   grep -n "math_kernel_url" infra/terraform/environments/prod/main.tf
# Expected: two lines (variable declaration + module wire)
# =============================================================================
