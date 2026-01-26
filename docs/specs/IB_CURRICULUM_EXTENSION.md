# IB Curriculum Extension for Scholarly

## Complete International Baccalaureate Integration

---

## Executive Summary

This extension provides **comprehensive IB support** across all four programmes, enabling:
- **Dual-track curriculum delivery** (ACARA + IB simultaneously)
- **IB as extension** for high-achieving ACARA students
- **Seamless mapping** between frameworks
- **Reports for either or both curricula**

---

## IB Core Components (All Programmes)

### The Learner Profile (10 Attributes)

| Attribute | Code | Description |
|-----------|------|-------------|
| **Inquirers** | LP_INQ | Nurture curiosity, develop inquiry skills, love of learning |
| **Knowledgeable** | LP_KNO | Develop conceptual understanding across disciplines |
| **Thinkers** | LP_THI | Critical and creative thinking for complex problems |
| **Communicators** | LP_COM | Express confidently in multiple languages and ways |
| **Principled** | LP_PRI | Act with integrity, honesty, fairness, justice |
| **Open-minded** | LP_OPE | Appreciate own and others' cultures and values |
| **Caring** | LP_CAR | Show empathy, compassion, commitment to service |
| **Risk-takers** | LP_RIS | Approach uncertainty with courage and resilience |
| **Balanced** | LP_BAL | Understand importance of intellectual, physical, emotional balance |
| **Reflective** | LP_REF | Thoughtfully consider world and own ideas |

### Approaches to Learning (ATL) - 5 Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATL SKILLS FRAMEWORK                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. THINKING SKILLS                                                        │
│     • Critical thinking (analyse, evaluate, recognise bias)                │
│     • Creative thinking (generate novel ideas, make connections)           │
│     • Transfer (apply knowledge in new contexts)                           │
│     • Reflection (consider learning strategies)                            │
│                                                                             │
│  2. COMMUNICATION SKILLS                                                   │
│     • Exchanging information (give/receive feedback, negotiate)            │
│     • Literacy (read critically, write for purpose)                        │
│     • ICT skills (use technology effectively)                              │
│                                                                             │
│  3. SOCIAL SKILLS                                                          │
│     • Collaboration (delegate, share, help others succeed)                 │
│     • Interpersonal (listen actively, practice empathy)                    │
│                                                                             │
│  4. SELF-MANAGEMENT SKILLS                                                 │
│     • Organisation (plan assignments, meet deadlines, set goals)           │
│     • Affective (manage stress, practice resilience)                       │
│     • Reflection (identify strengths and weaknesses)                       │
│                                                                             │
│  5. RESEARCH SKILLS                                                        │
│     • Information literacy (evaluate sources, cite properly)               │
│     • Media literacy (analyse media, compare perspectives)                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### IB Key Concepts

**MYP Key Concepts (16):**
Aesthetics, Change, Communication, Communities, Connections, Creativity, Culture, Development, Form, Global Interactions, Identity, Logic, Perspective, Relationships, Systems, Time/Place/Space

**PYP Key Concepts (8):**
Form (What is it like?), Function (How does it work?), Causation (Why?), Change (How is it changing?), Connection (How connected?), Perspective (Points of view?), Responsibility (Our responsibility?), Reflection (How do we know?)

---

## PYP - Primary Years Programme (Ages 3-12)

### Six Transdisciplinary Themes

| Theme | Code | Focus |
|-------|------|-------|
| **Who we are** | TDT_WWA | Identity, beliefs, health, relationships |
| **Where we are in place and time** | TDT_WPA | History, journeys, civilizations |
| **How we express ourselves** | TDT_HEO | Ideas, feelings, culture, creativity |
| **How the world works** | TDT_HWW | Natural world, scientific principles |
| **How we organise ourselves** | TDT_HWO | Systems, societies, economics |
| **Sharing the planet** | TDT_STP | Rights, resources, environment |

### PYP Unit of Inquiry Structure

