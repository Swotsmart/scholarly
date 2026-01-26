# Eye Tracking & Gaze Analytics for Little Explorers

## Reading the Reader: Understanding Where Little Eyes Go

---

## The Vision

Imagine being able to see exactly what a child sees when they're learning to read — which words their eyes linger on, where they get stuck, when they skip back to re-read, and when their gaze drifts away entirely. Eye tracking transforms reading instruction from guesswork into precision medicine for literacy.

For tutors and teachers, this is like having X-ray vision into the reading process itself.

---

## Why Eye Tracking Matters for Early Readers

### The Reading Process Is Invisible

When a child reads aloud, we hear the *output* but not the *process*:

```
What we hear:          "The c-c-cat s-sat on the m-m-mat"
What we don't see:     Where did their eyes go? What caused the hesitation?
                       Did they look at 'cat' three times before attempting it?
                       Did they skip 'the' entirely (sight word recognition)?
                       Did their eyes jump backwards after 'sat'?
```

Eye tracking makes the invisible visible.

### What Eye Movements Reveal

| Eye Behavior | What It Indicates |
|--------------|-------------------|
| **Fixation duration** | Processing difficulty (longer = harder) |
| **Fixation count** | How many times they looked at a word |
| **Regressions** | Going back to re-read (comprehension repair) |
| **Saccade length** | Reading fluency and word recognition |
| **Skip rate** | Automaticity with sight words |
| **Gaze drift** | Attention, fatigue, or disengagement |
| **Line tracking** | Ability to follow text left-to-right |
| **Return sweeps** | Skill moving to next line |

---

## Technical Implementation

### Gaze Capture Methods

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GAZE CAPTURE METHODS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIER 1: Device Camera (Most Accessible)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Uses iPad/tablet front camera + ML model                           │   │
│  │  • Accuracy: ~1-2° visual angle (good enough for word-level)        │   │
│  │  • Works on: Most modern tablets with front camera                  │   │
│  │  • Calibration: Fun "follow the butterfly" game (30 seconds)        │   │
│  │  • Privacy: Processed on-device, no video stored                    │   │
│  │  • Limitations: Requires stable head position, good lighting        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TIER 2: Dedicated Eye Tracker (Highest Accuracy)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  External device (e.g., Tobii, EyeTech)                             │   │
│  │  • Accuracy: ~0.5° visual angle (character-level)                   │   │
│  │  • Works on: Clips to tablet/monitor                                │   │
│  │  • Calibration: 5-point calibration (15 seconds)                    │   │
│  │  • Privacy: Same on-device processing                               │   │
│  │  • Use case: Assessment mode, research, intensive intervention      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TIER 3: Hybrid (Best of Both)                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Camera-based with AI enhancement                                   │   │
│  │  • Uses front camera + touch correlation + ML models                │   │
│  │  • Learns child's patterns over time                                │   │
│  │  • "Soft" eye tracking: Probabilistic word attention                │   │
│  │  • Falls back gracefully when camera unavailable                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Privacy-First Gaze Processing

```typescript
interface GazePrivacyArchitecture {
  // CRITICAL: No raw video ever leaves device
  videoProcessing: {
    location: 'on_device_only';
    storage: 'never';
    transmission: 'never';
  };
  
  // Only derived metrics are stored
  storedData: {
    gazeCoordinates: false;      // No raw (x,y) positions
    wordFixations: true;         // "Looked at 'cat' for 450ms"
    aggregateMetrics: true;      // "Average fixation 380ms"
    heatmaps: 'anonymized';      // Word-level, not pixel-level
  };
  
  // Parental consent required
  consent: {
    type: 'explicit_opt_in';
    granularity: 'per_feature';
    revocable: 'instant';
    default: 'disabled';
  };
}
```

---

## Data Model Extensions

### New Schema Models

