// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 3
// ElevenLabs Full Removal Manifest
// =============================================================================
//
// This file is the surgical plan for removing every ElevenLabs dependency
// from the Scholarly codebase. Think of it as the demolition blueprint for
// a building wing that's being replaced by a new structure (the self-hosted
// Voice Service). Every wall, pipe, and wire that connects to ElevenLabs
// is identified, and for each one, we specify: what to remove, what to
// replace it with, and how to verify the replacement works.
//
// The removal is organised into five layers:
//   1. Prisma Schema (database models)
//   2. TypeScript Services (business logic)
//   3. TypeScript Types & Interfaces
//   4. Python Voice Service (provider registry)
//   5. Infrastructure & Configuration
//
// Decision: FULL REMOVAL, not deprecation. Greg's directive was clear:
// "Full removal: delete all ElevenLabs code, Prisma models, routes, and
// references." The self-hosted Voice Service (Sprint 29) + AIPAL adapter
// (Sprint 30 Wk1) fully replaces all ElevenLabs functionality.
// =============================================================================

export interface RemovalEntry {
  /** Unique ID for tracking */
  id: string;
  /** Layer: prisma | typescript | python | infra */
  layer: 'prisma' | 'typescript' | 'python' | 'infra';
  /** Source file path (relative to repo root) */
  file: string;
  /** What's being removed */
  artifact: string;
  /** Type of change */
  action: 'delete_file' | 'delete_model' | 'delete_class' | 'delete_field' |
          'delete_interface' | 'delete_route' | 'delete_constant' |
          'replace_import' | 'replace_reference' | 'delete_config' |
          'delete_test' | 'modify_service';
  /** What replaces it (if anything) */
  replacement: string;
  /** Sprint that introduced this artifact */
  introducedIn: string;
  /** Estimated lines affected */
  linesAffected: number;
  /** Verification check */
  verification: string;
}

// =============================================================================
// Layer 1: Prisma Schema Removals
// =============================================================================

export const PRISMA_REMOVALS: RemovalEntry[] = [
  {
    id: 'P-001',
    layer: 'prisma',
    file: 'prisma/schema.prisma',
    artifact: 'model VoiceElevenLabsConfig',
    action: 'delete_model',
    replacement: 'No replacement needed — tenant voice config uses the self-hosted Voice Service with no per-tenant API keys required.',
    introducedIn: 'Sprint 8 (LinguaFlow)',
    linesAffected: 32,
    verification: 'npx prisma validate passes; npx prisma migrate dev creates drop migration',
  },
  {
    id: 'P-002',
    layer: 'prisma',
    file: 'prisma/schema.prisma',
    artifact: 'field elevenLabsVoiceId on VoiceLinguaFlowVoice',
    action: 'delete_field',
    replacement: 'Replace with `voiceId String @map("voice_id")` that stores Kokoro voice IDs or clone:profile_id references.',
    introducedIn: 'Sprint 8',
    linesAffected: 2,
    verification: 'No references to elevenLabsVoiceId in TypeScript; voice queries use voiceId.',
  },
  {
    id: 'P-003',
    layer: 'prisma',
    file: 'prisma/schema.prisma',
    artifact: 'field elevenLabsAgentId on VoiceConversationAgent',
    action: 'delete_field',
    replacement: 'Remove entirely — conversation agents now use the platform\'s own LLM (Claude) via AIPAL, not ElevenLabs agents.',
    introducedIn: 'Sprint 8',
    linesAffected: 1,
    verification: 'No route or service references elevenLabsAgentId.',
  },
  {
    id: 'P-004',
    layer: 'prisma',
    file: 'prisma/schema.prisma',
    artifact: 'fields elevenLabsDictionaryId, elevenLabsVersionId on VoicePronunciationDictionary',
    action: 'delete_field',
    replacement: 'Remove — pronunciation dictionaries sync locally to the Voice Service, not to ElevenLabs.',
    introducedIn: 'Sprint 8',
    linesAffected: 2,
    verification: 'Dictionary CRUD operations don\'t reference ElevenLabs sync fields.',
  },
  {
    id: 'P-005',
    layer: 'prisma',
    file: 'prisma/schema.prisma',
    artifact: 'field elevenLabsVoiceId on VoicePersona (Sprint 21)',
    action: 'delete_field',
    replacement: 'Replaced by kokoroVoiceId (via Week 1 migration SQL). VoicePersona.voiceId stores the Kokoro ID.',
    introducedIn: 'Sprint 21',
    linesAffected: 1,
    verification: 'Week 1 migration SQL has been run; all voice references use Kokoro IDs.',
  },
];

