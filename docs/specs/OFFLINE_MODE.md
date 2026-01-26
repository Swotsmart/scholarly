# Offline Mode Specification

## Learning Without Connectivity

---

## The Challenge

Australia presents unique connectivity challenges:

- **Rural and Remote Areas**: Many students live where internet is unreliable or unavailable
- **Travel**: Long car trips, flights, and school camps
- **School Infrastructure**: Some schools have limited or filtered internet
- **Data Costs**: Families on limited mobile data plans
- **Resilience**: Learning shouldn't stop when the internet does

**Our Commitment**: Core learning activities must work offline. Connectivity should enhance, not enable, learning.

---

## Offline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OFFLINE ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         DEVICE STORAGE                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   Content   │  │   Learner   │  │   Pending   │  │    Audio    │  │ │
│  │  │   Cache     │  │   Profile   │  │   Actions   │  │    Cache    │  │ │
│  │  │   (texts,   │  │   (progress,│  │   (to sync  │  │   (speech,  │  │ │
│  │  │   lessons)  │  │   vocab)    │  │   when      │  │   pronunc.) │  │ │
│  │  │             │  │             │  │   online)   │  │             │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       OFFLINE ENGINE                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   Local     │  │   Spaced    │  │   Activity  │  │    Sync     │  │ │
│  │  │   AI Model  │  │  Repetition │  │   Tracker   │  │   Manager   │  │ │
│  │  │   (small)   │  │   Engine    │  │             │  │             │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                        ┌───────────┴───────────┐                            │
│                        ▼                       ▼                            │
│                   [OFFLINE]               [ONLINE]                          │
│               Local processing         Cloud sync                           │
│               Cached content           Full AI features                     │
│               Basic feedback           Rich feedback                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Offline Capabilities by Module

### Little Explorers (Early Years) - Offline Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LITTLE EXPLORERS OFFLINE MODE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ AVAILABLE OFFLINE                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Phonics activities (grapheme recognition, blending)                     │
│  • Decodable stories (pre-downloaded)                                      │
│  • Letter formation practice                                               │
│  • Numeracy activities (counting, number recognition)                      │
│  • Vocabulary review (with cached audio)                                   │
│  • Progress tracking (synced when online)                                  │
│  • Parent quests (pre-loaded set)                                          │
│  • Mentor creature interactions (scripted)                                 │
│  • Achievement tracking (synced later)                                     │
│  • Basic affective adaptation (rule-based)                                 │
│                                                                             │
│  ⚠️ LIMITED OFFLINE                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Voice recording (recorded, assessed when online)                        │
│  • Writing samples (captured, analysed when online)                        │
│  • Eye tracking (collected, processed when online)                         │
│  • New content (must pre-download)                                         │
│                                                                             │
│  ❌ REQUIRES CONNECTIVITY                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Real-time AI conversation                                               │
│  • Tutor video calls                                                       │
│  • Advanced affective AI (needs cloud models)                              │
│  • Content marketplace purchases                                           │
│  • Real-time parent notifications                                          │
│                                                                             │
│  STORAGE REQUIREMENTS                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Base offline package: ~200 MB                                           │
│  • Per phase content pack: ~50 MB                                          │
│  • Audio cache (pronunciations): ~100 MB                                   │
│  • Decodable stories (10 stories): ~30 MB                                  │
│  • Total recommended: 500 MB - 1 GB                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LinguaFlow (Language Learning) - Offline Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LINGUAFLOW OFFLINE MODE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ AVAILABLE OFFLINE                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Vocabulary review (spaced repetition)                                   │
│  • Grammar exercises (pre-generated sets)                                  │
│  • Reading passages (pre-downloaded)                                       │
│  • Listening exercises (pre-downloaded audio)                              │
│  • Writing practice (basic checking, full analysis when online)            │
│  • Flashcard practice (all modes)                                          │
│  • Dictation practice (with cached audio)                                  │
│  • Pre-downloaded practice tests                                           │
│  • Progress tracking (synced when online)                                  │
│  • XP and streak tracking (synced later)                                   │
│  • Offline achievements                                                    │
│                                                                             │
│  ⚠️ LIMITED OFFLINE                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Pronunciation practice (recording only, feedback when online)           │
│  • Writing assessment (basic spell-check, full AI when online)             │
│  • Speaking practice (scripted scenarios only, no AI conversation)         │
│  • Assessment taking (some types, results validated when online)           │
│                                                                             │
│  ❌ REQUIRES CONNECTIVITY                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • AI conversation partner (full version)                                  │
│  • Real-time pronunciation feedback                                        │
│  • AI writing analysis                                                     │
│  • Assessment generation                                                   │
│  • Tutor sessions                                                          │
│  • Leaderboard updates                                                     │
│  • New content downloads                                                   │
│                                                                             │
│  STORAGE REQUIREMENTS BY LANGUAGE                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Base app + engine: ~100 MB                                              │
│  • French full pack: ~300 MB                                               │
│  • Mandarin full pack: ~500 MB (more audio, characters)                    │
│  • Spanish full pack: ~280 MB                                              │
│  • Italian full pack: ~280 MB                                              │
│  • German full pack: ~300 MB                                               │
│  • Indonesian full pack: ~250 MB                                           │
│                                                                             │
│  Recommended: Base + 1-2 language packs = 500 MB - 1.5 GB                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Offline Package Management