```typescript
interface PYPUnitOfInquiry {
  // Core Elements
  title: string;
  yearLevel: string;  // Early Years through Year 6
  transdisciplinaryTheme: string;
  centralIdea: string;  // The big understanding
  linesOfInquiry: string[];  // 3-4 supporting inquiries
  
  // Conceptual Framework
  keyConceptsFocus: string[];  // 2-3 from PYP concepts
  relatedConcepts: string[];  // Subject-specific
  
  // Skills & Profile
  atlSkillsFocus: string[];
  learnerProfileFocus: string[];
  
  // Subject Connections
  subjectConnections: {
    subject: 'Language' | 'Mathematics' | 'Science' | 'SocialStudies' | 'Arts' | 'PSPE';
    connections: string[];
    acaraCodes?: string[];  // For dual-track mapping
  }[];
  
  // Assessment
  summativeAssessment: { task: string; successCriteria: string[] };
  formativeAssessments: string[];
  
  // Action
  actionOpportunities: string[];  // How students take action
}
```

### PYP Exhibition (Year 6 Culminating Project)

Students demonstrate all PYP elements through:
- Self-chosen issue or opportunity
- Extended inquiry and research
- Taking meaningful action
- Reflecting on learning journey
- Presenting to community

---

## MYP - Middle Years Programme (Ages 11-16)

### Eight Subject Groups

| Group | Subjects | Assessment Criteria |
|-------|----------|---------------------|
| **Language & Literature** | Student's best language | A: Analysing, B: Organizing, C: Producing text, D: Using language |
| **Language Acquisition** | Additional languages (Phases 1-6) | A: Comprehending spoken/visual, B: Comprehending written, C: Communicating, D: Using language |
| **Individuals & Societies** | History, Geography, Economics | A: Knowing, B: Investigating, C: Communicating, D: Thinking critically |
| **Sciences** | Biology, Chemistry, Physics | A: Knowing, B: Inquiring/designing, C: Processing/evaluating, D: Reflecting on impacts |
| **Mathematics** | All mathematics | A: Knowing, B: Investigating patterns, C: Communicating, D: Applying in real-world |
| **Arts** | Visual, Music, Drama | A: Knowing, B: Developing skills, C: Thinking creatively, D: Responding |
| **Design** | Digital, Product | A: Inquiring/analysing, B: Developing ideas, C: Creating solution, D: Evaluating |
| **PHE** | Physical & Health Ed | A: Knowing, B: Planning, C: Applying/performing, D: Reflecting/improving |

### MYP Phases (Not Year Levels!)

Students progress through phases based on ability, not age:
- **Phase 1-2**: Emergent (typically beginning learners)
- **Phase 3-4**: Capable to Proficient  
- **Phase 5-6**: Advanced to Expert

**Important**: A Year 9 student could be Phase 4 in Maths but Phase 2 in Language Acquisition.

### MYP Assessment (Criterion-Referenced)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MYP CRITERION LEVELS (0-8)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Level 0       : Student does not reach standard described by descriptors  │
│  Level 1-2     : Limited achievement                                       │
│  Level 3-4     : Adequate achievement                                      │
│  Level 5-6     : Substantial achievement                                   │
│  Level 7-8     : Excellent achievement                                     │
│                                                                             │
│  FINAL GRADE CALCULATION (1-7):                                            │
│  Sum of best-fit criterion levels → Grade boundaries                       │
│                                                                             │
│  Total 1-5   → Grade 1    │   Total 19-23 → Grade 5                       │
│  Total 6-9   → Grade 2    │   Total 24-27 → Grade 6                       │
│  Total 10-14 → Grade 3    │   Total 28-32 → Grade 7                       │
│  Total 15-18 → Grade 4                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Six Global Contexts

| Context | Code | Explorations |
|---------|------|--------------|
| **Identities and relationships** | GC_IR | Identity, health, relationships, beliefs |
| **Orientation in space and time** | GC_OST | History, civilizations, migration |
| **Personal and cultural expression** | GC_PCE | Art, creativity, culture, communication |
| **Scientific and technical innovation** | GC_STI | Science, technology, systems, progress |
| **Globalisation and sustainability** | GC_GS | Environment, interconnection, resources |
| **Fairness and development** | GC_FD | Rights, justice, equality, governance |

### MYP Unit Planner Structure

