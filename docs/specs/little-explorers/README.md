# Little Explorers - Early Years Education Platform

**Version:** 2.0.0  
**Module:** Scholarly Platform Integration  
**Target Users:** Teachers, Parents, Students (ages 3-7), Administrators

---

## 📖 Executive Summary

Little Explorers is a comprehensive, **AI-enabled** early years classroom management and parent communication platform. Inspired by ClassDojo and Seesaw, it's designed with one overriding goal:

> **Reduce cognitive load for teachers while creating engaging, personalized experiences for young learners.**

The platform integrates deeply with the Scholarly ecosystem, feeding data into the Intelligence Mesh for holistic student understanding across their educational journey.

---

## 🌟 Key Features

### 1. Explorer Points System (Behaviour Management)
- **Real-time positive reinforcement** with instant parent notifications
- **12+ default behaviour skills** aligned with PBIS frameworks
- **AI-powered suggestions** that observe classroom activity and recommend points
- **Group awards** for table groups and whole-class celebrations
- **Streak tracking** and milestone celebrations (10, 25, 50, 100, 250, 500, 1000 points)
- **Comprehensive analytics** with trend detection

### 2. AI-Assisted Communication
- **Class Story** - Private, Instagram-style feed for each classroom
- **School Story** - School-wide announcements and updates
- **Direct Messaging** with AI-drafted message suggestions (3 tones: warm, professional, brief)
- **Automatic Translation** across 20+ languages with AI enhancement
- **Quiet Hours** respect for parent work-life balance
- **Sentiment Analysis** to flag concerning communications
- **Emergency Alerts** that bypass all restrictions via push, SMS, and email
- **Calendar Events** with RSVP tracking

### 3. Digital Portfolios
- **Multi-media capture** (photos, videos, audio, drawings, writing samples)
- **AI-powered curriculum tagging** (EYLF, EYFS, Common Core)
- **Milestone detection** with developmental tracking across 6 areas
- **Learning activities** with multiple response types and AI feedback
- **Teacher observations** with AI enhancement suggestions
- **Progress narratives** generated for parent reports (teacher, parent, formal tones)
- **Approval workflows** for parent visibility
- **Student login** with QR codes, text codes, or picture passwords

### 4. Classroom Toolkit
- Visual timer with presets
- Noise meter with configurable thresholds
- Background music player
- Random student picker (fair distribution)
- Group maker with balanced grouping
- Directions display with voice readout

### 5. Comprehensive Reporting
- Weekly parent digests (auto-generated)
- Term progress reports with AI narratives
- Behaviour analytics with trend detection
- Engagement tracking for parents
- PDF export for formal records

---

## 🧠 AI Integration Philosophy

The AI engine is designed around five core principles:

### 1. **Proactive, Not Reactive**
The AI anticipates teacher needs rather than waiting to be asked. It monitors classroom activity and surfaces relevant suggestions at the right moment.

### 2. **Augmentation, Not Replacement**
Teachers remain in control. The AI suggests, but teachers decide. Every AI action is transparent and can be modified or rejected.

### 3. **Contextual Awareness**
Every AI interaction considers the full context: the specific classroom culture, individual student profiles, time of day, recent events, and teacher preferences.

### 4. **Safety First**
All AI-generated content passes through safeguarding checks before being shown to users or shared with parents.

### 5. **Transparent Reasoning**
AI suggestions include confidence scores and explanations, helping teachers understand and trust the recommendations.

### AI Capabilities

| Domain | AI Feature | Benefit |
|--------|-----------|---------|
| **Behaviour** | Auto-suggest points from observations | Teachers can award 5x more recognitions |
| **Behaviour** | Student insights & trend detection | Early identification of students needing support |
| **Behaviour** | Classroom insights | Understand class dynamics and patterns |
| **Communication** | Message drafting (3 tones) | Professional parent communications in seconds |
| **Communication** | Tone & sentiment analysis | Flag concerning messages for follow-up |
| **Communication** | Translation enhancement | Context-aware translations beyond machine translation |
| **Portfolio** | Curriculum tagging | Automatic alignment to EYLF/EYFS/Common Core |
| **Portfolio** | Progress narratives | Generate report content automatically |
| **Portfolio** | Milestone detection | Surface developmental achievements from observations |
| **Portfolio** | Activity feedback | Age-appropriate encouragement for student work |
| **Portfolio** | Learning recommendations | Suggest follow-up activities based on interests |
| **Safety** | Content moderation | Protect children and families |
| **Safety** | Caption generation | Safe, engaging captions with learning connections |
| **Safety** | Celebration content | Personalized achievement messages |