// =============================================================================
// Layer 2: TypeScript Service Removals
// =============================================================================

export const TYPESCRIPT_REMOVALS: RemovalEntry[] = [
  {
    id: 'T-001',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'class ElevenLabsTTSClient',
    action: 'delete_class',
    replacement: 'NarrationService now calls AIService.synthesizeSpeech() which routes through ScholarlyVoiceAdapter (Sprint 30 Wk1).',
    introducedIn: 'Sprint 3 / Sprint 21',
    linesAffected: 180,
    verification: 'No imports of ElevenLabsTTSClient anywhere in the codebase.',
  },
  {
    id: 'T-002',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'NarrationServiceConfig.elevenLabsApiKey, .elevenLabsBaseUrl, .defaultModel (ElevenLabs models)',
    action: 'modify_service',
    replacement: 'Replace with AIService dependency injection. Config becomes { aiService: AIService, storageProvider, logger }.',
    introducedIn: 'Sprint 3 / Sprint 21',
    linesAffected: 45,
    verification: 'NarrationService constructor accepts AIService; no API key config.',
  },
  {
    id: 'T-003',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'VoicePersona.elevenLabsVoiceId field',
    action: 'delete_field',
    replacement: 'VoicePersona.voiceId stores Kokoro voice ID (via resolveVoiceId from Week 1 adapter).',
    introducedIn: 'Sprint 21',
    linesAffected: 8,
    verification: 'VoicePersona type has voiceId, not elevenLabsVoiceId.',
  },
  {
    id: 'T-004',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'VoiceSettings interface (stability, similarityBoost, style, useSpeakerBoost)',
    action: 'delete_interface',
    replacement: 'Remove entirely — these are ElevenLabs-specific voice parameters. Kokoro uses pace/pitch/warmth via the Voice Service.',
    introducedIn: 'Sprint 21',
    linesAffected: 6,
    verification: 'No references to VoiceSettings type.',
  },
  {
    id: 'T-005',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'DEFAULT_VOICE_PERSONAS array (ElevenLabs voice IDs)',
    action: 'replace_reference',
    replacement: 'Replace with VOICE_PERSONA_MAPPINGS from Sprint 30 Wk1 adapter (Kokoro voice IDs).',
    introducedIn: 'Sprint 21',
    linesAffected: 60,
    verification: 'Voice persona definitions use Kokoro IDs (af_bella, am_adam, etc.).',
  },
  {
    id: 'T-006',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'ElevenLabs model constants (FLASH_V2_5, TURBO_V2_5, etc.) and MODEL_PRICING',
    action: 'delete_constant',
    replacement: 'Cost tracking handled by ScholarlyVoiceAdapter.buildUsage() at amortised GPU rates.',
    introducedIn: 'Sprint 21',
    linesAffected: 12,
    verification: 'No references to eleven_* model strings.',
  },
  {
    id: 'T-007',
    layer: 'typescript',
    file: 'packages/api/src/services/voice-intelligence/voice-intelligence.service.ts',
    artifact: 'ElevenLabs TTS client instantiation and direct API calls',
    action: 'modify_service',
    replacement: 'Route through AIService.synthesizeSpeech() and AIService.transcribe().',
    introducedIn: 'Sprint 8',
    linesAffected: 200,
    verification: 'VoiceIntelligenceService uses AIService, not ElevenLabs clients.',
  },
  {
    id: 'T-008',
    layer: 'typescript',
    file: 'packages/api/src/services/voice-intelligence/voice-intelligence.service.ts',
    artifact: 'ElevenLabs agent creation, session management, and WebSocket connection',
    action: 'delete_class',
    replacement: 'Conversation agents use Claude via AIPAL + Voice Service for TTS/STT. No ElevenLabs agent API.',
    introducedIn: 'Sprint 8',
    linesAffected: 350,
    verification: 'No ElevenLabs agent API calls; conversation routing uses AIPAL.',
  },
  {
    id: 'T-009',
    layer: 'typescript',
    file: 'packages/api/src/services/ai/providers/elevenlabs-adapter.ts',
    artifact: 'Entire file: ElevenLabsAdapter implements ISpeechProvider',
    action: 'delete_file',
    replacement: 'Replaced by ScholarlyVoiceAdapter (Sprint 30 Wk1). Already registered at priority 1.',
    introducedIn: 'Sprint 1',
    linesAffected: 300,
    verification: 'ProviderRegistry has no ElevenLabs registration; scholarly-voice is sole speech provider.',
  },
  {
    id: 'T-010',
    layer: 'typescript',
    file: 'packages/api/src/services/ai/provider-registry.ts',
    artifact: 'ElevenLabs provider registration (registerElevenLabs() call)',
    action: 'replace_reference',
    replacement: 'Registration replaced by createVoiceProviderRegistration() from Sprint 30 Wk1.',
    introducedIn: 'Sprint 1',
    linesAffected: 15,
    verification: 'Provider registry setup code only registers scholarly-voice for speech.',
  },
];