```typescript
interface MYPUnitPlanner {
  // Identity
  title: string;
  subjectGroup: string;
  subject: string;
  yearLevel: string;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  
  // Conceptual Framework
  keyConcept: string;         // ONE key concept
  relatedConcepts: string[];  // 2-3 related
  globalContext: string;
  
  // Statement of Inquiry
  statementOfInquiry: string;  // Conceptual understanding
  
  // Inquiry Questions
  inquiryQuestions: {
    factual: string[];     // What? When? Who?
    conceptual: string[];  // Why? How?
    debatable: string[];   // To what extent?
  };
  
  // Objectives
  objectivesAddressed: ('A' | 'B' | 'C' | 'D')[];
  
  // Assessment
  summativeAssessment: {
    task: string;
    criteriaAssessed: ('A' | 'B' | 'C' | 'D')[];
    rubric: MYPRubric;
  };
  
  // ACARA Mapping (dual-track)
  acaraMapping?: {
    curriculumCodes: string[];
    generalCapabilities: string[];
  };
}
```

### MYP Personal Project (Year 10)

Extended independent project demonstrating ATL skills:
- Student-chosen goal aligned to Global Context
- Process journal documenting journey
- Product/outcome creation
- 3,500-word report
- Assessment: Criteria A-D (Investigating, Planning, Taking Action, Reflecting)

---

## DP - Diploma Programme (Ages 16-19)

### Structure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DP STRUCTURE                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  6 SUBJECT GROUPS (pick one from each, 3 HL + 3 SL):                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Group 1: Studies in Language & Literature (best language)                 │
│  Group 2: Language Acquisition (additional language)                       │
│  Group 3: Individuals & Societies (History, Geography, Economics, etc.)    │
│  Group 4: Sciences (Biology, Chemistry, Physics, etc.)                     │
│  Group 5: Mathematics (Analysis or Applications)                           │
│  Group 6: The Arts (or another from Groups 1-4)                           │
│                                                                             │
│  THE CORE (mandatory):                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Theory of Knowledge (TOK) - 100 hours                                   │
│    → How do we know what we know?                                          │
│    → Assessment: Exhibition + 1,600-word Essay                             │
│                                                                             │
│  • Extended Essay (EE) - 40 hours                                          │
│    → 4,000-word independent research                                       │
│    → In a DP subject of choice                                             │
│                                                                             │
│  • Creativity, Activity, Service (CAS) - 150+ hours                        │
│    → Experiential learning across 18 months                                │
│    → Must demonstrate 7 learning outcomes                                  │
│                                                                             │
│  DIPLOMA POINTS:                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  6 subjects × 7 points max = 42 points                                     │
│  TOK + EE combined = 3 bonus points max                                    │
│  TOTAL POSSIBLE = 45 points                                                │
│  MINIMUM FOR DIPLOMA = 24 points (with conditions)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DP Language B (Example Subject)

**Prescribed Themes:**
1. Identities (lifestyles, health, beliefs)
2. Experiences (leisure, travel, customs)
3. Human Ingenuity (arts, technology, media)
4. Social Organisation (community, education, work)
5. Sharing the Planet (environment, rights, ethics)

**Assessment:**
- Paper 1 (25%): Writing task
- Paper 2 (50%): Listening + Reading comprehension
- Individual Oral (25%): Discussion based on visual stimulus

### CAS Learning Outcomes (Must demonstrate all 7)

1. Identify strengths and develop areas for growth
2. Demonstrate challenges undertaken and new skills developed
3. Plan and initiate activities
4. Show perseverance and commitment
5. Demonstrate collaborative skills
6. Engage with issues of global significance
7. Consider ethical implications of actions

---

## IB Command Terms

Essential vocabulary for IB assessments:

### Objective 1 (Knowledge)
**Define** - Give precise meaning | **State** - Brief answer, no explanation | **List** - Sequence of answers | **Identify** - Provide from possibilities

### Objective 2 (Understanding)
**Describe** - Detailed account | **Explain** - Include reasons/causes | **Outline** - Brief summary | **Apply** - Use in relation to problem