### Download Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFLINE PACKAGE STRATEGIES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SMART PRELOAD (Automatic)                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  System automatically downloads based on:                                   │
│  • Current learning progress (next lessons)                                │
│  • Spaced repetition queue (words due soon)                                │
│  • Teacher assignments (upcoming due dates)                                │
│  • Usage patterns (activities frequently used)                             │
│  • Available storage space                                                 │
│                                                                             │
│  Triggers:                                                                  │
│  • WiFi connected + charging = aggressive download                         │
│  • WiFi connected = normal download                                        │
│  • Mobile data = critical only (with user permission)                      │
│                                                                             │
│  TRIP MODE (Manual)                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  User prepares for extended offline period:                                │
│                                                                             │
│  "Prepare for Offline" → Select duration:                                  │
│  • Quick trip (2-4 hours): 100-200 MB                                      │
│  • Day trip (8 hours): 200-400 MB                                          │
│  • Weekend away: 400-600 MB                                                │
│  • Week-long camp: 600 MB - 1 GB                                           │
│                                                                             │
│  Package includes:                                                          │
│  • All due vocabulary reviews                                              │
│  • Next 5-10 lessons                                                       │
│  • Practice tests for target skills                                        │
│  • Entertainment content (stories, cultural content)                       │
│                                                                             │
│  CLASSROOM PACK (Teacher-Managed)                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Teacher prepares class for offline session:                               │
│  • Select specific content for lesson                                      │
│  • Push to all student devices                                             │
│  • Works on local network (no internet)                                    │
│  • Useful for: camps, excursions, unreliable school WiFi                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Offline Content Selection UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PREPARE FOR OFFLINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  How long will you be offline?                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [○ Few hours]  [● 1 day]  [○ Weekend]  [○ Week+]  [○ Custom]       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RECOMMENDED PACKAGE                         📦 ~380 MB                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ✅ Vocabulary Review (156 words due)                    45 MB     │   │
│  │  ✅ Next 3 Lessons (Unit 5: Daily Routines)              85 MB     │   │
│  │  ✅ 2 Practice Tests                                     30 MB     │   │
│  │  ✅ 5 Listening Exercises                                95 MB     │   │
│  │  ✅ 3 Reading Passages                                   15 MB     │   │
│  │  ✅ Grammar Exercises (passé composé)                    25 MB     │   │
│  │                                                                     │   │
│  │  Optional:                                                          │   │
│  │  [ ] Cultural Content (French Cinema)                    65 MB     │   │
│  │  [ ] Extra Stories                                       45 MB     │   │
│  │  [ ] Speaking Scenarios (scripted)                       55 MB     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Storage available: 2.4 GB                                                 │
│                                                                             │
│  [Download Selected]              [Download All]                           │
│                                                                             │
│  ⏱️ Estimated download time: 8 minutes on WiFi                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Strategy