---

## 📁 Project Structure

```
little-explorers/
├── src/
│   ├── types/                         # TypeScript type definitions
│   │   ├── core.types.ts              # Core entities (1,257 lines)
│   │   ├── behaviour.types.ts         # Explorer Points (964 lines)
│   │   ├── communication.types.ts     # Stories, Messages (988 lines)
│   │   ├── portfolio.types.ts         # Portfolios, Activities (1,090 lines)
│   │   ├── ai.types.ts                # AI service interfaces (871 lines)
│   │   └── index.ts                   # Type exports
│   │
│   ├── infrastructure/                # Core infrastructure (767 lines)
│   │   └── index.ts                   # Logger, EventBus, Cache, BaseService
│   │
│   ├── ai/                            # AI Engine
│   │   └── ai-service.ts              # Comprehensive AI service (1,101 lines)
│   │
│   ├── services/                      # Business logic services
│   │   ├── behaviour-service.ts       # Explorer Points (936 lines)
│   │   ├── communication-service.ts   # Stories, Messages, Alerts (1,604 lines)
│   │   └── portfolio-service.ts       # Portfolios, Activities (1,517 lines)
│   │
│   ├── api/                           # REST API
│   │   └── routes.ts                  # Express routes (1,095 lines)
│   │
│   └── index.ts                       # Main exports
│
├── prisma/
│   └── schema.prisma                  # Database schema (1,103 lines)
│
├── tests/
│   └── behaviour-service.test.ts      # Service tests (925 lines)
│
├── Dockerfile                         # Production container
├── docker-compose.yml                 # Development environment
├── .env.example                       # Environment template
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
└── README.md                          # This file
```

**Total: ~14,500+ lines of production-ready TypeScript**

---

## 🔧 Technical Architecture

### Design Patterns

1. **Result<T, E> Pattern** - Explicit error handling without exceptions
2. **Repository Pattern** - Database abstraction for testability
3. **Service Pattern** - Business logic encapsulation with BaseService inheritance
4. **Event-Driven Architecture** - Cross-service communication via EventBus
5. **Multi-Tenant Isolation** - `tenantId` on all entities and queries

### Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.x (strict mode) |
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Database | PostgreSQL 15+ |
| ORM | Prisma 5.x |
| Cache | Redis 7+ |
| Event Bus | NATS (production) / In-memory (dev) |
| AI Provider | Anthropic Claude API |
| Container | Docker with multi-stage builds |

### Key Architectural Decisions

1. **Denormalization for Performance** - Student names, skill names cached on point records
2. **JSON Columns for Flexibility** - Settings, AI configs, consent records stored as JSON
3. **Soft Deletes** - Status fields instead of hard deletes for audit trails
4. **Comprehensive Indexing** - Multi-column indexes for common query patterns
5. **AI Interaction Logging** - Full audit trail of all AI operations with token counts

---

## 📊 Data Model Overview

### Core Entities

```
School (1) ─── (N) Classroom (1) ─── (N) StudentEnrollment
   │                    │                        │
   │                    │                        │
   └── Teacher ─────────┤              Student ──┘
                        │                 │
                        ├── ExplorerPoint ┤
                        │                 │
                        ├── StoryPost     ├── PortfolioItem
                        │                 │
                        ├── Conversation  ├── ActivityResponse
                        │                 │
                        ├── CalendarEvent ├── StudentMilestone
                        │                 │
                        └── EmergencyAlert└── Celebration
```

### Database Tables (30+ models)