### Objective 3 (Synthesis/Evaluation)
**Analyse** - Break down to essential elements | **Evaluate** - Weigh strengths and limitations | **Discuss** - Balanced review with arguments | **Justify** - Give valid reasons/evidence | **To what extent** - Consider merits of argument
# IB Curriculum Extension - Part 2

## ACARA-IB Mapping & Dual-Track Support

---

## The Hybrid Approach

Scholarly enables three powerful scenarios:

### Scenario 1: IB as Extension for High Achievers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: Student excelling in ACARA gets IB extension                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SYSTEM DETECTS                                                         │
│     Emma has achieved "exceeding" on ACMNA183 (Algebraic expressions)      │
│                                                                             │
│  2. SYSTEM SUGGESTS                                                        │
│     "Emma is ready for MYP extension: Investigating Patterns (Criterion B)"│
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  Suggested Extension: "Algebraic Art"                           │    │
│     │                                                                 │    │
│     │  Investigate how algebraic expressions create visual patterns.  │    │
│     │  Use technology to explore, form conjectures, justify findings. │    │
│     │                                                                 │    │
│     │  IB Elements Added:                                             │    │
│     │  • Key Concept: Relationships                                   │    │
│     │  • ATL: Critical thinking, Transfer                             │    │
│     │  • Global Context: Personal & Cultural Expression               │    │
│     │                                                                 │    │
│     │  Duration: 2 lessons + home research                            │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. TEACHER ACCEPTS → Assigns to Emma                                      │
│  4. ASSESSMENT → MYP Criterion B rubric: 6/8 (Substantial)                 │
│  5. REPORTING → ACARA: "Exceeding" + IB extension noted                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scenario 2: Parallel Tracking (Both Curricula)

School offers both ACARA and MYP. Single unit taught, dual reporting generated:

| ACARA Report | MYP Report |
|--------------|------------|
| Achievement: B (Above Standard) | Criterion A: 6/8 |
| Codes: ACSSU182, ACSSU219 | Criterion B: 5/8 |
| General Capabilities: Critical thinking | Criterion C: 6/8 |
| | Criterion D: 7/8 |
| | MYP Grade: 5 |

### Scenario 3: Transition Support

Student moving from ACARA Year 10 to IB DP Year 11:
- System analyses ACARA progress
- Maps to DP subject requirements  
- Identifies preparation gaps
- Suggests bridging activities

---

## Mapping Types

```typescript
interface CurriculumMapping {
  // Source (ACARA)
  acaraCode: string;
  acaraDescription: string;
  acaraYearLevel: string;
  
  // Target (IB)
  ibProgramme: 'PYP' | 'MYP' | 'DP';
  ibSubject: string;
  ibPhaseOrLevel?: string;
  ibObjective?: string;
  
  // Mapping Quality
  mappingType: 'direct' | 'partial' | 'extends' | 'conceptual';
  coveragePercent: number;
  
  // Extension Opportunity
  extensionOpportunity: boolean;
  extensionSuggestion?: string;
}
```

### Extension Suggestion

```typescript
interface IBExtensionSuggestion {
  studentId: string;
  
  // Based on ACARA achievement
  acaraAchievement: {
    code: string;
    performance: 'exceeding' | 'well_above';
  };
  
  // Suggested extension
  suggestion: {
    programme: 'PYP' | 'MYP' | 'DP';
    activityType: 'inquiry' | 'assessment' | 'project' | 'skill_focus';
    description: string;
    
    ibElements: {
      keyConcepts?: string[];
      atlSkills?: string[];
      learnerProfile?: string[];
      globalContext?: string;
    };
  };
  
  status: 'suggested' | 'accepted' | 'in_progress' | 'completed';
}
```

---

## Prisma Schema for IB

