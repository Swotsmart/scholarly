// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 3
// Prisma Schema Patch: ElevenLabs Removal
// =============================================================================
//
// This file documents the exact changes to prisma/schema.prisma.
// It is structured as BEFORE → AFTER for each affected model,
// making it easy to apply the changes via search-and-replace.
//
// Models affected:
//   1. VoiceElevenLabsConfig     — DELETE ENTIRELY
//   2. VoiceLinguaFlowVoice      — Remove 2 fields, add 1
//   3. VoiceConversationAgent    — Remove 1 field
//   4. VoicePronunciationDictionary — Remove 2 fields
//   5. VoicePersona (Sprint 21)  — Remove 1 field (already migrated by Wk1)
//
// Total: 1 model deleted, 6 fields removed, 1 field added
// =============================================================================


// =============================================================================
// 1. VoiceElevenLabsConfig — DELETE ENTIRELY
// =============================================================================
//
// This entire model is removed. It stored per-tenant ElevenLabs API keys,
// model preferences, privacy settings, and cost management. With self-hosted
// voice, none of this is needed:
//   - No per-tenant API keys (the Voice Service runs on our infrastructure)
//   - No ElevenLabs model selection (Kokoro is the only TTS model)
//   - No ElevenLabs-specific privacy settings (we control the data pipeline)
//   - No ElevenLabs credit budgets (cost is amortised infrastructure)
//
// REMOVE this block from schema.prisma:

const REMOVED_MODEL_VoiceElevenLabsConfig = `
// --- DELETED (Sprint 30 Wk3) ---
// model VoiceElevenLabsConfig {
//   id                    String   @id @default(cuid())
//   tenantId              String   @unique @map("tenant_id")
//   apiKey                String   @map("api_key")
//   apiKeyScope           String   @default("full") @map("api_key_scope")
//   defaultTTSModel       String   @default("eleven_multilingual_v2") @map("default_tts_model")
//   defaultSTTModel       String   @default("scribe_v2") @map("default_stt_model")
//   preferredLatencyMode  String   @default("balanced") @map("preferred_latency_mode")
//   zeroRetentionMode     Boolean  @default(true) @map("zero_retention_mode")
//   enableLogging         Boolean  @default(false) @map("enable_logging")
//   dataResidency         String   @default("auto") @map("data_residency")
//   monthlyBudgetCredits  Int?     @map("monthly_budget_credits")
//   alertThresholdPercent Int?     @map("alert_threshold_percent")
//   enableVoiceAgents     Boolean  @default(false) @map("enable_voice_agents")
//   enableVoiceCloning    Boolean  @default(false) @map("enable_voice_cloning")
//   enableCustomDicts     Boolean  @default(true) @map("enable_custom_dicts")
//   maxConcurrentRequests Int      @default(10) @map("max_concurrent_requests")
//   requestsPerMinute     Int      @default(60) @map("requests_per_minute")
//   createdAt             DateTime @default(now()) @map("created_at")
//   updatedAt             DateTime @updatedAt @map("updated_at")
//   @@map("voice_elevenlabs_configs")
// }
`;


// =============================================================================
// 2. VoiceLinguaFlowVoice — Remove ElevenLabs fields, add voiceId
// =============================================================================

const BEFORE_VoiceLinguaFlowVoice = `
model VoiceLinguaFlowVoice {
  id                  String   @id @default(cuid())
  tenantId            String   @map("tenant_id")

  // ElevenLabs identifiers          ← REMOVE THESE
  elevenLabsVoiceId   String   @map("elevenlabs_voice_id")    // ← REMOVE
  elevenLabsName      String   @map("elevenlabs_name")        // ← REMOVE

  // LinguaFlow metadata
  displayName         String   @map("display_name")
  description         String?
  avatarUrl           String?
  // ... rest of model
}`;

const AFTER_VoiceLinguaFlowVoice = `
model VoiceLinguaFlowVoice {
  id                  String   @id @default(cuid())
  tenantId            String   @map("tenant_id")

  // Voice identifier (Kokoro voice ID or clone:profile_id)
  voiceId             String   @map("voice_id")
  provider            String   @default("scholarly-voice") @map("provider")

  // LinguaFlow metadata
  displayName         String   @map("display_name")
  description         String?
  avatarUrl           String?
  // ... rest of model unchanged
}`;


// =============================================================================
// 3. VoiceConversationAgent — Remove ElevenLabs agent ID
// =============================================================================

const BEFORE_VoiceConversationAgent = `
model VoiceConversationAgent {
  id                   String   @id @default(cuid())
  tenantId             String   @map("tenant_id")

  name                 String
  description          String?
  avatarUrl            String?  @map("avatar_url")

  // ElevenLabs Agent              ← REMOVE
  elevenLabsAgentId    String   @map("elevenlabs_agent_id")  // ← REMOVE

  // Voice configuration
  voiceId              String   @map("voice_id")
  // ... rest of model
}`;

const AFTER_VoiceConversationAgent = `
model VoiceConversationAgent {
  id                   String   @id @default(cuid())
  tenantId             String   @map("tenant_id")

  name                 String
  description          String?
  avatarUrl            String?  @map("avatar_url")

  // Voice configuration (Kokoro voice ID)
  voiceId              String   @map("voice_id")
  // ... rest of model unchanged
}`;


// =============================================================================
// 4. VoicePronunciationDictionary — Remove ElevenLabs sync fields
// =============================================================================

const BEFORE_VoicePronunciationDictionary = `
model VoicePronunciationDictionary {
  id                     String   @id @default(cuid())
  tenantId               String   @map("tenant_id")

  name                   String
  description            String?

  // ElevenLabs sync                    ← REMOVE THESE
  elevenLabsDictionaryId String?  @map("elevenlabs_dictionary_id")  // ← REMOVE
  elevenLabsVersionId    String?  @map("elevenlabs_version_id")     // ← REMOVE

  // Language
  language               String
  // ... rest of model
}`;

const AFTER_VoicePronunciationDictionary = `
model VoicePronunciationDictionary {
  id                     String   @id @default(cuid())
  tenantId               String   @map("tenant_id")

  name                   String
  description            String?

  // Language
  language               String
  // ... rest of model unchanged
}`;


// =============================================================================
// 5. VoicePersona (Sprint 21) — Already migrated by Week 1
// =============================================================================
// The voiceId field already stores Kokoro IDs after the Week 1 data migration.
// The elevenLabsVoiceId was in the TypeScript type definition, not a separate
// Prisma field (it was the same column mapped differently). The migration SQL
// updated the values; this schema patch just confirms the field name is clean.
//
// No Prisma change needed beyond confirming the type definition uses voiceId.


// =============================================================================
// Summary: Schema Change Statistics
// =============================================================================

export const SCHEMA_CHANGES = {
  modelsDeleted: 1,       // VoiceElevenLabsConfig
  fieldsRemoved: 6,       // elevenLabsVoiceId (×2), elevenLabsName, elevenLabsAgentId,
                           // elevenLabsDictionaryId, elevenLabsVersionId
  fieldsAdded: 2,         // voiceId (on VoiceLinguaFlowVoice), provider
  tablesDropped: 1,       // voice_elevenlabs_configs
  columnsDropped: 6,      // Across 3 tables
  dataRowsMigrated: '6 voice personas + all LinguaFlow voice library entries',
  migrationFile: 'prisma/migrations/20260217_remove_elevenlabs/migration.sql',
  rollbackStrategy: 'Restore from backup — voice ID mapping is destructive',
};