| Category | Tables |
|----------|--------|
| **Organization** | School, Classroom, Teacher, TeacherAssignment |
| **Students** | Student, StudentEnrollment, StudentPortfolioAccess |
| **Parents** | Parent, FamilyConnection |
| **Behaviour** | BehaviourSkill, ExplorerPoint, GroupAward, AIPointSuggestion, Celebration, BehaviourStreak |
| **Communication** | StoryPost, StoryReaction, StoryComment, StoryView, Conversation, ConversationParticipant, Message, CalendarEvent, EmergencyAlert, Notification |
| **Portfolio** | PortfolioItem, PortfolioActivity, ActivityResponse, TeacherObservation, DevelopmentalMilestone, StudentMilestone, ProgressReport |
| **System** | AIInteractionLog |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)
- pnpm (recommended) or npm

### Quick Start with Docker

```bash
# Clone and navigate
cd little-explorers

# Copy environment file
cp .env.example .env
# Edit .env with your Anthropic API key

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec api npx prisma migrate deploy

# View logs
docker-compose logs -f api
```

Services available at:
- **API**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Manual Installation

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database and AI credentials

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Seed default data (optional)
pnpm prisma db seed

# Start development server
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/little_explorers"

# Cache
REDIS_URL="redis://localhost:6379"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Authentication
JWT_SECRET="your-secure-secret-key"
JWT_EXPIRES_IN="7d"

# Application
PORT=3000
NODE_ENV="development"
LOG_LEVEL="info"

# Feature Flags
FEATURE_AI_SUGGESTIONS=true
FEATURE_AI_INSIGHTS=true
FEATURE_AI_TRANSLATIONS=true
FEATURE_SAFEGUARDING_MONITOR=true
```

---

## 🌐 API Reference

### Authentication

All API requests require a Bearer token:

```bash
curl -H "Authorization: Bearer <token>" https://api.example.com/v1/behaviour/points
```

### Behaviour API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/behaviour/points` | Award points to students |
| `POST` | `/behaviour/points/quick` | Quick single-point award |
| `POST` | `/behaviour/points/group` | Award to table group |
| `POST` | `/behaviour/points/class` | Award to whole class |
| `GET` | `/behaviour/classrooms/:id/skills` | Get available skills |
| `POST` | `/behaviour/classrooms/:id/skills` | Create custom skill |
| `POST` | `/behaviour/suggestions/generate` | Generate AI suggestions |
| `GET` | `/behaviour/classrooms/:id/suggestions` | Get pending suggestions |
| `POST` | `/behaviour/suggestions/:id/accept` | Accept suggestion |
| `POST` | `/behaviour/suggestions/:id/reject` | Reject suggestion |
| `GET` | `/behaviour/students/:id/analytics` | Student analytics |
| `GET` | `/behaviour/students/:id/insights` | AI student insights |
| `GET` | `/behaviour/classrooms/:id/analytics` | Classroom analytics |
| `GET` | `/behaviour/classrooms/:id/insights` | AI classroom insights |

### Communication API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/communication/stories` | Create story post |
| `GET` | `/communication/classrooms/:id/stories` | Get classroom feed |
| `GET` | `/communication/parents/:id/feed` | Get parent's personalized feed |
| `POST` | `/communication/stories/:id/reactions` | React to story |
| `POST` | `/communication/stories/:id/comments` | Comment on story |
| `POST` | `/communication/conversations` | Start conversation |
| `GET` | `/communication/conversations` | List conversations |
| `POST` | `/communication/conversations/:id/messages` | Send message |
| `GET` | `/communication/conversations/:id/drafts` | Get AI message drafts |
| `POST` | `/communication/events` | Create calendar event |
| `GET` | `/communication/events` | Get upcoming events |
| `POST` | `/communication/events/:id/rsvp` | RSVP to event |
| `POST` | `/communication/alerts` | Send emergency alert |
| `POST` | `/communication/translate` | Translate content |

### Portfolio API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/portfolio/items` | Create portfolio item |
| `GET` | `/portfolio/students/:id/portfolio` | Get student portfolio |
| `POST` | `/portfolio/items/:id/approve` | Approve for parents |
| `POST` | `/portfolio/items/:id/highlight` | Mark as highlight |
| `POST` | `/portfolio/activities` | Create activity |
| `POST` | `/portfolio/activities/:id/publish` | Publish activity |
| `POST` | `/portfolio/activities/:id/responses` | Submit response |
| `POST` | `/portfolio/responses/:id/feedback` | Add teacher feedback |
| `POST` | `/portfolio/observations` | Create observation |
| `POST` | `/portfolio/observations/:id/convert` | Convert to portfolio item |
| `POST` | `/portfolio/milestones/:id/record` | Record milestone |
| `GET` | `/portfolio/students/:id/milestones` | Get milestone progress |
| `POST` | `/portfolio/students/:id/reports` | Generate progress report |
| `POST` | `/portfolio/reports/:id/pdf` | Generate PDF report |