// =============================================================================
// Layer 3: TypeScript Type & Interface Removals
// =============================================================================

export const TYPE_REMOVALS: RemovalEntry[] = [
  {
    id: 'I-001',
    layer: 'typescript',
    file: 'packages/api/src/services/storybook/audio-narration.ts',
    artifact: 'interface SSMLDefaults (prosodyRate, prosodyPitch, emphasisLevel, breakStrengthDefault)',
    action: 'delete_interface',
    replacement: 'Remove — ElevenLabs-specific SSML parameters. Voice Service uses pace/pitch/warmth controls.',
    introducedIn: 'Sprint 21',
    linesAffected: 6,
    verification: 'No SSML references in the codebase.',
  },
  {
    id: 'I-002',
    layer: 'typescript',
    file: 'packages/api/src/services/voice-intelligence/voice-intelligence.service.ts',
    artifact: 'ElevenLabs-specific interfaces (ElevenLabsAgentConfig, ElevenLabsSessionConfig, etc.)',
    action: 'delete_interface',
    replacement: 'Conversation agent types use platform-native interfaces.',
    introducedIn: 'Sprint 8',
    linesAffected: 40,
    verification: 'No types reference ElevenLabs-specific agent/session structures.',
  },
];

// =============================================================================
// Layer 4: Python Voice Service Removals
// =============================================================================

export const PYTHON_REMOVALS: RemovalEntry[] = [
  {
    id: 'PY-001',
    layer: 'python',
    file: 'scholarly-voice-service/providers/registry.py',
    artifact: 'ElevenLabs provider registration as fallback (priority 10)',
    action: 'replace_reference',
    replacement: 'Remove ElevenLabs from the provider registry entirely. Self-hosted providers are the only options.',
    introducedIn: 'Sprint 29 Wk4 (architecture spec reference)',
    linesAffected: 20,
    verification: 'ProviderRegistry.list_tts_providers() returns only kokoro and chatterbox.',
  },
  {
    id: 'PY-002',
    layer: 'python',
    file: 'scholarly-voice-service/app/config.py',
    artifact: 'ELEVENLABS_API_KEY, ELEVENLABS_BASE_URL environment variables',
    action: 'delete_config',
    replacement: 'Remove from Pydantic Settings. No ElevenLabs config needed.',
    introducedIn: 'Architecture spec',
    linesAffected: 8,
    verification: 'Config class has no elevenlabs fields; .env.example has no ELEVENLABS_ vars.',
  },
];

