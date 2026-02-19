// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 3
// Infrastructure Configuration Cleanup
// =============================================================================
//
// This file documents the infrastructure-level changes needed to complete
// the ElevenLabs removal. Three areas are affected:
//
// 1. Application config (packages/api/src/config/index.ts)
// 2. Terraform secrets (infra/terraform/modules/secrets/)
// 3. Environment files (.env.example, docker-compose.yml)
//
// After these changes, the only voice-related config is VOICE_SERVICE_URL,
// which points to the self-hosted Voice Service container.
// =============================================================================


// =============================================================================
// 1. Application Config Patch
// =============================================================================
// File: packages/api/src/config/index.ts
//
// REMOVE:
//   elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
//   elevenlabsBaseUrl: process.env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io/v1',
//   elevenlabsDefaultModel: process.env.ELEVENLABS_DEFAULT_MODEL ?? 'eleven_turbo_v2_5',
//
// ADD:
//   voiceServiceUrl: process.env.VOICE_SERVICE_URL ?? 'http://voice-service:8100',

export const APP_CONFIG_AFTER = `
  // =======================================================================
  // Voice Service Configuration (Sprint 30 Wk3 — Post-ElevenLabs)
  // =======================================================================
  voice: {
    /** URL of the self-hosted Voice Service (Kokoro TTS + Whisper STT) */
    serviceUrl: process.env.VOICE_SERVICE_URL ?? 'http://voice-service:8100',

    /** Default voice for narration when no persona specified */
    defaultVoiceId: process.env.DEFAULT_VOICE_ID ?? 'af_bella',

    /** Cache TTL for TTS results (seconds) */
    cacheTtlSeconds: parseInt(process.env.VOICE_CACHE_TTL ?? '3600', 10),

    /** Maximum concurrent TTS requests per tenant */
    maxConcurrentPerTenant: parseInt(process.env.VOICE_MAX_CONCURRENT ?? '5', 10),
  },

  // REMOVED (Sprint 30 Wk3):
  // elevenlabs: {
  //   apiKey: process.env.ELEVENLABS_API_KEY,
  //   baseUrl: process.env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io/v1',
  //   defaultModel: process.env.ELEVENLABS_DEFAULT_MODEL ?? 'eleven_turbo_v2_5',
  // },
`;


// =============================================================================
// 2. Terraform Secrets Patch
// =============================================================================
// File: infra/terraform/modules/secrets/main.tf
//
// REMOVE the ElevenLabs API key from Azure Key Vault / AWS Secrets Manager.
// No external API secrets are needed for the self-hosted voice stack.

export const TERRAFORM_BEFORE = `
# REMOVE this resource block:
# resource "azurerm_key_vault_secret" "elevenlabs_api_key" {
#   name         = "elevenlabs-api-key"
#   value        = var.elevenlabs_api_key
#   key_vault_id = azurerm_key_vault.scholarly.id
#
#   tags = {
#     service = "voice"
#     provider = "elevenlabs"
#   }
# }
#
# REMOVE from variables.tf:
# variable "elevenlabs_api_key" {
#   description = "ElevenLabs API key for TTS/STT"
#   type        = string
#   sensitive   = true
# }
`;

export const TERRAFORM_AFTER = `
# Voice Service secrets (self-hosted, no external API keys)
# The Voice Service runs as a sidecar container on the same AKS cluster.
# No external secrets needed — authentication is handled via internal
# service mesh mTLS.

# The only voice-related Terraform config is the AKS node pool
# for GPU workloads (already provisioned in Sprint 29):
# resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
#   name                  = "gpupool"
#   kubernetes_cluster_id = azurerm_kubernetes_cluster.scholarly.id
#   vm_size              = "Standard_NC4as_T4_v3"  # T4 GPU
#   node_count           = 1
#   ...
# }
`;


// =============================================================================
// 3. Environment Files Patch
// =============================================================================

export const ENV_EXAMPLE_AFTER = `
# =============================================================================
# Voice Configuration (Sprint 30 Wk3 — Self-Hosted)
# =============================================================================
# The Voice Service runs as a container alongside the API.
# No external API keys needed.

VOICE_SERVICE_URL=http://voice-service:8100
DEFAULT_VOICE_ID=af_bella
VOICE_CACHE_TTL=3600
VOICE_MAX_CONCURRENT=5

# REMOVED (Sprint 30 Wk3):
# ELEVENLABS_API_KEY=sk-...
# ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1
# ELEVENLABS_DEFAULT_MODEL=eleven_turbo_v2_5
`;


// =============================================================================
// 4. Docker Compose Patch
// =============================================================================
// File: docker-compose.yml
//
// REMOVE the ELEVENLABS_API_KEY from the api service environment.
// The api service now only needs VOICE_SERVICE_URL.

export const DOCKER_COMPOSE_PATCH = `
services:
  api:
    environment:
      # Voice (self-hosted)
      VOICE_SERVICE_URL: http://voice-service:8100
      # REMOVED: ELEVENLABS_API_KEY

  voice-service:
    build:
      context: ./scholarly-voice-service
      dockerfile: Dockerfile
    ports:
      - "8100:8100"
    environment:
      COMPUTE_DEVICE: auto
      ENABLE_CLONING: "false"
      ENABLE_ALIGNMENT: "true"
      STORAGE_BACKEND: local
    volumes:
      - voice-data:/data/audio
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  voice-data:
`;


// =============================================================================
// 5. Secrets Manager Cleanup Checklist
// =============================================================================
// Manual steps for production deployment:

export const SECRETS_CLEANUP_CHECKLIST = [
  'Delete ELEVENLABS_API_KEY from Azure Key Vault (scholarly-kv)',
  'Delete elevenlabs-api-key from AWS Secrets Manager (if dual-cloud)',
  'Remove ElevenLabs API key from GitHub Actions secrets',
  'Remove ElevenLabs API key from Vercel environment variables',
  'Revoke the ElevenLabs API key on the ElevenLabs dashboard',
  'Cancel the ElevenLabs subscription (save ~$15,000/month)',
  'Update the cost tracking dashboard to remove ElevenLabs line item',
  'Notify finance team of the cost reduction',
];


// =============================================================================
// Summary
// =============================================================================

export const INFRA_CHANGES = {
  configFieldsRemoved: 3,    // elevenlabsApiKey, elevenlabsBaseUrl, elevenlabsDefaultModel
  configFieldsAdded: 4,      // voiceServiceUrl, defaultVoiceId, cacheTtlSeconds, maxConcurrentPerTenant
  terraformResourcesRemoved: 1,  // azurerm_key_vault_secret.elevenlabs_api_key
  terraformVariablesRemoved: 1,  // var.elevenlabs_api_key
  envVarsRemoved: 3,         // ELEVENLABS_API_KEY, _BASE_URL, _DEFAULT_MODEL
  envVarsAdded: 4,           // VOICE_SERVICE_URL, DEFAULT_VOICE_ID, VOICE_CACHE_TTL, VOICE_MAX_CONCURRENT
  monthlyCostSavings: '$14,700',  // $15,000 (ElevenLabs) - $300 (T4 GPU) = $14,700
  secretsToRevoke: 1,        // ElevenLabs API key
};
