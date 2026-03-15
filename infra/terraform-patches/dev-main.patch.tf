# =============================================================================
# PATCH: infra/terraform/environments/dev/main.tf
# =============================================================================
# ADD math_kernel_url to the container_apps module block.
#
# LOCATE the module "container_apps" block (lines ~113-142).
# After the line:  allowed_origins = "*"
# ADD the following line before the closing tags line:
# =============================================================================

  # Math Kernel service (CAS-powered assessment rubrics) — leave empty in dev
  # if running locally; set to the deployed Azure Container App URL in CI
  math_kernel_url  = var.math_kernel_url

# =============================================================================
# ALSO ADD to the variables section of dev/main.tf (if not already present):
# =============================================================================

variable "math_kernel_url" {
  description = "URL of the MathKernel CAS service"
  type        = string
  default     = ""   # Empty default: falls back to Claude rubric in dev
}

# =============================================================================
# VERIFICATION:
#   grep -n "math_kernel_url" infra/terraform/environments/dev/main.tf
# Expected: two lines (variable declaration + module wire)
# =============================================================================
