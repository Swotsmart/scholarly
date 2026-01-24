# SCHOLARLY PLATFORM
## Solution Architecture & Design Document

**Version:** 1.3.0  
**Date:** January 9, 2026  
**Classification:** Technical Architecture  

---

# Executive Summary

Scholarly is a comprehensive AI-powered education ecosystem. Unlike traditional education software that treats scheduling, tutoring, curriculum, and compliance as separate concerns, Scholarly weaves them together into a unified intelligent fabric. At its heart lies a simple philosophy: **every learner is unique, and technology should adapt to serve them, not the other way around.**

The platform serves multiple educational contextsâ€”from individual homeschool families seeking connection, to micro-schools navigating compliance, to established institutions managing relief teachers and timetables. What unites these diverse use cases is the underlying intelligence layer: the Learner Intelligence System (LIS) that maintains a living cognitive model of each learner, and the Curriculum Curator that understands what should be taught and how concepts connect.

This document explores the architecture in depth, explaining not just *what* each component does, but *why* it exists and how it creates value for the educators, learners, and families it serves.

---

# Table of Contents

1. [Architectural Philosophy](#architectural-philosophy)
2. [System Overview](#system-overview)
3. [Component Deep Dive](#component-deep-dive)
4. [Integration Architecture](#integration-architecture)
5. [Persona Journeys](#persona-journeys)
6. [Data Architecture](#data-architecture)
7. [Security & Compliance](#security-and-compliance)
8. [Deployment Architecture](#deployment-architecture)

---

# Architectural Philosophy

## Design Principles

### 1. Intelligence at Every Layer

Traditional education software is transactional: book a tutor, generate a timetable, check a curriculum box. Scholarly inverts this model. Every service incorporates AI that learns, predicts, and adapts. The Relief Marketplace doesn't just fill absencesâ€”it predicts them. The Curriculum Curator doesn't just store standardsâ€”it understands their semantic relationships and generates aligned content.

### 2. Multi-Tenant by Design

Education is inherently contextual. A homeschool family in rural Queensland operates differently from an urban Melbourne micro-school or a Sydney tutoring network. Every service in Scholarly accepts `tenantId` as its first parameter, ensuring complete data isolation while enabling shared infrastructure.

### 3. Event-Driven Communication

Services communicate through events rather than direct calls wherever possible. When a student completes a curriculum code in the Content Marketplace, an event flows to the LIS Bridge, which updates the Knowledge Graph, which may trigger a Predictive Intervention if the learner is struggling. This loose coupling enables independent evolution and scaling.

### 4. Explicit Error Handling

All service methods return `Result<T>` rather than throwing exceptions. This forces calling code to explicitly handle failure cases, leading to more robust integrations. The pattern looks like:

```typescript
const result = await service.someMethod(tenantId, data);
if (!result.success) {
  // Handle error explicitly
  return handleError(result.error);
}
const data = result.data;
```

### 5. Privacy-First Intelligence

The LIS Bridge demonstrates our privacy philosophy. Learners (and their parents) control exactly what data flows between systems through explicit `PrivacySettings`. A parent might allow the Knowledge Graph to inform tutor matching while keeping emotional state data private. Intelligence serves users; it never exploits them.

---

# System Overview

## The Four Pillars

Scholarly is organised around four functional pillars, each serving distinct but interconnected purposes:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         SCHOLARLY PLATFORM                                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚   FOUNDATION    â”‚  â”‚   SCHEDULING    â”‚  â”‚  INTELLIGENCE   â”‚  â”‚COMMUNITYâ”‚ â”‚
â”‚  â”‚                 â”‚  â”‚                 â”‚  â”‚                 â”‚  â”‚         â”‚ â”‚
â”‚  â”‚ â€¢ Shared Types  â”‚  â”‚ â€¢ Scheduling    â”‚  â”‚ â€¢ Curriculum    â”‚  â”‚â€¢ Home-  â”‚ â”‚
â”‚  â”‚ â€¢ Tutor Booking â”‚  â”‚   Engine        â”‚  â”‚   Curator       â”‚  â”‚  school â”‚ â”‚
â”‚  â”‚ â€¢ Content       â”‚  â”‚ â€¢ Scheduler     â”‚  â”‚ â€¢ Relief        â”‚  â”‚  Hub    â”‚ â”‚
â”‚  â”‚   Marketplace   â”‚  â”‚   Config        â”‚  â”‚   Marketplace   â”‚  â”‚â€¢ Micro- â”‚ â”‚
â”‚  â”‚                 â”‚  â”‚ â€¢ EduScrum      â”‚  â”‚ â€¢ Capacity      â”‚  â”‚  School â”‚ â”‚
â”‚  â”‚                 â”‚  â”‚   Orchestrator  â”‚  â”‚   Planning      â”‚  â”‚â€¢ LIS    â”‚ â”‚
â”‚  â”‚                 â”‚  â”‚                 â”‚  â”‚                 â”‚  â”‚  Bridge â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                    LEARNER INTELLIGENCE SYSTEM (LIS)                  â”‚  â”‚
â”‚  â”‚  Knowledge Graph â”‚ Affective â”‚ Journey â”‚ Forecast â”‚ Peer Review      â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚                         CHEKD PLATFORM CORE                           â”‚  â”‚
â”‚  â”‚  Trust â”‚ Tokens â”‚ Payments â”‚ Messaging â”‚ Events â”‚ Multi-Tenant        â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Pillar 1: Foundation (v1.0.0)

The foundation establishes core educational commerce: finding tutors and buying/selling educational content. These services can operate independently but become more powerful when integrated with intelligence layers.

### Pillar 2: Scheduling (v1.1.0)

Scheduling tackles the complex logistics of educational institutions: timetabling, agile learning management, and configuration. These services are particularly valuable for schools and micro-schools with multiple staff and students.

### Pillar 3: Intelligence (v1.2.0)

The intelligence layer adds AI capabilities: understanding curriculum at a semantic level, predicting staffing needs, and planning capacity. These services transform data into insight and insight into action.

### Pillar 4: Community (v1.3.0)

Community services bring humans together: homeschool families forming co-ops, micro-schools managing enrollment, and the bridge that connects the cognitive model to everything else.

---

# Component Deep Dive

## Foundation Services

### Shared Types (897 lines)
**Purpose:** Establish common patterns and utilities used across all services.

The Shared Types module isn't glamorous, but it's critical. It defines:

- **Base Service Class**: Every Scholarly service extends `ScholarlyBaseService`, which provides timing/logging, event publishing, caching, and the `withTiming()` wrapper that instruments all operations.

- **Result Type**: The `Result<T>` type forces explicit success/failure handling:
  ```typescript
  type Result<T> = 
    | { success: true; data: T }
    | { success: false; error: Error };
  ```

- **Jurisdiction Definitions**: Education is heavily regulated, and regulations vary by location. The `Jurisdiction` enum and `JURISDICTION_REQUIREMENTS` map capture these differences.

- **Validation Utilities**: The `Validator` class provides reusable validation for tenant IDs, required fields, positive numbers, and date ranges.

**Value Delivered:** Consistency, reliability, and reduced boilerplate across all services.

---

### Smart Tutor Booking (519 lines)
**Purpose:** Connect learners who need help with tutors who can provide it.

Finding the right tutor is more than matching subjects. The Smart Tutor Booking service considers:

- **Multi-Dimensional Matching**: Subject expertise (35%), teaching style compatibility (25%), trust score (25%), and price fit (15%) combine into a composite match score.

- **Jurisdiction-Aware Safeguarding**: Different regions have different requirements. Australia uses Working With Children Checks (WWCC), the UK uses DBS checks, Scotland uses PVG, Canada uses Vulnerable Sector Checks. The service knows which checks apply where.

- **Group Session Support**: A tutor can open a session to others, forming ad-hoc groups with dynamic pricing (group discounts automatically applied).

- **AI Profile Builder**: New tutors answer guided questions; AI extracts keywords and generates suggested bio, reducing onboarding friction.

- **Proactive Suggestions**: When integrated with LIS, the service can notice a learner struggling (without pushing specific tutors) and gently suggest support might help.

**Value Delivered:** Learners find tutors they'll actually connect with. Tutors find students who match their expertise. Parents trust the safeguarding. Everyone saves time.

---

### Content Marketplace (849 lines)
**Purpose:** Enable educators to share and monetise their best work.

Think Teachers Pay Teachers, but smarter:

- **Curriculum Alignment**: Content is tagged with curriculum codes (ACARA, UK National Curriculum, etc.), making it discoverable by teachers planning specific lessons.

- **Learning Asset Request (LAR) System**: The clever innovation. Teachers can *request* content they need ("I need engaging Shakespeare activities for reluctant Year 9 readers"). Other teachers vote on requests. Creators see what's in demand before they create.

- **Creator Economy**: Creators progress through levels (new â†’ rising â†’ established â†’ top â†’ featured) based on sales and ratings, with corresponding visibility benefits.

- **Token Integration**: Purchases earn $CHKD token rewards (1% back), connecting the marketplace to the broader Chekd economy.

**Value Delivered:** Teachers stop reinventing wheels. Creators earn from their work. The LAR system ensures supply meets actual demand.

---

## Scheduling Services

### Scheduler Config (828 lines)
**Purpose:** Make the scheduling engine configurable without code changes.

Scheduling is complex. Different schools have different needs. The Scheduler Config provides:

- **Hierarchical Configuration**: Global defaults â†’ school profile â†’ term overrides â†’ special day exceptions. Each layer can override the one above.

- **Time Structures**: Define periods, breaks, lunch slots with precise timing.

- **Constraint System**: 
  - *Hard constraints*: Cannot be violated (teacher can't be in two places)
  - *Soft constraints*: Preferably avoid (minimize gaps between classes)
  - *Custom constraints*: Tenant-specific rules with weights

- **Pre-Built Profiles**: "Small Primary School", "Large Secondary School", "Exam Period", "Staff Shortage Mode" provide sensible defaults.

- **Algorithm Tuning**: Control GA population size, crossover rate, mutation rate, iteration limits, and timeout thresholds.

**Value Delivered:** Schools customise scheduling to their unique needs without touching code. Algorithm experts tune performance without understanding education.

---

### Scheduling Engine (1,508 lines)
**Purpose:** Generate optimal timetables through multi-stage optimisation.

The engine runs a 6-stage pipeline, each stage refining the previous output:

1. **CSP (Constraint Satisfaction)**: Validates all hard constraints. If a schedule is impossible, fail fast with explanations.

2. **ILP (Integer Linear Programming)**: Mathematical optimisation to maximise objective function (typically: minimise gaps, balance teacher load).

3. **GA (Genetic Algorithm)**: Evolutionary approachâ€”generate population, evaluate fitness, select best, crossover, mutate, repeat.

4. **SA (Simulated Annealing)**: Local search starting from GA output. Allows occasional "bad" moves to escape local optima.

5. **ML (Machine Learning)**: Pattern-based enhancements learned from historical schedules that worked well.

6. **Scenario Analysis**: Run "what-if" scenarios (what if we add one more Year 10 Math class?) to support decision-making.

**Execution Times:**
- Small school (5 teachers, 100 students): 1-2 seconds
- Medium school (30 teachers, 500 students): 15-30 seconds
- Large school (100 teachers, 2000 students): 2-5 minutes

**Value Delivered:** Schedules that would take humans days to create are generated in minutes, with better optimisation than manual approaches achieve.

---

### EduScrum Orchestrator (765 lines)
**Purpose:** Bring agile methodologies to learning.

EduScrum applies Scrum principles to education:

- **Teams**: Students form teams with defined roles (Product Owner, Scrum Master, Developers). AI suggests balanced team composition.

- **Sprints**: Learning organised in 1-4 week sprints with clear goals, backlog items, and definition of done.

- **Daily Standups**: Quick sync on progress, plans, blockersâ€”AI facilitates and captures key points.

- **AI Coaching**: The AI Scrum Master provides real-time coaching based on team dynamics, progress, and patterns.

- **Retrospectives**: AI-facilitated reflection at sprint end, generating actionable improvement items.

**Value Delivered:** Students learn collaboration, self-organisation, and iterative improvementâ€”skills as valuable as content knowledge.

---

## Intelligence Services

### Curriculum Curator (2,502 lines)
**Purpose:** Understand curriculum at a semantic level, not just store it.

This is the brain that understands *what* should be taught:

- **Ingestion Engine**: Parses RDF/XML from various curriculum frameworks (ACARA, UK National Curriculum, Common Core, IB) into a normalised structure.

- **Knowledge Graph**: Builds semantic connections:
  - Concepts ("fractions", "decimals") appear across multiple standards
  - Skills ("compare", "analyse") map to Bloom's taxonomy
  - Prerequisites form chains (must understand addition before multiplication)
  - Cross-curricular links connect subjects (fractions in math relate to recipe scaling in home economics)

- **Auto-Alignment Engine**: Given content (a lesson plan, worksheet, video), uses semantic similarity and concept matching to identify which curriculum codes it addressesâ€”no manual tagging required.

- **Cross-Curricular Discovery**: Ask "what connects to ACMNA077?" and discover links to science measurement, economics percentages, and home economics recipes.

- **Lesson Plan Generator**: Given curriculum codes, year level, and preferences, generates complete lesson plans with:
  - Learning intentions and success criteria
  - Structured sections (introduction, instruction, practice, closure)
  - Differentiation (enabling, extending, ESL support)
  - Assessment opportunities
  - Resource recommendations
  - Cross-curricular connections

**Value Delivered:** Teachers stop drowning in curriculum documents. Content creators know their work is correctly aligned. Lesson planning goes from hours to minutes.

---

### Relief Marketplace (2,201 lines)
**Purpose:** Ensure classes are never uncovered, ideally before anyone knows there's a problem.

The "super-intelligent" relief system operates across seven layers:

1. **Predictive Intelligence**: ML-powered absence forecasting 14 days ahead, considering:
   - Historical patterns (this teacher often sick on Mondays)
   - Seasonal factors (flu season, hay fever)
   - External signals (local illness outbreaks)
   - Workload signals (report writing period = higher absence)
   
2. **Proactive Pool Management**: When predictions exceed threshold, automatically:
   - Pre-alert available relief teachers
   - Calculate expected availability vs. demand
   - Generate recruitment recommendations if gaps exist

3. **Autonomous Operations**: Configurable auto-actions:
   - Promote high-performing teachers to gold tier
   - Demote underperformers
   - Remove inactive pool members
   - Recruit to fill predicted gaps

4. **Intelligent Matching**: Score teachers on:
   - Subject expertise (35%)
   - School affinity (historical success at this school)
   - Response patterns (will they respond quickly enough?)
   - Reliability signals (no-show risk)

5. **Intelligent Broadcasting**: Don't just blast everyoneâ€”sequence notifications:
   - Fast strategy: prioritise quick responders
   - Quality strategy: prioritise highest performers
   - Balanced strategy: optimise for fill probability

6. **Duty of Care Validation**: Before any booking:
   - Safeguarding check (WWCC/DBS current?)
   - Registration check (teaching registration valid?)
   - Qualification check (can they actually teach this subject?)
   - Reliability assessment (any red flags?)

7. **Learning Loop**: Every outcome feeds back to improve models:
   - Predicted vs. actual ratings
   - Response times
   - Acceptance patterns
   - Student outcomes

**Value Delivered:** Schools stop scrambling for relief teachers. Students stop having uncovered classes. Relief teachers get work that matches their skills. The system gets smarter every day.

---

### Capacity Planning (200 lines)
**Purpose:** Help education leaders see around corners.

Implements a 6-phase planning cycle:

1. **Measure Current Capacity**: 
   - Staff: FTE, utilisation, absence rates, relief pool coverage
   - Facilities: Room utilisation by type, peak times, constraints
   - Time: Teaching days, periods, days lost to events
   - AI Health Score: Overall assessment with dimensions

2. **Analyse Demand**:
   - Current demand by year level, subject, special programs
   - Projected demand with multiple scenarios (base/high/low)
   - Gap analysis highlighting shortfalls

3. **Review Portfolio**:
   - Scheduled events with resource impact
   - Conflict detection (double-bookings, insufficient relief)
   - Optimisation suggestions (reschedule, combine, outsource)

4. **What-If Scenarios**:
   - Pre-built: Flu outbreak, enrollment surge, staff departure
   - Custom: Model any hypothetical situation
   - Impact analysis with feasibility assessment

5. **Resource Allocation**:
   - Optimised staff allocations with balance scoring
   - Facility allocations with peak identification
   - Budget allocations with variance tracking

6. **KPIs & Measurement**:
   - Multi-category KPIs with targets and trends
   - AI-generated commentary
   - Alerts with recommendations

**Value Delivered:** Leaders shift from reactive firefighting to proactive planning. Problems are visible before they become crises.

---

## Community Services

### Homeschool Hub (2,364 lines)
**Purpose:** End homeschool isolation and simplify compliance.

Homeschooling is often lonely and bureaucratically confusing. The Hub addresses both:

**Family Profiles**:
- Educational philosophy (Charlotte Mason, Classical, Unschooling, etc.)
- Structure level and typical schedule
- Children's learning profiles, interests, strengths
- Teaching capabilities parents bring
- Privacy controls throughout

**AI-Powered Matching**:
- Compatibility scoring across multiple dimensions:
  - Educational philosophy alignment
  - Children's age overlap
  - Geographic proximity
  - Shared interests
  - Available days alignment
- Explanation of why families match

**Co-op Formation**:
- `suggestCoopFormation()` analyses teaching capabilities across suggested families
- Recommends structure (rotating parent, specialist parent, hybrid)
- Suggests schedule based on collective availability
- Calculates viability score
- Lists considerations and potential challenges

**Excursion Planning**:
- AI suggests venues based on curriculum connections
- "If you're studying ancient Egypt, the museum has a relevant exhibit 25km away"
- Group registration with waitlist management
- Pre/post activities to maximise learning value

**Compliance Engine**:
- Jurisdiction-specific requirements (AU states, UK nations, Canadian provinces)
- Document tracking with expiry alerts
- Report generation (annual, progress, registration)
- Proactive compliance scoring and recommendations

**Community**:
- Discussion posts by category
- Shared resources with ratings
- Local network discovery

**Value Delivered:** Isolated homeschool families find their tribe. Compliance becomes manageable. Co-ops form around complementary strengths. Excursions connect to curriculum.

---

### Micro-School Service (856 lines)
**Purpose:** Make running a small school possible without an MBA.

Micro-schools (5-30 students) are growing rapidly but face unique challengesâ€”too small for traditional school software, too regulated for informal approaches:

**School Lifecycle**:
- Create with educational model, location, founder details
- Progress through statuses: forming â†’ registered â†’ active
- AI health analysis throughout

**Compliance Management**:
- Jurisdiction-specific requirements
- Registration tracking with renewal alerts
- Document management (insurance, policies, registrations)
- Staff compliance (WWCC, first aid, qualifications)
- Overall compliance score with breakdown

**Setup Guidance**:
- Step-by-step guidance customised by jurisdiction
- Estimated timeline and costs
- Warnings about common pitfalls
- Required policies and documents listed

**Enrollment System**:
- Application submission with family details
- Processing workflow (review â†’ interview â†’ trial â†’ decision)
- Waitlist management with position tracking
- Student enrollment with medical, learning profile, contacts

**Staff Management**:
- Add staff with qualifications and capabilities
- WWCC verification tracking
- First aid certification management
- Teaching registration verification

**AI Health Analysis**:
- Multi-dimensional health scoring
- Predictions (enrollment trends, financial sustainability)
- Risk identification with mitigations
- Recommendations prioritised by impact

**Value Delivered:** Passionate educators can focus on teaching rather than administration. Compliance becomes checklist, not nightmare. Parents trust the school is properly run.

---

### LIS-Scholarly Bridge (1,535 lines)
**Purpose:** Make everything smarter by connecting cognitive understanding to educational action.

The LIS maintains rich data about each learnerâ€”knowledge state, emotional state, forecasts. The Bridge makes this actionable:

**Gap-to-Support Matching**:
```
LIS identifies gap â†’ Bridge finds tutors strong in that area
                  â†’ Matches resources addressing that gap
                  â†’ Recommends approach based on learner profile
```

**Curriculum-Aligned Pathways**:
```
Target code selected â†’ Get prerequisites from Curriculum Curator
                    â†’ Check LIS for mastery of each prerequisite
                    â†’ Build pathway filling gaps first
                    â†’ Calibrate difficulty to affective state
```

**Affective-Aware Scheduling**:
```
Current state: frustrated â†’ Reduce difficulty in scheduled sessions
                        â†’ Add more breaks
                        â†’ Suggest confidence-building activities
                        â†’ Alert if state persists
```

**Predictive Interventions**:
- Scan all learners periodically
- Detect struggling patterns before crises
- Generate intervention recommendations:
  - Tutor sessions for widening gaps
  - Difficulty adjustments for engagement issues
  - Parent notifications for persistent problems
  - Break suggestions for burnout risk

**Cross-System Analytics**:
- Unified view of learning progress
- Engagement metrics over time
- Tutoring effectiveness analysis
- Resource usage patterns
- Forecast accuracy tracking
- Actionable recommendations

**Privacy-First Design**:
```typescript
privacySettings: {
  shareKnowledgeGraph: true,    // Allow gap-to-tutor matching
  shareAffectiveState: false,   // Keep emotional data private
  shareForecast: true,          // Allow predictive support
  shareWithTutors: true,        // Tutors see learning profile
  shareWithTeachers: true,      // Teachers see progress
  shareWithParents: true        // Parents see everything
}
```

**Value Delivered:** The whole becomes greater than the sum of parts. Tutors know what to focus on. Schedules respect emotional readiness. Problems are caught early. Insights drive action.

---

# Integration Architecture

## Event Flow

Services communicate primarily through events:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                              EVENT BUS (NATS)                                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                              â”‚
â”‚  scholarly.tutor.booking_created â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  LIS Bridge             â”‚
â”‚  scholarly.content.purchased â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  LIS Bridge             â”‚
â”‚  scholarly.curriculum.content_aligned â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Content Marketplace    â”‚
â”‚  scholarly.relief.absence_reported â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Capacity Planning      â”‚
â”‚  scholarly.microschool.student_enrolled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  LIS Bridge             â”‚
â”‚  scholarly.homeschool.coop_created â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Analytics              â”‚
â”‚  scholarly.bridge.intervention_generated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  Notifications          â”‚
â”‚                                                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Service Dependencies

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                                              â”‚
â”‚                            LIS Bridge                                        â”‚
â”‚                               â”‚                                              â”‚
â”‚          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                        â”‚
â”‚          â”‚                    â”‚                    â”‚                        â”‚
â”‚          â–¼                    â–¼                    â–¼                        â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚   â”‚   Curriculum â”‚    â”‚    Tutor     â”‚    â”‚   Content    â”‚                  â”‚
â”‚   â”‚    Curator   â”‚    â”‚   Booking    â”‚    â”‚ Marketplace  â”‚                  â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â”‚
â”‚          â”‚                    â”‚                    â”‚                        â”‚
â”‚          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                        â”‚
â”‚                               â”‚                                              â”‚
â”‚                               â–¼                                              â”‚
â”‚                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                        â”‚
â”‚                      â”‚ Shared Types â”‚                                        â”‚
â”‚                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                        â”‚
â”‚                                                                              â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚   â”‚   Capacity   â”‚â”€â”€â”€â–ºâ”‚    Relief    â”‚    â”‚  Scheduling  â”‚â”€â”€â”€â–ºâ”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚   â”‚   Planning   â”‚    â”‚ Marketplace  â”‚    â”‚    Engine    â”‚    â”‚ Schedulerâ”‚  â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚  Config  â”‚  â”‚
â”‚                                                                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚                                                                              â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚   â”‚  Homeschool  â”‚    â”‚ Micro-School â”‚    â”‚   EduScrum   â”‚                  â”‚
â”‚   â”‚     Hub      â”‚    â”‚   Service    â”‚    â”‚ Orchestrator â”‚                  â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â”‚
â”‚                                                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

# Persona Journeys

## Persona 1: The Learner (Sarah, 12)

Sarah is a Year 7 student who struggles with fractions but excels at creative writing.

**Her Journey:**

1. **Onboarding**: Sarah's LIS profile is created, connected via the Bridge to her Scholarly account.

2. **Daily Learning**: She works through curriculum-aligned content in the marketplace. Her progress syncs to the Knowledge Graph.

3. **Struggle Detection**: The system notices her fraction mastery plateauing. Her affective state shows increasing frustration.

4. **Intervention**: The Bridge generates a predictive intervention flagging her for support.

5. **Tutor Matching**: The gap-to-support matching finds a tutor strong in visual fraction teaching who has good rapport with similar learners.

6. **Pathway Generation**: A curriculum-aligned pathway is generated, starting with prerequisite concepts she missed, difficulty calibrated to rebuild confidence.

7. **Progress**: After three tutor sessions, her mastery increases. The success feeds back to improve matching models.

8. **Peer Opportunity**: Her creative writing strength is noticed. EduScrum suggests she could help another learner in their team project.

**Value Delivered:** Sarah gets help before she gives up. The help matches her learning style. Her strengths are recognised and utilised.

---

## Persona 2: The Parent (David)

David is a homeschool parent with three children (ages 8, 11, 14) in rural Queensland.

**His Journey:**

1. **Registration**: David registers his family in the Homeschool Hub with their educational philosophy (Charlotte Mason with outdoor focus) and location.

2. **Compliance Setup**: The system shows Queensland's homeschool requirements, tracks his registration with HEU, and alerts him when annual reports are due.

3. **Connection**: AI matching suggests three compatible families within 30km, explaining: "Similar philosophy, overlapping age ranges, all available Wednesdays."

4. **Co-op Formation**: David uses the co-op wizard. It notes one family has a mum with science background, another has a dad who's a carpenter. It suggests specialist teaching structure.

5. **Excursion Planning**: Looking for nature study resources, the system suggests a nearby wildlife sanctuary with curriculum connections to Year 4 science standards.

6. **Curriculum Tracking**: Each child's progress is tracked against ACARA codes. When David enters "completed" for a fraction unit, it syncs to their LIS profiles.

7. **Tutor Booking**: His 14-year-old needs help with chemistry. The Hub connects to Tutor Booking, finding a university student 50km away who offers online sessions.

8. **Annual Reporting**: At year end, the compliance engine generates his HEU report showing curriculum coverage across all learning areas.

**Value Delivered:** David isn't alone. Compliance is manageable. His kids socialise and learn from others' strengths. He can focus on teaching, not paperwork.

---

## Persona 3: The Tutor (Mei, University Student)

Mei is a second-year mathematics student earning money tutoring while studying.

**Her Journey:**

1. **Profile Creation**: Mei uses the AI profile builder, answering questions about her teaching approach. The system generates a compelling bio highlighting her "visual learning focus" and "patient with struggling students" traits.

2. **Verification**: Her Working With Children Check is verified. Her university enrollment confirms her qualifications.

3. **Matching**: The system matches her to learners with fraction struggles (her strength) who prefer visual explanations (her style).

4. **Booking**: Sarah's parent books a session. Mei sees (with appropriate privacy) that Sarah struggles with equivalent fractions and learns best visually.

5. **Session Prep**: The Curriculum Curator provides the curriculum codes Sarah is working toward. The Content Marketplace shows highly-rated fraction resources.

6. **Session Delivery**: Mei teaches the session. Afterward, she records outcomes.

7. **Feedback Loop**: The parent rates the session. The LIS shows Sarah's mastery increased. This positive outcome improves Mei's match score for similar learners.

8. **Earnings**: Mei earns her fee plus $CHKD token rewards for high ratings.

**Value Delivered:** Mei gets students she can actually help. Preparation is efficient because she knows what to focus on. Success builds her reputation.

---

## Persona 4: The Micro-School Founder (James)

James is a former primary teacher starting a nature-based micro-school for 12 students.

**His Journey:**

1. **Setup Guidance**: James enters his jurisdiction (NSW) and desired model. The system provides step-by-step guidance, estimated timeline (4-6 months), and startup costs.

2. **School Creation**: He creates the micro-school with his educational philosophy, outdoor focus, and initial location (a community hall with bushland access).

3. **Compliance Dashboard**: The system shows NSW requirements: NESA registration, Working With Children Checks, insurance minimums, required policies.

4. **Policy Generation**: Template policies are provided. James customises them for his context.

5. **Staff Setup**: He adds himself and a part-time assistant. The system tracks their WWCCs and first aid certifications with expiry alerts.

6. **Enrollment**: Families submit applications through the system. James reviews, schedules meet-and-greets, offers trials.

7. **First Term**: Students are enrolled. The scheduling engine helps create a timetable balancing indoor/outdoor activities.

8. **Ongoing Operations**: AI health analysis shows high parent satisfaction but flagging that enrollment is below break-even. Recommendations suggest marketing actions.

9. **Compliance Renewal**: Six months in, the system alerts that NESA registration renewal is due. It pre-fills the application with current data.

**Value Delivered:** James can start a school without a business degree. Compliance is a checklist, not a mystery. He focuses on teaching, not administration.

---

## Persona 5: The Relief Teacher (Amanda)

Amanda is a casual teacher registered with multiple schools' relief pools.

**Her Journey:**

1. **Pool Membership**: Amanda joins three schools' relief pools through the Relief Marketplace. Her profile shows subjects (primary generalist, music specialist), preferred days, and response preferences.

2. **Proactive Alert**: Tuesday evening, the system predicts above-average absences Thursday at School A (flu going around). Amanda gets a "heads up" notification.

3. **Absence Posted**: Wednesday 6am, School A posts a Year 4 absence for Thursday. Amanda is intelligently sequenced as third contact (fast responder, music capability, previous success at this school).

4. **Acceptance**: Amanda accepts within 5 minutes. The system confirms, noting this was faster than her average.

5. **Preparation**: She sees the teacher's lesson plans and curriculum focus for the day. The Curriculum Curator provides context on what Year 4 should know about fractions.

6. **Teaching Day**: Amanda teaches. At end of day, she marks completion.

7. **Feedback**: The school rates her 4.5/5. This feeds into her AI profile, improving her match score.

8. **Pool Progression**: Over time, Amanda's consistent performance leads to automatic promotion to "gold tier" at School A, giving her priority for bookings.

**Value Delivered:** Amanda gets work that matches her skills. She's prepared when she walks in. Schools trust her because the system verified her. Good performance is rewarded.

---

## Persona 6: The School Administrator (Priya)

Priya manages operations at a K-6 primary school with 400 students and 25 teachers.

**Her Journey:**

1. **Scheduling**: Term starts in 3 weeks. Priya inputs constraints (part-time teachers, specialist room availability, required subjects) and runs the scheduling engine. In 30 seconds, she has a valid timetable.

2. **Capacity Planning**: She runs the 6-phase capacity cycle. It shows Year 3 will be over-enrolled next term with no room available during peak times.

3. **Scenario Modeling**: She runs "what if we add a Year 3 class?" The system shows teacher availability gap, suggests recruitment or relief options.

4. **Relief Management**: During term, absences are posted through the Relief Marketplace. The autonomous system fills 85% within an hour.

5. **Compliance Dashboard**: Monthly compliance check shows one teacher's WWCC expiring in 60 days. Automated alert sent.

6. **Curriculum Tracking**: Teachers enter curriculum coverage. The Curriculum Curator shows gaps across year levels, informing PD planning.

7. **Event Planning**: School camp is planned using the excursion features, with curriculum connections justifying the educational value.

8. **Reporting**: End of term, KPI dashboard shows staff utilisation, relief costs, curriculum coverageâ€”all in one view.

**Value Delivered:** Priya moves from reactive to proactive. Problems are visible before they escalate. Decisions are data-informed. Administrative burden decreases.

---

# Data Architecture

## Multi-Tenancy

Every data store is partitioned by `tenantId`:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           TENANT ISOLATION                                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                              â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”‚
â”‚   â”‚  Tenant A   â”‚     â”‚  Tenant B   â”‚     â”‚  Tenant C   â”‚                   â”‚
â”‚   â”‚ (Tutoring   â”‚     â”‚ (Micro-     â”‚     â”‚ (State      â”‚                   â”‚
â”‚   â”‚  Network)   â”‚     â”‚  School)    â”‚     â”‚  Education) â”‚                   â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â”‚
â”‚         â”‚                   â”‚                   â”‚                            â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                            â”‚
â”‚                             â”‚                                                â”‚
â”‚                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”                                       â”‚
â”‚                    â”‚  tenant_id FK   â”‚                                       â”‚
â”‚                    â”‚  in every table â”‚                                       â”‚
â”‚                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                       â”‚
â”‚                                                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Data Stores

| Data Type | Store | Rationale |
|-----------|-------|-----------|
| Transactional | PostgreSQL | ACID compliance, complex queries |
| Caching | Redis | Sub-millisecond reads, TTL support |
| Events | NATS | High throughput, persistence |
| Search | Elasticsearch | Full-text, semantic search |
| Embeddings | pgvector | Similarity search for curriculum |
| Files | S3-compatible | Documents, images, exports |

## Key Entities

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           CORE ENTITIES                                      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                              â”‚
â”‚  LEARNER                    EDUCATOR                   CONTENT               â”‚
â”‚  â”œâ”€â”€ LIS Profile ID         â”œâ”€â”€ Qualifications         â”œâ”€â”€ Curriculum Codes  â”‚
â”‚  â”œâ”€â”€ Knowledge Graph        â”œâ”€â”€ WWCC Status            â”œâ”€â”€ Alignments        â”‚
â”‚  â”œâ”€â”€ Affective State        â”œâ”€â”€ Teaching Caps          â”œâ”€â”€ Ratings           â”‚
â”‚  â””â”€â”€ Privacy Settings       â””â”€â”€ Trust Score            â””â”€â”€ Sales             â”‚
â”‚                                                                              â”‚
â”‚  FAMILY                     SCHOOL                     BOOKING               â”‚
â”‚  â”œâ”€â”€ Children               â”œâ”€â”€ Locations              â”œâ”€â”€ Tutor             â”‚
â”‚  â”œâ”€â”€ Ed Philosophy          â”œâ”€â”€ Staff                  â”œâ”€â”€ Learner(s)        â”‚
â”‚  â”œâ”€â”€ Location               â”œâ”€â”€ Students               â”œâ”€â”€ Schedule          â”‚
â”‚  â””â”€â”€ Compliance             â””â”€â”€ Compliance             â””â”€â”€ Outcome           â”‚
â”‚                                                                              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

# Security & Compliance

## Authentication & Authorization

- OAuth 2.0 / OIDC for authentication
- Role-based access control (RBAC) at tenant level
- Fine-grained permissions per service operation

## Privacy

- GDPR-compliant data handling
- Explicit consent for data sharing between services
- Right to erasure implemented across all stores
- Data minimization in cross-service communication

## Child Safety

- Working With Children Check integration per jurisdiction
- Mandatory verification before any child interaction
- Audit trail of all check verifications
- Expiry monitoring with proactive alerts

## Data Encryption

- TLS 1.3 for all transit
- AES-256 for data at rest
- Key rotation policies enforced

---

# Deployment Architecture

## Container Orchestration

Each service is containerised and deployed via Kubernetes:

```yaml
scholarly/
â”œâ”€â”€ foundation/
â”‚   â”œâ”€â”€ shared-types/
â”‚   â”œâ”€â”€ tutor-booking/
â”‚   â””â”€â”€ content-marketplace/
â”œâ”€â”€ scheduling/
â”‚   â”œâ”€â”€ scheduler-config/
â”‚   â”œâ”€â”€ scheduling-engine/
â”‚   â””â”€â”€ eduscrum/
â”œâ”€â”€ intelligence/
â”‚   â”œâ”€â”€ curriculum-curator/
â”‚   â”œâ”€â”€ relief-marketplace/
â”‚   â””â”€â”€ capacity-planning/
â””â”€â”€ community/
    â”œâ”€â”€ homeschool-hub/
    â”œâ”€â”€ micro-school/
    â””â”€â”€ lis-bridge/
```

## Scaling Strategy

| Service | Scaling Trigger | Approach |
|---------|-----------------|----------|
| Tutor Booking | Request rate | Horizontal |
| Scheduling Engine | CPU utilisation | Vertical + Horizontal |
| Relief Marketplace | Absence count | Horizontal |
| Curriculum Curator | Alignment queue | Horizontal |
| LIS Bridge | Event backlog | Horizontal |

## High Availability

- Multi-AZ deployment
- Database replication with automatic failover
- Event bus clustering
- Cache replication

---

# Conclusion

Scholarly represents a new approach to education technologyâ€”one where intelligence is built in, not bolted on. Each service delivers standalone value while becoming more powerful in combination. The architecture supports diverse educational contexts from individual learners to large institutions while maintaining the flexibility to evolve.

The platform's true power emerges at the intersections:

- **LIS + Curriculum**: Understanding *what* should be taught meets understanding *how each learner thinks*
- **Relief + Capacity**: Predicting absences meets planning for them
- **Homeschool + Tutor**: Family connection meets professional support
- **Micro-School + Compliance**: Educational passion meets regulatory reality

Every line of code serves a purpose: helping learners learn, educators teach, and families navigate the complex world of education.

---

*Document prepared for Scholarly Platform v1.3.0*
*January 9, 2026*