---

## 📝 Code Examples

### Award Points

```typescript
import { createBehaviourService } from 'little-explorers';

const result = await behaviourService.awardPoints({
  tenantId: 'tenant_abc',
  schoolId: 'school_123',
  classroomId: 'class_456',
  awardedBy: 'teacher_789',
  studentIds: ['student_001', 'student_002'],
  skillId: 'skill_kind_hearts',
  description: 'Helped a classmate who was upset'
});

if (result.success) {
  console.log(`Awarded ${result.data.points.length} points`);
  console.log(`Triggered ${result.data.celebrationsTriggered.length} celebrations`);
}
```

### Generate AI Suggestions

```typescript
const suggestions = await behaviourService.generateAISuggestions({
  tenantId: 'tenant_abc',
  classroomId: 'class_456',
  trigger: 'teacher_observation',
  observationText: 'Emma and Jake worked together beautifully on the block tower, taking turns and encouraging each other.'
});

// Returns suggestions with confidence scores and reasoning
for (const suggestion of suggestions.data) {
  console.log(`${suggestion.suggestedSkillName}: ${suggestion.reasoning}`);
  console.log(`Confidence: ${suggestion.confidence}`);
}
```

### Create Story Post with AI Caption

```typescript
import { createCommunicationService } from 'little-explorers';

const result = await communicationService.createStoryPost({
  tenantId: 'tenant_abc',
  schoolId: 'school_123',
  classroomId: 'class_456',
  authorId: 'teacher_789',
  content: {
    text: 'Our nature walk today!',
    mediaUrls: ['https://storage.example.com/photos/nature-walk.jpg']
  },
  taggedStudentIds: ['student_001', 'student_002', 'student_003'],
  useAICaption: true  // AI will suggest engaging caption with learning connections
});
```

### Send Message with AI Draft

```typescript
// Get AI-drafted message options
const drafts = await communicationService.getMessageDrafts(
  'tenant_abc',
  'conversation_123',
  'positive_update',  // purpose
  'Emma showed great leadership today'  // context
);

// drafts.data contains:
// - warm: "Hi! I wanted to share some wonderful news about Emma..."
// - professional: "Dear Parent, I'm pleased to inform you..."
// - brief: "Quick update: Emma showed great leadership today! 🌟"

// Send chosen draft
await communicationService.sendMessage({
  tenantId: 'tenant_abc',
  conversationId: 'conversation_123',
  senderId: 'teacher_789',
  content: { type: 'text', text: drafts.data.drafts.warm },
  translationLanguages: ['es', 'zh', 'ar']  // Auto-translate for parents
});
```

### Create Portfolio Item with AI Analysis

```typescript
import { createPortfolioService } from 'little-explorers';

const result = await portfolioService.createPortfolioItem({
  tenantId: 'tenant_abc',
  schoolId: 'school_123',
  classroomId: 'class_456',
  studentId: 'student_001',
  createdBy: 'teacher_789',
  type: 'artwork',
  title: 'Self Portrait',
  content: {
    mediaUrls: ['https://storage.example.com/artwork/portrait.jpg']
  },
  useAIAnalysis: true,  // AI will tag curriculum and detect milestones
  curriculumFrameworks: ['EYLF', 'EYFS'],
  autoApprove: true
});

// AI analysis includes:
// - Suggested curriculum tags (e.g., "EYLF Outcome 5: Communication")
// - Developmental areas detected (e.g., "Fine Motor Skills")
// - Quality score and highlight recommendation
// - Potential milestones achieved
```

### Generate Progress Report

