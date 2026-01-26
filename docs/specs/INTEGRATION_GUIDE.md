# Scholarly Integration Guide

## How LinguaFlow Connects to the Scholarly Ecosystem

---

## Overview

LinguaFlow integrates seamlessly with other Scholarly services to create a unified learning experience. This guide documents the key integration points.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SCHOLARLY ECOSYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  Curriculum │   │    Tutor    │   │   Content   │   │ Homeschool  │     │
│  │   Curator   │   │   Booking   │   │ Marketplace │   │     Hub     │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │     LINGUAFLOW      │                             │
│                         │  Language Learning  │                             │
│                         └─────────────────────┘                             │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌─────────────────────┐                             │
│                         │    LIS Bridge       │                             │
│                         │ (Cognitive Model)   │                             │
│                         └─────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Curriculum Curator Integration

### What It Does
- Provides curriculum codes for ACARA, IB MYP, IB DP
- Enables automatic content alignment
- Tracks curriculum coverage
- Supports cross-curricular connections

### Key Integration Points

```typescript
// Align content to curriculum
alignContent(assessment, ['ACARA', 'IB_MYP']) → CurriculumCodes[]

// Get codes for a topic
getCurriculumCodes('French', 'Year 9', 'daily routines') → CurriculumCodes[]

// Track student coverage
getCurriculumCoverage(studentId, 'ACARA', 'Year 9') → CoverageReport
```

### Example Flow
1. Teacher requests: "Create B1 assessment on daily routines"
2. LinguaFlow → Curriculum Curator: Get relevant ACARA codes
3. Returns: ACLF023, ACLF024, ACLF025
4. Assessment generated with curriculum alignment embedded

---

## 2. Tutor Booking Integration

### What It Does
- Connects students with live language tutors
- Shares LinguaFlow profile with tutors
- Receives tutor feedback back into profile
- Suggests tutors based on learning gaps

### Key Integration Points

```typescript
// Find language tutors
findLanguageTutors({
  language: 'French',
  level: 'B1',
  learnerWeaknesses: ['pronunciation'],
  nativeSpeaker: true
}) → TutorMatch[]

// Book with context
bookLanguageSession({
  tutorId,
  linguaFlowContext: {
    currentLevel: 'B1',
    challengingTopics: ['passé composé'],
    upcomingAssessment: {...}
  }
}) → Booking

// Receive feedback
receiveTutorFeedback(sessionId) → {
  areasWorkedOn,
  progressObservations,
  recommendedFocus
}
```

### Example Flow
1. LinguaFlow detects: "Pronunciation not improving after 15 AI sessions"
2. Suggests: "Consider live tutor for pronunciation coaching"
3. Shows matching native-speaker tutors
4. Student books session; tutor sees full LinguaFlow profile
5. After session, tutor feedback updates student profile

---

## 3. LIS-Scholarly Bridge Integration

### What It Does
- Connects to cognitive learner model (LIS)
- Shares affective state for adaptive learning
- Receives optimal learning window recommendations
- Enables cross-subject language connections

### Key Integration Points

```typescript
// Get knowledge gaps
getLanguageKnowledgeGaps(studentId, 'French') → {
  vocabularyGaps,
  grammarGaps,
  skillGaps
}

// Report affective state
reportAffectiveSignals({
  engagementLevel: 0.85,
  frustrationEvents: 0,
  flowMinutes: 8
})

// Get optimal learning times
getOptimalLearningWindows(studentId) → {
  bestTimeOfDay,
  currentCognitiveLoad,
  recommendedActivityTypes
}
```

### Example Flow
1. LIS reports: Student has high cognitive load from math
2. LinguaFlow receives: "Avoid complex grammar, suggest light practice"
3. UI adapts: Shows vocabulary games instead of grammar exercises
4. Student enjoys session; affective data fed back to LIS

---

## 4. Content Marketplace Integration

### What It Does
- Teachers can publish LinguaFlow content
- Browse and purchase language resources
- Learning Asset Requests for content gaps
- Quality signals from usage data