```prisma
// ============================================================================
// EYE TRACKING & GAZE ANALYTICS
// ============================================================================

/// Gaze tracking session during reading
model GazeTrackingSession {
  id                      String   @id @default(cuid())
  learningSessionId       String   @map("learning_session_id")
  profileId               String   @map("profile_id")
  
  // Tracking method
  trackingMethod          String   @map("tracking_method")
  // device_camera, external_tracker, hybrid, touch_inferred
  
  // Device/tracker info
  trackerType             String?  @map("tracker_type")
  trackerModel            String?  @map("tracker_model")
  samplingRateHz          Int?     @map("sampling_rate_hz")
  
  // Calibration
  calibrationQuality      Float?   @map("calibration_quality") // 0-1
  calibrationMethod       String?  @map("calibration_method")
  calibratedAt            DateTime? @map("calibrated_at")
  
  // Session timing
  startedAt               DateTime @default(now()) @map("started_at")
  endedAt                 DateTime? @map("ended_at")
  totalTrackingSeconds    Int?     @map("total_tracking_seconds")
  validTrackingPercent    Float?   @map("valid_tracking_percent")
  
  // Environmental factors
  lightingCondition       String?  @map("lighting_condition") // good, moderate, poor
  headMovementLevel       String?  @map("head_movement_level") // stable, moderate, high
  
  // Session quality
  dataQualityScore        Float?   @map("data_quality_score")
  
  createdAt               DateTime @default(now()) @map("created_at")
  
  // Relations
  readingGazeAnalyses     ReadingGazeAnalysis[]
  
  @@index([profileId, startedAt])
  @@index([learningSessionId])
  @@map("gaze_tracking_sessions")
}

/// Gaze analysis for a specific reading activity
model ReadingGazeAnalysis {
  id                      String   @id @default(cuid())
  gazeSessionId           String   @map("gaze_session_id")
  gazeSession             GazeTrackingSession @relation(fields: [gazeSessionId], references: [id], onDelete: Cascade)
  
  // What was being read
  contentType             String   @map("content_type")
  // decodable_story, word_list, sentence, assessment_passage
  contentId               String   @map("content_id")
  contentText             String   @map("content_text") @db.Text
  
  // Timing
  startedAt               DateTime @default(now()) @map("started_at")
  endedAt                 DateTime? @map("ended_at")
  totalReadingTimeMs      Int?     @map("total_reading_time_ms")
  
  // Overall metrics
  totalFixations          Int      @default(0) @map("total_fixations")
  totalRegressions        Int      @default(0) @map("total_regressions")
  averageFixationMs       Float?   @map("average_fixation_ms")
  averageSaccadeLength    Float?   @map("average_saccade_length") // in characters
  
  // Reading pattern metrics
  readingSpeed            Float?   @map("reading_speed") // words per minute (gaze-based)
  lineTrackingAccuracy    Float?   @map("line_tracking_accuracy")
  returnSweepAccuracy     Float?   @map("return_sweep_accuracy")
  
  // Attention metrics
  onTextPercent           Float?   @map("on_text_percent")
  gazeDriftEvents         Int      @default(0) @map("gaze_drift_events")
  longestDriftMs          Int?     @map("longest_drift_ms")
  
  // Word-level data
  wordGazeData            Json     @default("[]") @map("word_gaze_data")
  // Array of WordGazeMetrics (see below)
  
  // Identified challenges
  challengingWords        String[] @default([]) @map("challenging_words")
  challengingPatterns     Json     @default("[]") @map("challenging_patterns")
  
  // AI interpretation
  aiInterpretation        Json?    @map("ai_interpretation")
  confidenceScore         Float?   @map("confidence_score")
  
  createdAt               DateTime @default(now()) @map("created_at")
  
  @@index([gazeSessionId])
  @@index([contentId])
  @@map("reading_gaze_analyses")
}

/// Aggregated gaze patterns for a child (built over time)
model GazePatternProfile {
  id                      String   @id @default(cuid())
  profileId               String   @unique @map("profile_id")
  
  // Baseline metrics (established over multiple sessions)
  baselineFixationMs      Float?   @map("baseline_fixation_ms")
  baselineSaccadeLength   Float?   @map("baseline_saccade_length")
  baselineRegressionRate  Float?   @map("baseline_regression_rate")
  
  // Reading style classification
  readingStyle            String?  @map("reading_style")
  // careful_methodical, quick_scanner, regression_heavy, inconsistent
  
  // Strengths
  strongWordTypes         String[] @default([]) @map("strong_word_types")
  // sight_words, cvc_words, short_words, familiar_words
  efficientGraphemes      String[] @default([]) @map("efficient_graphemes")
  
  // Challenge areas (gaze-identified)
  challengingWordTypes    String[] @default([]) @map("challenging_word_types")
  challengingGraphemes    String[] @default([]) @map("challenging_graphemes")
  challengingPositions    String[] @default([]) @map("challenging_positions")
  // word_initial, word_medial, word_final, line_end, page_bottom
  
  // Attention patterns
  typicalFocusDuration    Int?     @map("typical_focus_duration") // seconds before drift
  attentionPattern        String?  @map("attention_pattern")
  // sustained, variable, declining, task_dependent
  
  // Line navigation
  lineTrackingAbility     String?  @map("line_tracking_ability")
  // strong, developing, needs_support
  returnSweepAbility      String?  @map("return_sweep_ability")
  
  // Progression tracking
  progressionData         Json     @default("[]") @map("progression_data")
  // [{ date, avgFixation, regressionRate, readingSpeed }]
  
  // Data quality
  sessionsAnalyzed        Int      @default(0) @map("sessions_analyzed")
  totalReadingMinutes     Int      @default(0) @map("total_reading_minutes")
  profileConfidence       Float    @default(0) @map("profile_confidence")
  lastUpdatedAt           DateTime @default(now()) @map("last_updated_at")
  
  @@map("gaze_pattern_profiles")
}

/// Word-level gaze metrics (stored as JSON in ReadingGazeAnalysis)
// This is a TypeScript interface, not a Prisma model
// Stored in ReadingGazeAnalysis.wordGazeData
/*
interface WordGazeMetrics {
  wordIndex: number;              // Position in text
  word: string;                   // The actual word
  
  // Fixation data
  fixationCount: number;          // How many times eyes landed on word
  totalFixationMs: number;        // Total time spent on word
  firstFixationMs: number;        // Duration of first look
  
  // Timing
  firstFixationTime: number;      // When first looked at (ms from start)
  lastFixationTime: number;       // When last looked at
  
  // Regressions
  regressionsTo: number;          // Times returned to this word
  regressionsFrom: number;        // Times looked back from this word
  
  // Position in word
  landingPosition: string;        // initial, middle, final
  
  // Outcome
  readCorrectly: boolean | null;  // If we have audio to verify
  
  // Flags
  skipped: boolean;               // Never fixated
  prolongedFixation: boolean;     // Fixation > 2x baseline
  multipleRevisits: boolean;      // Returned 3+ times
  
  // Comparative
  fixationVsBaseline: number;     // Ratio to child's baseline
  fixationVsCohort: number;       // Ratio to age-group average
}
*/
```