// =============================================================================
// Layer 5: Infrastructure & Configuration Removals
// =============================================================================

export const INFRA_REMOVALS: RemovalEntry[] = [
  {
    id: 'INF-001',
    layer: 'infra',
    file: 'infra/terraform/modules/secrets/main.tf',
    artifact: 'ElevenLabs API key in Azure Key Vault / AWS Secrets Manager',
    action: 'delete_config',
    replacement: 'Remove the secret. No external API key needed for self-hosted voice.',
    introducedIn: 'Sprint 20',
    linesAffected: 10,
    verification: 'Terraform plan shows secret removal; no runtime access to elevenlabs secret.',
  },
  {
    id: 'INF-002',
    layer: 'infra',
    file: '.env.example, .env.development',
    artifact: 'ELEVENLABS_API_KEY environment variable',
    action: 'delete_config',
    replacement: 'Remove. Voice Service URL (VOICE_SERVICE_URL) is the only voice config needed.',
    introducedIn: 'Sprint 3',
    linesAffected: 3,
    verification: 'No .env files reference ELEVENLABS.',
  },
  {
    id: 'INF-003',
    layer: 'infra',
    file: 'packages/api/src/config/index.ts',
    artifact: 'elevenlabsApiKey, elevenlabsBaseUrl config properties',
    action: 'delete_config',
    replacement: 'Replace with voiceServiceUrl pointing to the self-hosted Voice Service.',
    introducedIn: 'Sprint 3',
    linesAffected: 8,
    verification: 'Config has voiceServiceUrl, no elevenlabs properties.',
  },
];

// =============================================================================
// Layer 6: Test Removals
// =============================================================================

export const TEST_REMOVALS: RemovalEntry[] = [
  {
    id: 'TST-001',
    layer: 'typescript',
    file: 'packages/api/src/tests/audio-narration.test.ts',
    artifact: 'ElevenLabs TTS client mock, API response fixtures, voice persona tests with ElevenLabs IDs',
    action: 'delete_test',
    replacement: 'Replace with ScholarlyVoiceAdapter mocks using Kokoro voice IDs (Week 1 test patterns).',
    introducedIn: 'Sprint 3 / Sprint 21',
    linesAffected: 150,
    verification: 'Test suite passes with no ElevenLabs mocks.',
  },
  {
    id: 'TST-002',
    layer: 'typescript',
    file: 'packages/api/src/tests/voice-intelligence.test.ts',
    artifact: 'ElevenLabs agent creation tests, session management tests',
    action: 'delete_test',
    replacement: 'Replace with AIPAL-routed voice intelligence tests.',
    introducedIn: 'Sprint 8',
    linesAffected: 100,
    verification: 'Voice intelligence tests use AIService mocks.',
  },
];

// =============================================================================
// Summary Statistics
// =============================================================================

export const ALL_REMOVALS = [
  ...PRISMA_REMOVALS,
  ...TYPESCRIPT_REMOVALS,
  ...TYPE_REMOVALS,
  ...PYTHON_REMOVALS,
  ...INFRA_REMOVALS,
  ...TEST_REMOVALS,
];

export const REMOVAL_SUMMARY = {
  totalEntries: ALL_REMOVALS.length,
  totalLinesAffected: ALL_REMOVALS.reduce((sum, r) => sum + r.linesAffected, 0),
  byLayer: {
    prisma: PRISMA_REMOVALS.length,
    typescript: TYPESCRIPT_REMOVALS.length + TYPE_REMOVALS.length + TEST_REMOVALS.length,
    python: PYTHON_REMOVALS.length,
    infra: INFRA_REMOVALS.length,
  },
  byAction: ALL_REMOVALS.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
};