### Conflict Resolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SYNC CONFLICT RESOLUTION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRINCIPLE: Learner's work is NEVER lost. When in doubt, keep both.       │
│                                                                             │
│  SCENARIO 1: Progress Conflict                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Situation: Offline shows word "mastered", server shows "learning"         │
│  Resolution: Take the MORE ADVANCED state (mastered)                       │
│  Rationale: Student did the work, honour it                                │
│                                                                             │
│  SCENARIO 2: Assessment Conflict                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Situation: Assessment completed offline, also started online              │
│  Resolution: Keep FIRST completed attempt, flag for teacher review         │
│  Rationale: Prevent gaming, but don't penalise connectivity issues         │
│                                                                             │
│  SCENARIO 3: Streak Conflict                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Situation: Offline activity should have maintained streak                 │
│  Resolution: Reconstruct streak from offline activity timestamps           │
│  Rationale: Don't punish students for offline learning                     │
│                                                                             │
│  SCENARIO 4: Content Update                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Situation: Offline content is outdated (teacher updated)                  │
│  Resolution: Mark as "updated available", don't force refresh              │
│  Rationale: Don't interrupt learning mid-session                           │
│                                                                             │
│  SCENARIO 5: Simultaneous Edit                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Situation: Writing draft edited offline and online                        │
│  Resolution: Create "Draft (offline)" and "Draft (online)" versions        │
│  Rationale: Let student choose which to keep                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sync Queue Management

```typescript
interface OfflineSyncQueue {
  // Queue structure
  pendingActions: QueuedAction[];
  
  // Priority levels
  priorities: {
    critical: string[];     // Assessment submissions, streak-maintaining activities
    high: string[];         // Lesson completions, vocabulary mastery
    normal: string[];       // Practice activities, reading progress
    low: string[];          // Analytics, optional tracking
  };
  
  // Sync behavior
  syncBehavior: {
    onWifiConnect: 'immediate' | 'background' | 'manual';
    onMobileData: 'critical_only' | 'ask' | 'never';
    conflictResolution: 'local_wins' | 'server_wins' | 'ask' | 'merge';
  };
  
  // Retry logic
  retryPolicy: {
    maxRetries: 5;
    backoffMultiplier: 2;
    maxBackoffSeconds: 3600;
  };
}

interface QueuedAction {
  id: string;
  type: 'vocabulary_review' | 'lesson_completion' | 'assessment_submission' | 
        'writing_draft' | 'recording_upload' | 'progress_update';
  payload: any;
  createdAt: Date;
  priority: 'critical' | 'high' | 'normal' | 'low';
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
}
```

---

## Offline AI Capabilities

### Local AI Models

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LOCAL AI CAPABILITIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ON-DEVICE MODELS (Small, Fast)                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  SPELLING/GRAMMAR CHECKER (~20 MB per language)                            │
│  • Rule-based grammar checking                                             │
│  • Common error patterns                                                   │
│  • Accent/diacritic validation                                             │
│  • Basic suggestions                                                       │
│  Performance: <100ms response                                              │
│                                                                             │
│  PRONUNCIATION SCORER (~50 MB per language)                                │
│  • Phoneme recognition model                                               │
│  • Basic accuracy scoring                                                  │
│  • Common mispronunciation detection                                       │
│  • Tone detection (Mandarin)                                               │
│  Performance: <500ms per utterance                                         │
│  Note: Full analysis uploaded when online                                  │
│                                                                             │
│  ADAPTIVE DIFFICULTY ENGINE (~5 MB)                                        │
│  • Rule-based difficulty adjustment                                        │
│  • Based on recent accuracy patterns                                       │
│  • Simpler than cloud AI but functional                                    │
│  Performance: <50ms                                                        │
│                                                                             │
│  SPACED REPETITION CALCULATOR (~1 MB)                                      │
│  • SM-2 algorithm implementation                                           │
│  • Queue management                                                        │
│  • Interval calculations                                                   │
│  Performance: <10ms                                                        │
│                                                                             │
│  NOT AVAILABLE OFFLINE                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Full AI conversation (requires large language model)                    │
│  • Deep writing analysis (requires GPT-class model)                        │
│  • Nuanced pronunciation feedback (requires cloud processing)              │
│  • Assessment generation (requires cloud AI)                               │
│  • Affective state inference (requires complex models)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scripted Offline Conversations

