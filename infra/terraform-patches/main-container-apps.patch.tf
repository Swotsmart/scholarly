# =============================================================================
# PATCH: infra/terraform/modules/container-apps/main.tf
# =============================================================================
# ADD the math kernel env block immediately after the VOICE_SERVICE_URL block.
#
# LOCATE this block (lines ~265-270 in the live file):
#
#       # Voice service configuration
#       env {
#         name  = "VOICE_SERVICE_URL"
#         value = var.voice_service_url
#       }
#
# INSERT the following block directly after the closing brace:
# =============================================================================

      # Math Kernel service configuration (CAS-powered assessment rubrics)
      env {
        name  = "MATH_KERNEL_URL"
        value = var.math_kernel_url
      }

# =============================================================================
# VERIFICATION — after applying, confirm both are present:
#   grep -n "VOICE_SERVICE_URL\|MATH_KERNEL_URL" infra/terraform/modules/container-apps/main.tf
# Expected output: two lines, VOICE_SERVICE_URL and MATH_KERNEL_URL
# =============================================================================
