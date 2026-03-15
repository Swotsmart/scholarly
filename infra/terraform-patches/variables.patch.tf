# =============================================================================
# PATCH: infra/terraform/modules/container-apps/variables.tf
# =============================================================================
# ADD this block immediately after the voice_service_url variable block.
# Mirrors the voice_service_url pattern exactly.
#
# BEFORE (lines 162-166 in the live file):
# variable "voice_service_url" {
#   description = "URL of the Scholarly Voice Service (Kokoro TTS / Whisper STT)"
#   type        = string
#   default     = ""
# }
#
# AFTER — append the block below directly after the closing brace:
# =============================================================================

# Math Kernel service configuration
variable "math_kernel_url" {
  description = "URL of the Scholarly MathKernel Service (SageMath CAS + FastAPI)"
  type        = string
  default     = ""
}