```typescript
const report = await portfolioService.generateProgressReport({
  tenantId: 'tenant_abc',
  studentId: 'student_001',
  period: 'term',
  dateRange: {
    start: new Date('2026-01-01'),
    end: new Date('2026-03-31')
  },
  includePortfolioItems: true,
  includeBehaviour: true,
  includeMilestones: true,
  audience: 'parent',  // or 'teacher', 'formal'
  tone: 'celebratory'  // or 'balanced', 'developmental'
});

// Generate PDF
const pdfUrl = await portfolioService.generateReportPDF(
  'tenant_abc',
  report.data.id
);
```

---

## 📈 Metrics & Success Criteria

### Teacher Cognitive Load Reduction

| Metric | Target | Measurement |
|--------|--------|-------------|
| Points awarded per day | 5x increase | Before/after comparison |
| Time to send parent update | < 30 seconds | With AI drafts |
| Portfolio tagging accuracy | > 85% | AI vs manual comparison |
| Observation-to-portfolio conversion | < 2 clicks | UX measurement |

### Parent Engagement

| Metric | Target |
|--------|--------|
| Daily active parents | > 70% |
| Story view rate | > 80% within 24 hours |
| Message response time | < 4 hours |
| Portfolio item reactions | > 50% |

### Student Experience

| Metric | Target |
|--------|--------|
| Daily recognition rate | 100% of students receive at least 1 point |
| Celebration frequency | 1+ milestone per week |
| Portfolio additions | 3+ items per week |
| Equitable attention | < 20% variance in points across students |

---

## 🔒 Compliance & Security

### Regulatory Compliance

- **COPPA** (Children's Online Privacy Protection Act)
- **FERPA** (Family Educational Rights and Privacy Act)
- **Australian Privacy Principles**
- **GDPR** (for data portability and right to erasure)

### Data Protection

- Minimal PII collection
- Consent tracking per data type (photo, video, location)
- Automatic data retention policies
- Parent data export capability
- Right to erasure support with cascading deletes

### Safeguarding

- AI-powered content moderation on all user-generated content
- Keyword scanning for concerning language
- Sentiment analysis flagging for follow-up
- Facial recognition consent tracking
- Non-consented faces auto-blurred in shared content
- Emergency alert system with multi-channel delivery
- Full audit logging for compliance

---

## 🔗 Scholarly Integration Points

Little Explorers integrates with the broader Scholarly ecosystem:

| Service | Integration |
|---------|-------------|
| **LIS-Scholarly Bridge** | Feed behaviour data to learner profiles |
| **Payment Service** | Premium subscriptions, school billing |
| **Content Marketplace** | Early years activity templates |
| **Trust System** | Parent verification, safeguarding checks |
| **Multi-Tenant Core** | School/district hierarchy |
| **ML Pipeline** | Advanced analytics and predictions |
| **Data Lake** | Long-term storage and analytics |

### Event Publishing

Little Explorers publishes events to the Scholarly event bus:

```typescript
// Behaviour events
'behaviour.points_awarded'
'behaviour.celebration_triggered'
'behaviour.suggestion_accepted'
'behaviour.insight_generated'

// Communication events
'communication.story_created'
'communication.message_sent'
'communication.alert_sent'
'communication.event_rsvp'

// Portfolio events
'portfolio.item_created'
'portfolio.milestone_achieved'
'portfolio.report_generated'
'portfolio.parent_engagement'
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test behaviour-service.test.ts

# Run in watch mode
pnpm test:watch
```

### Test Categories

- **Unit Tests** - Service methods, AI functions
- **Integration Tests** - Database operations, API routes
- **E2E Tests** - Full user flows

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Access database CLI
docker-compose exec db psql -U postgres -d little_explorers

# Access Redis CLI
docker-compose exec redis redis-cli

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec api npx prisma studio
```

---

## 📚 Further Documentation

- [Scholarly Platform Overview](/mnt/project/README.md)
- [Architecture Guide](/mnt/project/ARCHITECTURE.md)
- [Changelog](/mnt/project/CHANGELOG.md)

---

## 🤝 Contributing

This module follows Scholarly's contribution guidelines:

1. All changes require tests
2. TypeScript strict mode enforced
3. Result<T, E> pattern for error handling
4. Event publishing for cross-service communication
5. Comprehensive inline documentation
6. Multi-tenant isolation on all queries

---

## 📄 License

Proprietary - Chekd Pty Ltd

---

*Built with ❤️ for early years educators and the little explorers they nurture every day.*