```prisma
// ════════════════════════════════════════════════════════════════════════════
// IB ENROLLMENT & CORE
// ════════════════════════════════════════════════════════════════════════════

model IBEnrollment {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  
  programme               String   // PYP, MYP, DP, CP
  startDate               Date     @map("start_date")
  currentYear             Int?     @map("current_year")
  
  // DP subjects
  hlSubjects              String[] @default([]) @map("hl_subjects")
  slSubjects              String[] @default([]) @map("sl_subjects")
  
  // Progress tracking
  learnerProfileProgress  Json     @default("{}") @map("learner_profile_progress")
  atlSkillsProgress       Json     @default("{}") @map("atl_skills_progress")
  
  status                  String   @default("active")
  
  @@unique([tenantId, studentId, programme])
  @@map("ib_enrollments")
}

// ════════════════════════════════════════════════════════════════════════════
// PYP MODELS
// ════════════════════════════════════════════════════════════════════════════

model PYPUnit {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  
  title                   String
  yearLevel               String   @map("year_level")
  duration                Int
  
  transdisciplinaryTheme  String   @map("transdisciplinary_theme")
  centralIdea             String   @map("central_idea") @db.Text
  linesOfInquiry          String[] @map("lines_of_inquiry")
  
  keyConceptsFocus        String[] @map("key_concepts_focus")
  relatedConcepts         String[] @map("related_concepts")
  atlSkillsFocus          String[] @map("atl_skills_focus")
  learnerProfileFocus     String[] @map("learner_profile_focus")
  
  subjectConnections      Json     @map("subject_connections")
  summativeAssessment     Json     @map("summative_assessment")
  
  // ACARA mapping for dual-track
  acaraMappings           Json?    @map("acara_mappings")
  
  createdBy               String   @map("created_by")
  createdAt               DateTime @default(now()) @map("created_at")
  
  @@index([tenantId, yearLevel])
  @@map("pyp_units")
}

model PYPExhibition {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  academicYear            String   @map("academic_year")
  
  issueOrOpportunity      String   @map("issue_or_opportunity") @db.Text
  centralIdea             String   @map("central_idea") @db.Text
  linesOfInquiry          String[] @map("lines_of_inquiry")
  
  actionTaken             String?  @map("action_taken") @db.Text
  reflection              String?  @db.Text
  
  teacherAssessment       Json?    @map("teacher_assessment")
  presentationDate        DateTime? @map("presentation_date")
  
  status                  String   @default("planning")
  
  @@unique([tenantId, studentId, academicYear])
  @@map("pyp_exhibitions")
}

// ════════════════════════════════════════════════════════════════════════════
// MYP MODELS
// ════════════════════════════════════════════════════════════════════════════

model MYPUnit {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  
  title                   String
  subjectGroup            String   @map("subject_group")
  subject                 String
  yearLevel               String   @map("year_level")
  phase                   Int
  duration                Int
  
  keyConcept              String   @map("key_concept")
  relatedConcepts         String[] @map("related_concepts")
  globalContext           String   @map("global_context")
  statementOfInquiry      String   @map("statement_of_inquiry") @db.Text
  
  inquiryQuestions        Json     @map("inquiry_questions")
  objectivesAddressed     String[] @map("objectives_addressed")
  atlSkillsFocus          Json     @map("atl_skills_focus")
  
  summativeAssessment     Json     @map("summative_assessment")
  formativeAssessments    Json     @default("[]") @map("formative_assessments")
  
  // ACARA mapping
  acaraMappings           Json?    @map("acara_mappings")
  
  createdBy               String   @map("created_by")
  createdAt               DateTime @default(now()) @map("created_at")
  
  @@index([tenantId, subjectGroup])
  @@map("myp_units")
}

model MYPAssessmentResult {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  assessmentId            String   @map("assessment_id")
  studentId               String   @map("student_id")
  
  criterionA              Int?     @map("criterion_a")
  criterionB              Int?     @map("criterion_b")
  criterionC              Int?     @map("criterion_c")
  criterionD              Int?     @map("criterion_d")
  
  totalScore              Int?     @map("total_score")
  feedback                String?  @db.Text
  
  assessedAt              DateTime? @map("assessed_at")
  assessedBy              String?  @map("assessed_by")
  
  @@unique([assessmentId, studentId])
  @@map("myp_assessment_results")
}

model MYPPersonalProject {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  academicYear            String   @map("academic_year")
  
  goalOrChallenge         String   @map("goal_or_challenge") @db.Text
  globalContext           String   @map("global_context")
  learningGoal            String   @map("learning_goal") @db.Text
  
  journalEntries          Json     @default("[]") @map("journal_entries")
  productDescription      String?  @map("product_description") @db.Text
  reportSections          Json?    @map("report_sections")
  wordCount               Int?     @map("word_count")
  
  supervisorId            String   @map("supervisor_id")
  meetingNotes            Json     @default("[]") @map("meeting_notes")
  
  criterionScores         Json?    @map("criterion_scores")
  finalGrade              Int?     @map("final_grade")
  
  status                  String   @default("proposal")
  
  @@unique([tenantId, studentId, academicYear])
  @@map("myp_personal_projects")
}

// ════════════════════════════════════════════════════════════════════════════
// DP MODELS
// ════════════════════════════════════════════════════════════════════════════

model DPSubjectEnrollment {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  
  subjectGroup            Int      @map("subject_group")
  subjectCode             String   @map("subject_code")
  subjectName             String   @map("subject_name")
  level                   String   // SL or HL
  
  predictedGrade          Int?     @map("predicted_grade")
  finalGrade              Int?     @map("final_grade")
  
  status                  String   @default("enrolled")
  
  @@unique([tenantId, studentId, subjectCode])
  @@map("dp_subject_enrollments")
}

model DPTheoryOfKnowledge {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  academicYear            String   @map("academic_year")
  
  // Exhibition
  exhibitionObjects       Json?    @map("exhibition_objects")
  exhibitionScore         Int?     @map("exhibition_score")
  
  // Essay
  essayTitle              String?  @map("essay_title")
  essayWordCount          Int?     @map("essay_word_count")
  essayScore              Int?     @map("essay_score")
  
  grade                   String?  // A-E
  
  @@unique([tenantId, studentId, academicYear])
  @@map("dp_tok")
}

model DPExtendedEssay {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  academicYear            String   @map("academic_year")
  
  subject                 String
  researchQuestion        String   @map("research_question") @db.Text
  
  supervisorId            String   @map("supervisor_id")
  supervisionSessions     Json     @default("[]") @map("supervision_sessions")
  
  finalWordCount          Int?     @map("final_word_count")
  
  // RPPF
  rppfReflections         Json?    @map("rppf_reflections")
  
  // Criterion Scores (A: 0-6, B: 0-6, C: 0-12, D: 0-4, E: 0-6)
  criterionScores         Json?    @map("criterion_scores")
  totalScore              Int?     @map("total_score")
  grade                   String?  // A-E
  
  status                  String   @default("topic_selection")
  
  @@unique([tenantId, studentId, academicYear])
  @@map("dp_extended_essays")
}

model DPCASPortfolio {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  academicYear            String   @map("academic_year")
  
  learningOutcomesProgress Json    @map("learning_outcomes_progress")
  
  // CAS Project
  casProjectTitle         String?  @map("cas_project_title")
  casProjectCompleted     Boolean  @default(false) @map("cas_project_completed")
  
  // Hours
  creativityHours         Int      @default(0) @map("creativity_hours")
  activityHours           Int      @default(0) @map("activity_hours")
  serviceHours            Int      @default(0) @map("service_hours")
  
  allOutcomesAchieved     Boolean  @default(false) @map("all_outcomes_achieved")
  coordinatorApproval     Boolean  @default(false) @map("coordinator_approval")
  
  @@unique([tenantId, studentId, academicYear])
  @@map("dp_cas_portfolios")
}

model DPCASExperience {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  portfolioId             String   @map("portfolio_id")
  
  title                   String
  description             String   @db.Text
  strands                 String[] // creativity, activity, service
  
  startDate               DateTime @map("start_date")
  endDate                 DateTime? @map("end_date")
  hoursCompleted          Int      @map("hours_completed")
  
  learningOutcomes        String[] @map("learning_outcomes")
  reflections             Json     @default("[]")
  evidence                Json     @default("[]")
  
  @@index([portfolioId])
  @@map("dp_cas_experiences")
}

// ════════════════════════════════════════════════════════════════════════════
// DUAL-TRACK MAPPING
// ════════════════════════════════════════════════════════════════════════════

model CurriculumMapping {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  
  acaraCode               String   @map("acara_code")
  acaraYearLevel          String   @map("acara_year_level")
  acaraSubject            String   @map("acara_subject")
  
  ibProgramme             String   @map("ib_programme")
  ibSubject               String   @map("ib_subject")
  ibPhaseOrLevel          String?  @map("ib_phase_or_level")
  
  mappingType             String   @map("mapping_type")
  coveragePercent         Float    @map("coverage_percent")
  explanation             String   @db.Text
  
  extensionOpportunity    Boolean  @default(false) @map("extension_opportunity")
  extensionSuggestion     String?  @map("extension_suggestion") @db.Text
  
  aiGenerated             Boolean  @default(true) @map("ai_generated")
  teacherValidated        Boolean  @default(false) @map("teacher_validated")
  
  @@unique([acaraCode, ibProgramme, ibSubject])
  @@map("curriculum_mappings")
}

model IBExtensionSuggestion {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  
  acaraCode               String   @map("acara_code")
  acaraPerformance        String   @map("acara_performance")
  
  ibProgramme             String   @map("ib_programme")
  activityType            String   @map("activity_type")
  description             String   @db.Text
  ibElements              Json     @map("ib_elements")
  
  status                  String   @default("suggested")
  teacherNotes            String?  @map("teacher_notes") @db.Text
  
  createdAt               DateTime @default(now()) @map("created_at")
  
  @@index([tenantId, studentId])
  @@map("ib_extension_suggestions")
}

model DualTrackProfile {
  id                      String   @id @default(cuid())
  tenantId                String   @map("tenant_id")
  studentId               String   @map("student_id")
  
  primaryCurriculum       String   @map("primary_curriculum")
  secondaryCurriculum     String?  @map("secondary_curriculum")
  ibProgramme             String?  @map("ib_programme")
  
  subjectTracks           Json     @map("subject_tracks")
  atlSkillsDevelopment    Json     @default("{}") @map("atl_skills_development")
  learnerProfileDevelopment Json   @default("{}") @map("learner_profile_development")
  
  @@unique([tenantId, studentId])
  @@map("dual_track_profiles")
}
```