---

## Teacher/Tutor Dashboard: Gaze Insights

### Reading Replay

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       READING REPLAY VIEW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Emma's Reading: "The Big Red Bus"                                         │
│  Total time: 2:34  |  Words: 48  |  Accuracy: 87%                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  The    big    red    bus    went    up    the    hill.            │   │
│  │  ○      ○      ●●●    ○      ●●     ○     ○      ●                 │   │
│  │  120ms  180ms  890ms  150ms  420ms  80ms  90ms   310ms             │   │
│  │                ↑↑↑           ↑↑                   ↑                │   │
│  │             3 looks      2 looks             regression            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [▶ Play Reading Replay]  Shows animated gaze path synchronized with       │
│                           audio recording                                  │
│                                                                             │
│  HEATMAP VIEW:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ░░░░  ░░░░  ████  ░░░░  ▓▓▓▓  ░░░░  ░░░░  ▓▓▓▓                   │   │
│  │  The   big   red   bus   went  up    the   hill                    │   │
│  │                                                                     │   │
│  │  Legend: ░ Normal  ▓ Elevated  █ High attention                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Challenge Word Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMMA'S CHALLENGE WORDS (Last 7 Days)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WORDS CAUSING LONGEST FIXATIONS                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Word        Avg Fixation    vs Baseline    Occurrences    Pattern  │   │
│  │  ──────────────────────────────────────────────────────────────────│   │
│  │  "through"   1,240ms         3.2x           4              📍ee→oo  │   │
│  │  "said"        890ms         2.3x           8              📍ai→e   │   │
│  │  "where"       780ms         2.0x           5              📍wh-    │   │
│  │  "because"     720ms         1.9x           3              📍-au-   │   │
│  │  "friend"      680ms         1.8x           6              📍ie→e   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PATTERN ANALYSIS                                                          │
│  Emma's gaze data reveals consistent challenges with:                      │
│  • Alternative spellings for /ee/ sound (ee, ea, ie, e-e)                  │
│  • Common irregular sight words (said, where, friend)                      │
│  • Words with silent letters (through)                                     │
│                                                                             │
│  RECOMMENDED ACTIONS                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Focus this week's phonics on 'ee' alternative spellings         │   │
│  │  2. Add 'through', 'said', 'where' to sight word practice           │   │
│  │  3. Parent Quest: "Spot the 'ee' sound" shopping game               │   │
│  │                                                     [Assign Quest]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Regression Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REGRESSION PATTERNS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Regressions are when eyes jump BACK to re-read. Some are healthy          │
│  (comprehension monitoring), some indicate decoding struggles.             │
│                                                                             │
│  EMMA'S REGRESSION PROFILE                                                 │
│                                                                             │
│  Overall regression rate: 18% (Age norm: 12-15%)                           │
│                                                                             │
│  REGRESSION TRIGGERS:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  After multi-syllable words     ████████████████░░░░  42%          │   │
│  │  After words with digraphs      ██████████░░░░░░░░░░  28%          │   │
│  │  Sentence comprehension         ██████░░░░░░░░░░░░░░  18%          │   │
│  │  Line return errors             ████░░░░░░░░░░░░░░░░  12%          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  INTERPRETATION:                                                           │
│  Emma's regressions are primarily decoding-based (after hard words)        │
│  rather than comprehension-based. This suggests she would benefit from:    │
│  • Syllable segmentation practice                                          │
│  • Digraph automaticity drills                                             │
│  • Preview of tricky words before reading new texts                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Attention & Focus Tracking

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ATTENTION ANALYSIS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ON-TEXT GAZE OVER TIME (Today's Session)                                  │
│                                                                             │
│  100% │ ████                                                               │
│   80% │ ████████████                    ████                               │
│   60% │ ████████████████          ████████████████                         │
│   40% │ ████████████████████████████████████████████                       │
│   20% │ ████████████████████████████████████████████████                   │
│    0% └─────────────────────────────────────────────────────────           │
│        0    2    4    6    8   10   12   14   16   18   20 min             │
│                                                                             │
│  GAZE DRIFT EVENTS                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • 3:42 - Looked at illustration (2.1 sec) ✓ Normal                 │   │
│  │  • 7:15 - Gaze left screen (4.8 sec) - After "difficult" word       │   │
│  │  • 12:30 - Looked at illustration (1.4 sec) ✓ Normal                │   │
│  │  • 15:45 - Gaze wandered (8.2 sec) - Fatigue pattern detected       │   │
│  │           → System suggested break, Emma accepted                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OPTIMAL SESSION LENGTH (based on gaze data): 12-14 minutes               │
│  Attention typically drops after: Page 8 of stories                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Real-Time Intervention Triggers

### Adaptive Support Based on Gaze

```typescript
interface GazeTriggeredInterventions {
  // When fixation on word exceeds threshold
  prolongedFixation: {
    threshold: '2x baseline or 800ms';
    immediateResponse: [
      'Highlight word subtly',
      'Mentor creature appears near word',
      'Optional: Play pronunciation audio',
    ];
    ifPersists: [
      'Break word into syllables visually',
      'Show mouth position for tricky sound',
      'Offer "tap for help" button',
    ];
  };
  
  // When child keeps looking back
  excessiveRegressions: {
    threshold: '3+ regressions to same word or phrase';
    response: [
      'Slow down auto-advance',
      'Re-read sentence with highlighting',
      'Simplify comprehension check',
    ];
  };
  
  // When gaze leaves text
  gazeDrift: {
    threshold: '5+ seconds off text (not on illustration)';
    response: [
      'Gentle audio nudge: "Let\'s keep reading!"',
      'Mentor creature animation to draw eyes back',
      'If repeated: Suggest break',
    ];
  };
  
  // When skipping words
  wordSkipping: {
    threshold: 'Skips word entirely (0 fixations)';
    response: [
      'If sight word: Log as automatic (good!)',
      'If decodable word: Highlight briefly',
      'If content word: Pause for fixation',
    ];
  };
  
  // Line tracking difficulties
  lineTrackingError: {
    threshold: 'Eyes jump to wrong line';
    response: [
      'Increase line spacing dynamically',
      'Add reading ruler/guide',
      'Highlight current line subtly',
    ];
  };
}
```

---

## Progress Tracking Over Time

### Gaze Metrics Progression

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMMA'S READING FLUENCY PROGRESSION                       │
│                    (Measured by Eye Tracking)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AVERAGE FIXATION DURATION (Lower = more fluent)                           │
│                                                                             │
│  500ms │                                                                    │
│  450ms │ ●                                                                  │
│  400ms │    ●                                                               │
│  350ms │       ●  ●                                                         │
│  300ms │             ●  ●  ●                                                │
│  250ms │                      ●  ●  ●  ●                          Target   │
│  200ms │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│        └─────────────────────────────────────────────────────────          │
│         W1   W2   W3   W4   W5   W6   W7   W8   W9  W10                    │
│                                                                             │
│  REGRESSION RATE (Lower = better comprehension)                            │
│                                                                             │
│   25% │ ●                                                                   │
│   20% │    ●  ●                                                             │
│   15% │ ─ ─ ─ ─●─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Age norm     │
│   12% │          ●  ●  ●  ●  ●  ●                                          │
│   10% │                                                                     │
│        └─────────────────────────────────────────────────────────          │
│         W1   W2   W3   W4   W5   W6   W7   W8   W9  W10                    │
│                                                                             │
│  KEY INSIGHT: Emma's fixation duration has decreased 40% over 10 weeks,    │
│  indicating developing automaticity. Her regression rate is now at age     │
│  norm, suggesting good comprehension monitoring.                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tutor-Facing Features

### Live Session Gaze View

During live tutoring sessions, the tutor can see (with parent consent):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LIVE TUTORING: GAZE OVERLAY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────┬──────────────────────────────┐   │
│  │                                      │                              │   │
│  │  [Child's Reading View]              │  LIVE GAZE INDICATOR        │   │
│  │                                      │                              │   │
│  │  The little dog ran to              │  Current word: "garden"      │   │
│  │  the garden. He saw a               │  Fixation: 340ms (normal)    │   │
│  │  big red [●] flower.                │  Regressions: 0              │   │
│  │                                      │                              │   │
│  │  ● = Current gaze position          │  ⚠️ Heads up:                │   │
│  │                                      │  "flower" may be challenging │   │
│  │                                      │  (contains 'ow' digraph)     │   │
│  │                                      │                              │   │
│  └──────────────────────────────────────┴──────────────────────────────┘   │
│                                                                             │
│  TUTOR CONTROLS                                                            │
│  [Pause if struggle] [Show gaze path] [Highlight word] [Play sound]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Post-Session Gaze Report

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SESSION GAZE SUMMARY                                     │
│                    Emma • Today 3:30 PM • Tutor: Ms. Sarah                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WORDS THAT NEEDED SUPPORT (Gaze-Identified)                               │
│                                                                             │
│  ┌───────────┬─────────────┬───────────────┬──────────────────────────┐    │
│  │ Word      │ Fixation    │ Regressions   │ What Helped              │    │
│  ├───────────┼─────────────┼───────────────┼──────────────────────────┤    │
│  │ flower    │ 1,240ms     │ 2             │ Syllable split: flow-er  │    │
│  │ through   │ 980ms       │ 1             │ Sound button pressed     │    │
│  │ beautiful │ 1,100ms     │ 3             │ Tutor modeled, success   │    │
│  │ watched   │ 720ms       │ 0             │ None needed (resolved)   │    │
│  └───────────┴─────────────┴───────────────┴──────────────────────────┘    │
│                                                                             │
│  RECOMMENDED FOCUS FOR NEXT SESSION                                        │
│  • Practice words with 'ow' making /ow/ sound (flower, tower, power)      │
│  • Review 'ough' patterns (through, though, thought)                       │
│  • Syllable splitting for 3+ syllable words                                │
│                                                                             │
│  POSITIVE OBSERVATIONS                                                     │
│  • Sight word recognition excellent (the, was, said all skipped/fast)      │
│  • Good self-correction after regressions                                  │
│  • Attention sustained for full 18-minute session                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Consent & Privacy Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EYE TRACKING PRIVACY FRAMEWORK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT WE DO                           WHAT WE NEVER DO                     │
│  ────────────────────────────────     ────────────────────────────────     │
│  ✓ Process video on-device only       ✗ Store raw video footage            │
│  ✓ Store word-level metrics           ✗ Store raw gaze coordinates         │
│  ✓ Generate aggregated insights       ✗ Use for any purpose beyond         │
│  ✓ Share with tutor (with consent)      reading support                    │
│  ✓ Allow parent to view child's data  ✗ Share with third parties           │
│  ✓ Delete all data on request         ✗ Use for advertising or profiling   │
│                                                                             │
│  CONSENT FLOW                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Eye tracking is OFF by default                                     │   │
│  │                                                                     │   │
│  │  To enable:                                                         │   │
│  │  1. Parent explicitly enables in Settings → Privacy → Eye Tracking  │   │
│  │  2. Parent reviews what data is collected                           │   │
│  │  3. Parent can disable anytime (immediate effect)                   │   │
│  │  4. Separate consent for tutor access to gaze data                  │   │
│  │                                                                     │   │
│  │  Child is shown age-appropriate explanation:                        │   │
│  │  "We're going to watch where your eyes look when you read!          │   │
│  │   This helps us know which words are tricky for you."               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

Eye tracking transforms reading instruction from reactive to proactive:

| Without Eye Tracking | With Eye Tracking |
|---------------------|-------------------|
| Wait for child to struggle audibly | See struggle before they speak |
| Guess which words are hard | Know exactly which words cause fixation |
| Assume attention is good | Detect drift before disengagement |
| Generic phonics practice | Precision-targeted intervention |
| Subjective progress reports | Objective fluency metrics |

**For toddlers learning to read, this is like giving teachers superhuman perception — seeing the invisible process of reading unfold in real-time.**