### Key Integration Points

```typescript
// Publish content
publishContent({
  type: 'assessment',
  linguaFlowContentId,
  language: 'French',
  cefrLevel: 'B1',
  usageStats: {
    timesUsed: 42,
    averageScore: 0.72
  }
}) → MarketplaceId

// Find content
findLanguageContent({
  language: 'French',
  contentType: 'conversation_scenario',
  cefrLevel: 'B1'
}) → ContentResults[]

// Request content
requestLanguageContent({
  contentType: 'assessment',
  topic: 'French subjunctive',
  cefrLevel: 'B2'
}) → RequestId
```

---

## 5. Homeschool Hub Integration

### What It Does
- Syncs family language profiles
- Supports language learning co-ops
- Finds native speaker community members
- Enables family-based learning activities

### Key Integration Points

```typescript
// Sync family languages
syncFamilyLanguageProfile({
  familyId,
  familyLanguages: [
    { language: 'French', proficiency: 'native', speakers: ['mom'] }
  ],
  childrenLearning: [
    { childId, targetLanguage: 'French', level: 'A2' }
  ]
})

// Find co-op families
findLanguageCoopFamilies({
  targetLanguage: 'French',
  maxDistanceKm: 15,
  preferNativeSpeakerFamily: true
}) → FamilyMatch[]

// Create language co-op
createLanguageCoop({
  familyIds: [...],
  language: 'French',
  format: 'conversation_club'
}) → CoopId
```

---

## 6. Scheduling Engine Integration

### What It Does
- Integrates language classes into timetables
- Schedules speaking assessments (individual slots)
- Manages language lab resources

### Key Integration Points

```typescript
// Register class for scheduling
registerLanguageClass({
  classId,
  language: 'French',
  periodsPerWeek: 4,
  requiresLanguageLab: true
})

// Schedule speaking tests
scheduleSpeakingAssessments({
  classId,
  assessmentId,
  durationMinutes: 10,
  requiresPrivateRoom: true,
  availableSlots: [...]
}) → ScheduledSlots[]
```

---

## Event Bus Integration

### Events Published by LinguaFlow

| Event | Trigger | Data |
|-------|---------|------|
| `linguaflow.level.achieved` | CEFR level up | studentId, language, newLevel |
| `linguaflow.assessment.completed` | Assessment done | scores, curriculumCodes |
| `linguaflow.streak.achieved` | Streak milestone | streakDays |
| `linguaflow.intervention.needed` | Detected struggle | interventionType, details |

### Events Consumed by LinguaFlow

| Event | Source | Response |
|-------|--------|----------|
| `lis.affective.state.changed` | LIS | Adapt difficulty |
| `tutor.session.completed` | Tutor Booking | Update profile |
| `scheduling.period.starting` | Scheduler | Prepare content |
| `homeschool.coop.meeting.scheduled` | Homeschool Hub | Prepare group content |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DATA FLOW SUMMARY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INBOUND TO LINGUAFLOW                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Curriculum codes and descriptors (Curriculum Curator)                   │
│  • Tutor feedback and session notes (Tutor Booking)                        │
│  • Cognitive state and optimal times (LIS Bridge)                          │
│  • Family language profiles (Homeschool Hub)                               │
│  • Schedule constraints (Scheduling Engine)                                │
│                                                                             │
│  OUTBOUND FROM LINGUAFLOW                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Student profiles for tutor context (Tutor Booking)                      │
│  • Affective signals and engagement (LIS Bridge)                           │
│  • Achievement and progress events (All services)                          │
│  • Published content with stats (Content Marketplace)                      │
│  • Curriculum coverage data (Curriculum Curator)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

1. **All integrations are optional** - LinguaFlow works standalone
2. **Graceful degradation** - Missing services don't break functionality
3. **Event-driven** - Loose coupling via event bus
4. **Privacy-aware** - Student consent controls data sharing
5. **Tenant-isolated** - Multi-tenant architecture throughout