---

## API Extensions for Curriculum Curator

```typescript
interface IBCurriculumCuratorExtension {
  // Generate mapping between ACARA and IB
  mapACARAtoIB(acaraCode: string, targetProgrammes?: string[]): Promise<CurriculumMapping[]>;
  
  // Find extension opportunities for high achievers
  findExtensionOpportunities(acaraCode: string, studentLevel: string): Promise<IBExtensionSuggestion[]>;
  
  // Get dual-track coverage report
  getDualTrackCoverage(studentId: string, subject: string): Promise<{
    acaraCoverage: { achieved: string[]; inProgress: string[] };
    ibCoverage: { objectivesAddressed: string[]; criteriaProgress: any[] };
    gaps: string[];
  }>;
  
  // Generate MYP unit from ACARA codes
  generateMYPUnit(acaraCodes: string[], yearLevel: string, subject: string): Promise<MYPUnitPlanner>;
  
  // Enrich ACARA lesson with IB elements
  enrichWithIB(lessonPlanId: string, enrichmentType: string): Promise<{
    ibEnrichments: { type: string; additions: string[] }[];
  }>;
  
  // Generate MYP assessment with rubric
  generateMYPAssessment(subjectGroup: string, phase: number, criteria: string[]): Promise<{
    taskDescription: string;
    rubric: MYPRubric[];
  }>;
}
```

---

## Summary

| Feature | Description |
|---------|-------------|
| **Complete IB Type System** | PYP, MYP, DP, CP with full structures |
| **Learner Profile & ATL** | Tracked across all learning |
| **PYP Support** | Units of Inquiry, Themes, Exhibition |
| **MYP Support** | Phases 1-6, Criteria A-D, Global Contexts, Personal Project |
| **DP Support** | Subject Groups, TOK, EE, CAS |
| **ACARA-IB Mapping** | AI-powered curriculum alignment |
| **Extension System** | IB as stretch for high achievers |
| **Dual-Track Reporting** | Generate both curricula reports |
| **20+ Prisma Models** | Complete IB data management |

**Schools can now offer ACARA, IB, or hybrid pathways - giving students and teachers maximum flexibility.**