For speaking practice without AI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCRIPTED CONVERSATION MODE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Instead of AI conversation, offline mode offers:                          │
│                                                                             │
│  BRANCHING DIALOGUES                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Pre-scripted conversations with multiple paths:                           │
│                                                                             │
│  AI: "Bonjour! Qu'est-ce que je vous sers?"                               │
│      [Play audio]                                                          │
│                                                                             │
│  Your options:                                                              │
│  A) "Je voudrais un café, s'il vous plaît"                                │
│  B) "Qu'est-ce que vous recommandez?"                                      │
│  C) "Avez-vous des croissants?"                                            │
│  D) [Say something else - recorded for later]                              │
│                                                                             │
│  Student selects (A):                                                       │
│  → Records their pronunciation                                             │
│  → Sees model pronunciation comparison                                     │
│  → Conversation branches to coffee-ordering path                           │
│                                                                             │
│  SHADOW SPEAKING                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Listen and repeat exercises:                                               │
│  • Native audio plays                                                      │
│  • Student records their attempt                                           │
│  • Basic local pronunciation scoring                                       │
│  • Full analysis when back online                                          │
│                                                                             │
│  ROLE-PLAY SCRIPTS                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Complete scripts for common scenarios:                                     │
│  • Student plays one role, device plays the other                          │
│  • Can practice either role                                                │
│  • All audio pre-cached                                                    │
│  • Recording saved for teacher/self review                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Offline Indicators & UX

### User Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OFFLINE USER EXPERIENCE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OFFLINE INDICATOR                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Header bar shows: [📴 Offline Mode - Last synced: 2 hours ago]            │
│                                                                             │
│  • Subtle but visible                                                       │
│  • Tap for details: "X items waiting to sync"                              │
│  • No panic-inducing warnings                                              │
│                                                                             │
│  FEATURE AVAILABILITY                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Available features: Normal appearance                                     │
│  Unavailable features: Greyed out with "📶 Needs Internet" tooltip         │
│                                                                             │
│  Example:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [📚 Vocabulary Review]     ← Normal, available                     │   │
│  │  [🎧 Listening Practice]    ← Normal, available                     │   │
│  │  [🗣️ AI Conversation] 📶   ← Greyed, tap shows "Needs Internet"    │   │
│  │  [📝 Writing Practice]      ← Normal, basic feedback available      │   │
│  │  [👨‍🏫 Book Tutor] 📶        ← Greyed, needs internet                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SYNC STATUS                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  When back online:                                                          │
│  "Syncing your progress... ████████░░ 80%"                                 │
│                                                                             │
│  After sync:                                                                │
│  "✅ All caught up! 47 activities synced."                                 │
│                                                                             │
│  If sync fails:                                                             │
│  "⚠️ Some items couldn't sync. [Retry] [View Details]"                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## School Camp & Excursion Mode

### Teacher Preparation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAMP/EXCURSION PREPARATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TEACHER WORKFLOW                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  1. CREATE OFFLINE ASSIGNMENT                                              │
│     • Select content for the trip                                          │
│     • Set expected completion targets                                      │
│     • Add optional extension activities                                    │
│                                                                             │
│  2. PUSH TO DEVICES                                                        │
│     • Before leaving: Push via school WiFi                                 │
│     • During trip: Local network sync (teacher device as hub)              │
│     • Devices download required content                                    │
│                                                                             │
│  3. MONITOR (Even Offline)                                                 │
│     • Teacher device can collect progress via local Bluetooth/WiFi         │
│     • See who has completed activities                                     │
│     • No internet required for basic monitoring                            │
│                                                                             │
│  4. SYNC ON RETURN                                                         │
│     • All progress syncs to cloud                                          │
│     • Recordings uploaded for analysis                                     │
│     • Full reports available                                               │
│                                                                             │
│  CAMP-SPECIFIC FEATURES                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Location-based content: "Learn words related to bushland"               │
│  • Group challenges: "Cabin 3 vs Cabin 4 vocabulary challenge"             │
│  • Nature journaling: Write about experiences in target language           │
│  • Cultural connections: "How would this camp be different in France?"     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Schema Additions

