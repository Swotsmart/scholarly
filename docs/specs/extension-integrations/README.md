# Scholarly Platform Integration Services

## Early Years (Little Explorers) & Language Learning (LinguaFlow)

This package contains production-ready TypeScript services that integrate with the existing Scholarly infrastructure. These services extend the platform's capabilities to support early childhood education (ages 3-7) and comprehensive language learning across 6 languages.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Integration Points](#integration-points)
5. [Early Years Service](#early-years-service)
6. [Language Learning Service](#language-learning-service)
7. [Installation](#installation)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Usage Examples](#usage-examples)

---

## Overview

### The Challenge

The Scholarly platform needed to expand into two new educational domains:

1. **Early Years Education** - Supporting children ages 3-7 with phonics, numeracy, and age-appropriate AI interactions
2. **Language Learning** - Multi-language support with CEFR progression, heritage speaker pathways, and AI conversation partners

### The Solution

Rather than building entirely new infrastructure, these services leverage the existing 6 production services:

| Existing Service | How It's Extended |
|-----------------|-------------------|
| **ai-buddy_service.ts** | Child-friendly characters + Language tutor personas |
| **ai-content-studio_service.ts** | Phonics activities + CEFR exercises |
| **data-lake_service.ts** | Eye tracking events + SRS review tracking |
| **ml-pipeline_service.ts** | Reading difficulty prediction + Proficiency prediction |
| **analytics-reporting_service.ts** | Parent dashboards + CEFR progress dashboards |
| **ai-integration_service.ts** | Foundation for all AI interactions |

This approach ensures consistency, reduces duplication, and accelerates time-to-production.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SCHOLARLY PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐              ┌─────────────────────┐              │
│  │   EARLY YEARS       │              │  LANGUAGE LEARNING  │              │
│  │   (Little Explorers)│              │  (LinguaFlow)       │              │
│  │                     │              │                     │              │
│  │  • Ages 3-7         │              │  • All ages         │              │
│  │  • Phonics (SSP)    │              │  • 6 languages      │              │
│  │  • Numeracy (CPA)   │              │  • CEFR A1→C2       │              │
│  │  • Story worlds     │              │  • Heritage paths   │              │
│  │  • Eye tracking     │              │  • SRS vocabulary   │              │
│  └──────────┬──────────┘              └──────────┬──────────┘              │
│             │                                    │                          │
│             └────────────────┬───────────────────┘                          │
│                              │                                              │
│  ┌───────────────────────────┴───────────────────────────┐                 │
│  │              EXISTING INFRASTRUCTURE                   │                 │
│  ├───────────────────────────────────────────────────────┤                 │
│  │                                                       │                 │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │                 │
│  │  │ AI Buddy    │  │ AI Content  │  │ AI          │   │                 │
│  │  │ Service     │  │ Studio      │  │ Integration │   │                 │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │                 │
│  │                                                       │                 │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │                 │
│  │  │ Data Lake   │  │ ML Pipeline │  │ Analytics   │   │                 │
│  │  │ Service     │  │ Service     │  │ Reporting   │   │                 │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │                 │
│  │                                                       │                 │
│  └───────────────────────────────────────────────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
scholarly-integrations/
├── README.md                        # This file
├── early-years_service.ts           # Early Years domain service (2,372 lines)
├── language-learning_service.ts     # Language Learning main service (995 lines)
├── language-learning-types.ts       # Type definitions & CEFR framework (596 lines)
└── language-learning-personas.ts    # AI conversation personas (666 lines)

Total: 4,629 lines of TypeScript
```

---

## Integration Points

### Integration 1: AI Buddy Extension

**Purpose:** Extend AI Buddy with domain-specific personas

#### Early Years Characters

| Character | Specialization | Age Range | Personality |
|-----------|---------------|-----------|-------------|
| **Lettie the Letter Lion** | Phonics | 3-7 | Playful, patient, silly |
| **Numero the Number Knight** | Numeracy | 3-7 | Brave, kind, adventurous |
| **Captain Calculate** | Operations | 5-7 | Adventurous, generous |

**Safety Features:**
- Concerning pattern detection (emotional distress, secrecy, personal info)
- Automatic redirect to learning activities
- Safety flags stored for review (without message content)
- Age-appropriate language enforcement (max 10 words/sentence for preschool)

#### Language Learning Personas

| Language | Personas | Heritage Specialist |
|----------|----------|---------------------|
| **French** | Marie (Paris café), Pierre (Lyon chef) | — |
| **Spanish** | Carlos (Madrid journalist), Sofía (Mexico teacher), Diego (Buenos Aires tango) | Sofía ✓ |
| **Mandarin** | Wei (Beijing professor), Mei (Shanghai business), Liang (Taipei tech) | Mei ✓ |
| **German** | Hannah (Berlin startup), Thomas (Vienna museum) | — |
| **Japanese** | Yuki (Tokyo teacher), Kenji (Osaka comedian) | — |
| **Italian** | Marco (Rome art), Giulia (Milan fashion), Nonna Rosa (Tuscany) | Nonna Rosa ✓ |

**Features:**
- CEFR-adaptive scaffolding (A1→C2)
- Error correction styles: immediate, delayed, subtle, explicit
- Cultural context and regional variants
- Heritage speaker recognition and validation

---

### Integration 2: AI Content Studio

**Purpose:** Generate educational content dynamically

#### Early Years Content

```typescript
// Generate phonics activities for a specific phoneme
const activities = await earlyYearsService.generatePhonicsActivities(
  tenantId, 
  learnerId, 
  'sh',  // Target phoneme
  5      // Number of activities
);

// Generate a decodable reader matching learner's level
const reader = await earlyYearsService.generateDecodableReader(
  tenantId,
  learnerId,
  { theme: 'animals', sentenceCount: 8 }
);
```

**Phonics Phases (Systematic Synthetic Phonics):**

| Phase | Focus | Example Phonemes |
|-------|-------|------------------|
| 1 | Initial sounds | s, a, t, p, i, n |
| 2 | More consonants | ck, e, u, r, h, b, f |
| 3 | Digraphs | ch, sh, th, ng, ai, ee |
| 4 | Blending | CCVC, CVCC patterns |
| 5 | Alternative spellings | ay, ou, ie, a-e |
| 6 | Morphemes | -ing, -ed, un-, re- |

#### Language Learning Content

```typescript
// Generate CEFR-aligned exercises
const exercises = await languageService.generateExercises(
  tenantId,
  learnerId,
  {
    skill: 'reading',
    count: 5,
    grammarTopics: ['past_tense', 'object_pronouns']
  }
);
```

**Exercise Types:** fill_blank, multiple_choice, translation, comprehension, dictation, speaking_prompt

---

### Integration 3: Data Lake

**Purpose:** Ingest learning events for analytics and ML

#### Early Years Events

| Event Type | Data Captured |
|------------|---------------|
| `phonics.session_completed` | Duration, accuracy, words decoded, phonemes mastered |
| `phonics.activity_completed` | Activity type, phoneme, attempts, hints used |
| `eye_tracking.session_completed` | Fixations, saccades, regressions, focus score |
| `eye_tracking.concern_detected` | Concern type, severity, flag for review |
| `character_conversation.started` | Character ID, context |
| `character_conversation.message` | Message count, redirections |

#### Language Learning Events

| Event Type | Data Captured |
|------------|---------------|
| `conversation.started` | Persona ID, CEFR level, topic |
| `conversation.message` | Words produced, errors detected |
| `conversation.ended` | Duration, total metrics |
| `srs.card_created` | Card type, content |
| `srs.review_completed` | Response quality, box transitions |
| `exercises.generated` | Skill, CEFR level, count |
| `placement_test.completed` | Recommended CEFR, skill breakdown |

---

### Integration 4: ML Pipeline

**Purpose:** Predictive analytics for intervention and progression

#### Early Years: Reading Difficulty Prediction

```typescript
const prediction = await earlyYearsService.predictReadingDifficulty(
  tenantId,
  learnerId
);

// Returns:
{
  riskScore: 45,
  riskLevel: 'medium',
  confidence: 0.82,
  riskFactors: [
    { factor: 'High regression rate in eye tracking', impact: -15 },
    { factor: 'Decoding accuracy declining', impact: -20 }
  ],
  recommendations: [
    { type: 'phonics_review', title: 'Reinforce Phase 2 phonemes' }
  ],
  monitoringPlan: {
    reassessInDays: 7,
    focusAreas: ['decoding_accuracy', 'fluency'],
    parentNotification: true
  }
}
```

**Feature Inputs:**
- Phonics metrics: accuracy, trend, time per word, hints
- Eye tracking: fixation duration, regression rate, line tracking, focus score
- Engagement: session consistency, streak, total time

#### Language Learning: Proficiency Prediction

```typescript
const prediction = await languageService.predictProficiency(
  tenantId,
  learnerId
);

// Returns:
{
  currentProficiency: {
    overall: 'A2',
    reading: 'A2',
    writing: 'A1',
    listening: 'A2',
    speaking: 'A1'
  },
  predictedProgress: {
    thirtyDays: 'A2',
    ninetyDays: 'B1',
    oneYear: 'B2'
  },
  estimatedHoursToNextLevel: 85,
  strengths: ['reading', 'listening'],
  areasForImprovement: ['writing', 'speaking'],
  recommendations: [
    'Increase conversation practice to build speaking fluency',
    'Focus on written exercises to improve writing skills'
  ]
}
```

---

### Integration 5: Analytics & Reporting

**Purpose:** Role-specific dashboards and progress tracking

#### Early Years Parent Dashboard

```typescript
const dashboard = await earlyYearsService.getParentDashboard(
  tenantId,
  learnerId
);
```

**Dashboard Components:**

| Widget | Content |
|--------|---------|
| **Summary** | Sessions this week, minutes, streak, stars |
| **Phonics Progress** | Current phase, phonemes mastered, needs reinforcement |
| **Numeracy Progress** | Current stage, counting range, operations |
| **Story Progress** | Current world, episodes completed, characters unlocked |
| **Home Activities** | Recommended activities with materials and instructions |
| **Alerts** | Concerns flagged, milestones achieved |

#### Language Learner Dashboard

```typescript
const dashboard = await languageService.getLearnerDashboard(
  tenantId,
  learnerId
);
```

**Dashboard Components:**

| Widget | Content |
|--------|---------|
| **CEFR Progress** | Current level, skill breakdown, progress to next |
| **Weekly Stats** | Minutes practiced, conversation time, exercises |
| **SRS Overview** | Cards due, overdue, retention rate |
| **Recent Conversations** | Persona, topic, duration |
| **Achievements** | Recently earned badges |

---

## Early Years Service

### Core Features

#### 1. Learner Management

```typescript
// Create a new early years learner
const learner = await earlyYearsService.createLearner(tenantId, {
  childId: 'child_123',
  familyAccountId: 'family_456',
  firstName: 'Emma',
  dateOfBirth: new Date('2020-03-15'),
  preferredLanguage: 'en'
});
```

**Age-Appropriate Settings (Auto-configured):**

| Age Group | Session Duration | Break Frequency | TTS Speed | Celebration |
|-----------|-----------------|-----------------|-----------|-------------|
| 3-4 | 15 min | 5 min | Slow | Exciting |
| 5-6 | 20 min | 7 min | Normal | Medium |
| 7 | 25 min | 10 min | Normal | Medium |

#### 2. Character Conversations

```typescript
// Start conversation with Lettie
const conversation = await earlyYearsService.startCharacterConversation(
  tenantId,
  learnerId,
  'lettie',
  { 
    currentActivity: 'phonics_practice',
    targetPhoneme: 'sh'
  }
);

// Send message (with safety check)
const response = await earlyYearsService.sendCharacterMessage(
  tenantId,
  conversationId,
  "I can hear sh in ship!"
);
```

#### 3. Picture Password Authentication

```typescript
// Create picture password (for pre-literate children)
await earlyYearsService.createPicturePassword(
  tenantId,
  learnerId,
  ['dog', 'sun', 'apple'],  // Image sequence
  3  // Grid size (3x3)
);

// Verify attempt
const result = await earlyYearsService.verifyPicturePassword(
  tenantId,
  learnerId,
  ['dog', 'sun', 'apple']
);

// Result: { success: true } or { success: false, remainingAttempts: 2 }
```

#### 4. Phonics Progression

**44 English Phonemes organized by SSP phases:**

```typescript
// Access phase definitions
import { PHONICS_PHASES } from './early-years_service';

const phase3 = PHONICS_PHASES[3];
// {
//   phase: 3,
//   phonemes: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', ...],
//   focus: 'Digraphs and long vowel sounds',
//   exampleWords: ['chip', 'shop', 'thin', 'ring', 'rain', 'feet', 'night', 'boat'],
//   graphemes: [...]
// }
```

#### 5. Eye Tracking Integration

```typescript
// Record eye tracking session
await earlyYearsService.recordEyeTrackingSession(tenantId, {
  id: 'session_123',
  learnerId,
  sessionType: 'reading',
  contentId: 'reader_456',
  metrics: {
    totalFixations: 234,
    averageFixationDurationMs: 245,
    forwardSaccades: 180,
    regressiveSaccades: 54,  // Looking back - potential issue
    wordsPerMinute: 35,
    lineTrackingAccuracy: 78,
    focusScore: 82
  },
  patterns: [
    {
      patternType: 'regression_heavy',
      frequency: 0.23,
      severity: 'moderate',
      possibleCauses: ['decoding difficulty', 'comprehension check']
    }
  ],
  concerns: []
});
```

---

## Language Learning Service

### Core Features

#### 1. CEFR Framework

Complete CEFR level definitions with IB MYP mapping:

```typescript
import { CEFR_LEVELS } from './language-learning-types';

const b1 = CEFR_LEVELS['B1'];
// {
//   level: 'B1',
//   name: 'Intermediate',
//   description: 'Can understand the main points of clear standard input...',
//   vocabularyRange: '2000-4000',
//   grammarTopics: ['conditional', 'subjunctive_intro', 'relative_clauses', 'passive_voice'],
//   canDoStatements: {
//     reading: 'Can understand texts that consist mainly of high frequency everyday language.',
//     writing: 'Can write simple connected text on topics which are familiar...',
//     listening: 'Can understand the main points of clear standard speech...',
//     speaking: 'Can deal with most situations likely to arise whilst travelling.'
//   },
//   ibMYPPhase: 3,
//   hoursToAchieve: 350
// }
```

#### 2. Heritage Speaker Support

```typescript
// Create heritage speaker profile
const learner = await languageService.createLearner(tenantId, {
  userId: 'user_123',
  targetLanguage: 'zh',
  nativeLanguage: 'en',
  isHeritageSpeaker: true,
  heritageProfile: {
    relationToLanguage: 'grandparent',
    exposureContext: 'home',
    speakingComfort: 'conversational',
    readingAbility: 'minimal',
    writingAbility: 'none',
    formalRegisterExposure: 'low',
    culturalConnection: 'strong',
    learningGoals: ['Read Chinese newspapers', 'Write to relatives'],
    specialFocus: ['literacy', 'formal_register']
  }
});
```

**Heritage-Aware Personas:**
- Recognize and validate existing knowledge
- Focus on literacy gaps (reading/writing)
- Bridge informal → formal register
- Celebrate cultural connection

#### 3. AI Conversations

```typescript
// Start conversation with persona
const conversation = await languageService.startConversation(
  tenantId,
  learnerId,
  'marie_paris',  // Persona ID
  {
    topic: 'ordering at a café',
    grammarFocus: ['polite requests', 'articles']
  }
);

// Send message
const response = await languageService.sendMessage(
  tenantId,
  conversationId,
  "Je voudrais un café, s'il vous plaît."
);

// End and get summary
const summary = await languageService.endConversation(
  tenantId,
  conversationId
);
// {
//   durationMinutes: 12,
//   messageCount: 18,
//   wordsProduced: 145,
//   newVocabulary: ['croissant', 'addition', 'terrasse'],
//   errorsDetected: 3,
//   correctionsMade: 2,
//   ...
// }
```

#### 4. Spaced Repetition System (SRS)

Implements SM-2 algorithm with Leitner box system:

```typescript
// Create vocabulary card
const card = await languageService.createSRSCard(tenantId, learnerId, {
  cardType: 'vocabulary',
  front: 'le chat',
  back: 'the cat',
  context: 'Le chat dort sur le canapé.'
});

// Get due cards
const dueCards = await languageService.getDueCards(tenantId, learnerId, 20);

// Record review (SM-2 quality: 0-5)
const updated = await languageService.recordSRSReview(
  tenantId,
  cardId,
  4,      // Quality (4 = correct with hesitation)
  2500    // Response time in ms
);

// Get statistics
const stats = await languageService.getSRSStatistics(tenantId, learnerId);
// {
//   totalCards: 234,
//   cardsByBox: { 1: 45, 2: 67, 3: 58, 4: 34, 5: 20, 6: 10 },
//   dueToday: 23,
//   overdue: 5,
//   retentionRate: 87.5,
//   currentStreak: 12,
//   ...
// }
```

**Box System:**
| Box | Review Interval |
|-----|-----------------|
| 1 | Daily |
| 2 | Every 2 days |
| 3 | Every 4 days |
| 4 | Weekly |
| 5 | Bi-weekly |
| 6 | Monthly |

#### 5. Placement Testing

```typescript
const result = await languageService.conductPlacementTest(
  tenantId,
  learnerId,
  'fr'  // Language
);

// {
//   recommendedCEFR: 'A2',
//   skillBreakdown: {
//     reading: 'A2',
//     writing: 'A1',
//     listening: 'A2',
//     speaking: 'A1'
//   },
//   confidence: 0.85,
//   strengths: ['vocabulary_recognition', 'reading_comprehension'],
//   weaknesses: ['verb_conjugation', 'written_expression'],
//   recommendedStartingPoint: {
//     unit: 'Unit 3: Present Tense Mastery',
//     focus: ['verb_conjugation', 'daily_routines']
//   }
// }
```

---

## Installation

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Access to Scholarly platform services

### Steps

1. **Copy files to your services directory:**

```bash
cp early-years_service.ts /path/to/scholarly/services/
cp language-learning*.ts /path/to/scholarly/services/
```

2. **Install dependencies (if not already present):**

```bash
npm install @scholarly/shared @scholarly/database
```

3. **Add to your service initialization:**

```typescript
// In your main application setup
import { initializeEarlyYearsService } from './services/early-years_service';
import { initializeLanguageLearningService } from './services/language-learning_service';

const earlyYearsService = initializeEarlyYearsService({
  eventBus,
  cache,
  config
});

const languageLearningService = initializeLanguageLearningService({
  eventBus,
  cache,
  config
});
```

4. **Register dashboard widgets:**

```typescript
await earlyYearsService.registerDashboardWidgets(tenantId);
await languageLearningService.registerDashboardWidgets(tenantId);
```

---

## Configuration

### Environment Variables

```env
# AI Provider Configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Feature Flags
ENABLE_EYE_TRACKING=true
ENABLE_HERITAGE_PATHWAYS=true
ENABLE_PICTURE_PASSWORD=true

# Safety Settings
CHILD_SAFETY_REDIRECT_ENABLED=true
MAX_SESSION_MINUTES_EARLY_YEARS=30
BREAK_REMINDER_ENABLED=true
```

### Tenant Configuration

```typescript
// Per-tenant settings
const tenantConfig = {
  earlyYears: {
    enabledCharacters: ['lettie', 'numero', 'captain_calculate'],
    phonicsMethodology: 'ssp',  // Systematic Synthetic Phonics
    numeracyMethodology: 'cpa', // Concrete-Pictorial-Abstract
    eyeTrackingEnabled: true,
    parentPortalLanguages: ['en', 'es', 'zh']
  },
  languageLearning: {
    enabledLanguages: ['fr', 'es', 'zh', 'de', 'ja', 'it'],
    heritagePathwaysEnabled: true,
    maxCardsPerDay: 50,
    conversationMinutesGoal: 15
  }
};
```

---

## API Reference

### Early Years Service

| Method | Description |
|--------|-------------|
| `createLearner(tenantId, input)` | Create new early years learner |
| `getLearner(tenantId, learnerId)` | Get learner profile |
| `startCharacterConversation(tenantId, learnerId, characterId, context)` | Start AI conversation |
| `sendCharacterMessage(tenantId, conversationId, message)` | Send message with safety check |
| `generatePhonicsActivities(tenantId, learnerId, phoneme, count)` | Generate phonics activities |
| `generateDecodableReader(tenantId, learnerId, options)` | Generate decodable reader |
| `recordPhonicsSession(tenantId, session)` | Record phonics session data |
| `recordEyeTrackingSession(tenantId, session)` | Record eye tracking data |
| `predictReadingDifficulty(tenantId, learnerId)` | Get reading risk prediction |
| `getParentDashboard(tenantId, learnerId)` | Get parent dashboard data |
| `createPicturePassword(tenantId, learnerId, sequence, gridSize)` | Create picture password |
| `verifyPicturePassword(tenantId, learnerId, attempt, metadata)` | Verify password attempt |

### Language Learning Service

| Method | Description |
|--------|-------------|
| `createLearner(tenantId, input)` | Create new language learner |
| `getLearner(tenantId, learnerId)` | Get learner profile |
| `startConversation(tenantId, learnerId, personaId, options)` | Start AI conversation |
| `sendMessage(tenantId, conversationId, message)` | Send message in conversation |
| `endConversation(tenantId, conversationId)` | End and summarize conversation |
| `generateExercises(tenantId, learnerId, options)` | Generate CEFR exercises |
| `createSRSCard(tenantId, learnerId, card)` | Create vocabulary card |
| `recordSRSReview(tenantId, cardId, quality, responseTime)` | Record card review |
| `getDueCards(tenantId, learnerId, limit)` | Get cards due for review |
| `getSRSStatistics(tenantId, learnerId)` | Get SRS statistics |
| `predictProficiency(tenantId, learnerId)` | Get proficiency prediction |
| `conductPlacementTest(tenantId, learnerId, language)` | Run placement test |
| `getLearnerDashboard(tenantId, learnerId)` | Get learner dashboard data |

---

## Usage Examples

### Example 1: Onboarding a Young Learner

```typescript
// 1. Create learner
const learner = await earlyYearsService.createLearner(tenantId, {
  childId: 'child_emma',
  familyAccountId: 'family_smith',
  firstName: 'Emma',
  dateOfBirth: new Date('2020-06-15')
});

// 2. Set up picture password
await earlyYearsService.createPicturePassword(
  tenantId,
  learner.id,
  ['butterfly', 'rainbow', 'star']
);

// 3. Start first session with Lettie
const conversation = await earlyYearsService.startCharacterConversation(
  tenantId,
  learner.id,
  'lettie',
  { currentActivity: 'introduction' }
);

// Emma sees: "ROAR! Hi friend! I'm Lettie! Ready for letter fun?"
```

### Example 2: Heritage Spanish Speaker

```typescript
// 1. Create heritage learner
const learner = await languageService.createLearner(tenantId, {
  userId: 'user_maria',
  targetLanguage: 'es',
  nativeLanguage: 'en',
  isHeritageSpeaker: true,
  heritageProfile: {
    relationToLanguage: 'parent',
    exposureContext: 'home',
    speakingComfort: 'conversational',
    readingAbility: 'basic',
    writingAbility: 'minimal',
    formalRegisterExposure: 'low',
    culturalConnection: 'strong',
    specialFocus: ['literacy', 'formal_register', 'academic']
  }
});

// 2. Conduct placement (recognizes heritage speaker patterns)
const placement = await languageService.conductPlacementTest(
  tenantId,
  learner.id,
  'es'
);

// 3. Start with heritage-specialist persona
const conversation = await languageService.startConversation(
  tenantId,
  learner.id,
  'sofia_mexico',  // Heritage specialist
  { topic: 'familia y tradiciones' }
);
```

### Example 3: Daily Language Practice Session

```typescript
// 1. Get due vocabulary cards
const dueCards = await languageService.getDueCards(tenantId, learnerId, 20);

// 2. Review cards
for (const card of dueCards) {
  // Show card, get user response...
  const quality = evaluateResponse(userAnswer, card.back);
  
  await languageService.recordSRSReview(
    tenantId,
    card.id,
    quality,
    responseTime
  );
}

// 3. Practice conversation (10 minutes)
const conversation = await languageService.startConversation(
  tenantId,
  learnerId,
  learner.preferredPersonaId,
  { topic: 'daily_life' }
);

// ... conversation messages ...

const summary = await languageService.endConversation(tenantId, conversation.id);

// 4. Check dashboard
const dashboard = await languageService.getLearnerDashboard(tenantId, learnerId);
console.log(`Streak: ${dashboard.weeklyStats.currentStreak} days`);
console.log(`Progress to ${dashboard.cefrProgress.targetLevel}: ${dashboard.cefrProgress.progressToNextLevel}%`);
```

---

## Support

For questions or issues, contact the Scholarly platform team.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial release with 5 integrations |

---

*Built with ❤️ for the Scholarly platform*