```prisma
// Add to existing schemas

/// Offline content package
model OfflineContentPackage {
  id                      String   @id @default(cuid())
  profileId               String   @map("profile_id")
  
  // Package details
  packageType             String   @map("package_type")
  // smart_preload, trip_mode, classroom_pack
  
  // Content manifest
  contentManifest         Json     @map("content_manifest")
  // { vocabularyIds: [], lessonIds: [], audioIds: [], etc. }
  
  // Size and duration
  totalSizeBytes          BigInt   @map("total_size_bytes")
  estimatedMinutesContent Int      @map("estimated_minutes_content")
  
  // Status
  status                  String   @default("preparing")
  // preparing, downloading, ready, expired, error
  
  downloadProgress        Float    @default(0) @map("download_progress")
  downloadedAt            DateTime? @map("downloaded_at")
  expiresAt               DateTime? @map("expires_at")
  
  // Version for updates
  contentVersion          String   @map("content_version")
  
  createdAt               DateTime @default(now()) @map("created_at")
  updatedAt               DateTime @updatedAt @map("updated_at")
  
  @@index([profileId, status])
  @@map("offline_content_packages")
}

/// Offline action queue
model OfflineActionQueue {
  id                      String   @id @default(cuid())
  profileId               String   @map("profile_id")
  
  // Action details
  actionType              String   @map("action_type")
  actionPayload           Json     @map("action_payload")
  
  // Priority
  priority                String   @default("normal")
  // critical, high, normal, low
  
  // Timestamps
  createdOfflineAt        DateTime @map("created_offline_at")
  queuedAt                DateTime @default(now()) @map("queued_at")
  
  // Sync status
  syncStatus              String   @default("pending") @map("sync_status")
  // pending, syncing, synced, failed, conflict
  
  syncAttempts            Int      @default(0) @map("sync_attempts")
  lastSyncAttempt         DateTime? @map("last_sync_attempt")
  syncError               String?  @map("sync_error")
  
  // Conflict resolution
  conflictData            Json?    @map("conflict_data")
  conflictResolution      String?  @map("conflict_resolution")
  
  syncedAt                DateTime? @map("synced_at")
  
  @@index([profileId, syncStatus])
  @@index([priority, queuedAt])
  @@map("offline_action_queue")
}

/// Offline session tracking
model OfflineSession {
  id                      String   @id @default(cuid())
  profileId               String   @map("profile_id")
  
  // Session timing
  startedAt               DateTime @map("started_at")
  endedAt                 DateTime? @map("ended_at")
  durationMinutes         Int?     @map("duration_minutes")
  
  // Activities completed
  activitiesCompleted     Json     @default("[]") @map("activities_completed")
  vocabularyReviewed      Int      @default(0) @map("vocabulary_reviewed")
  lessonsCompleted        Int      @default(0) @map("lessons_completed")
  
  // XP earned (to sync)
  xpEarned                Int      @default(0) @map("xp_earned")
  streakMaintained        Boolean  @default(false) @map("streak_maintained")
  
  // Device info
  deviceId                String   @map("device_id")
  appVersion              String   @map("app_version")
  
  // Sync status
  syncedAt                DateTime? @map("synced_at")
  
  @@index([profileId, startedAt])
  @@map("offline_sessions")
}
```

---

## Summary

| Aspect | Implementation |
|--------|----------------|
| **Core Learning** | Works fully offline with pre-downloaded content |
| **AI Features** | Basic local models offline; full AI when online |
| **Sync Strategy** | Learner-favoring conflict resolution, no work lost |
| **Storage** | 500MB - 1.5GB depending on languages/modules |
| **User Experience** | Clear indicators, graceful degradation, no panic |
| **School Support** | Teacher-managed camp/excursion mode |
| **Australia Focus** | Designed for rural, remote, and travel scenarios |

**The Goal**: A student on a cattle station in outback Queensland gets the same quality learning experience as a student in inner-city Melbourne — just with some features waiting to sync when the satellite internet comes back on.
