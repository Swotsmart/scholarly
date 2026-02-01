# Scholarly: Features and Capabilities

**The Unified Learning Nexus — A comprehensive K-12+ education platform**

Scholarly is a full-stack education technology platform built on Next.js 14, Express, Prisma, and PostgreSQL. It integrates AI-powered learning, Australian curriculum standards compliance, blockchain-based credentialing, interoperability with global EdTech standards, and collaborative learning frameworks into a single unified system.

---

## Table of Contents

1. [Learning & Curriculum](#1-learning--curriculum)
2. [Design Thinking & Entrepreneurship](#2-design-thinking--entrepreneurship)
3. [Language Learning (LinguaFlow)](#3-language-learning-linguaflow)
4. [Early Years Education (Little Explorers)](#4-early-years-education-little-explorers)
5. [AI-Powered Intelligence](#5-ai-powered-intelligence)
6. [Adaptive Learning (Golden Path)](#6-adaptive-learning-golden-path)
7. [Advanced Learning](#7-advanced-learning)
8. [Assessment & Grading](#8-assessment--grading)
9. [Digital Portfolios & Showcase](#9-digital-portfolios--showcase)
10. [Tutoring & Mentoring](#10-tutoring--mentoring)
11. [Teacher Tools & Scheduling](#11-teacher-tools--scheduling)
12. [Homeschool & Micro-Schools](#12-homeschool--micro-schools)
13. [Standards Compliance & Governance](#13-standards-compliance--governance)
14. [Self-Sovereign Identity (SSI)](#14-self-sovereign-identity-ssi)
15. [DAO Governance & Token Economy](#15-dao-governance--token-economy)
16. [Developer Marketplace](#16-developer-marketplace)
17. [Interoperability & Data Standards](#17-interoperability--data-standards)
18. [Data Lake & Analytics](#18-data-lake--analytics)
19. [Machine Learning Pipeline](#19-machine-learning-pipeline)
20. [Platform Infrastructure](#20-platform-infrastructure)
21. [Accessibility & Inclusion](#accessibility--inclusion)

---

## 1. Learning & Curriculum

### Curriculum Curator
A semantic curriculum intelligence system that ingests, understands, connects, and operationalises curriculum frameworks across multiple jurisdictions. Powered by AI, it enables teachers to work across curriculum boundaries — using frameworks like the IB to enrich and extend standard ACARA delivery, or mapping between any combination of supported curricula.

**Supported Curriculum Frameworks:**

| Framework | Jurisdiction | Format | Description |
|---|---|---|---|
| **ACARA** | Australia | RDF/XML | Australian Curriculum v9 — the primary framework for Australian schools, covering 9 learning areas, 7 general capabilities, and 3 cross-curriculum priorities |
| **IB Framework** | International | XML | All four IB programmes — PYP (ages 3-12), MYP (ages 11-16), DP (ages 16-19), and CP (career-related) — with Learner Profile attributes, Approaches to Learning (ATL) skills, and key concepts |
| **National Curriculum** | England | XML | The English National Curriculum with Key Stages, subjects, and attainment targets |
| **Common Core** | USA | XML | Common Core State Standards for Mathematics and English Language Arts |

| Capability | Description | Benefit |
|---|---|---|
| **Multi-Framework Ingestion** | Ingest any supported curriculum from RDF, XML, JSON, or custom format sources with automatic structure parsing | Schools running multiple curricula (e.g., ACARA + IB) manage both from a single platform |
| **Knowledge Graph Construction** | Builds directed graphs linking concepts, skills, strands, and content descriptions across all loaded frameworks simultaneously | A unified map of learning that transcends individual curriculum silos |
| **AI Cross-Framework Mapping** | Uses semantic embeddings and concept extraction to automatically discover equivalent content descriptions across different curricula (e.g., ACARA ACSSU177 ↔ IB MYP Sciences criterion) with similarity scoring | Teachers instantly see how IB objectives align to their ACARA requirements — and vice versa — without manual cross-referencing |
| **IB as Extension Pathway** | Identifies IB content that extends beyond ACARA requirements, enabling teachers to use IB frameworks to enrich and challenge high-achieving students | Gifted students receive internationally benchmarked extension material mapped directly to what they're already learning |
| **Dual-Track Curriculum Delivery** | Supports simultaneous delivery against two or more frameworks with reporting for either or both | IB World Schools in Australia can plan against both ACARA (for state compliance) and IB (for programme requirements) in a single lesson plan |
| **Cross-Curricular Discovery** | Discovers connections between subjects using three methods: graph traversal, semantic similarity, and concept overlap — with strength scoring and teacher validation | Reveals hidden connections (e.g., how a Year 8 Science unit on ecosystems connects to Geography sustainability, Maths data analysis, and IB MYP Global Contexts) |
| **Integrated Unit Ideas** | AI generates complete cross-curricular unit proposals with titles, subjects, curriculum codes, duration, activities, assessments, and feasibility/engagement predictions | Teachers receive ready-to-use interdisciplinary unit plans that authentically connect multiple learning areas |
| **AI Content Alignment** | Automatically aligns any piece of content to standards from any loaded framework using Bloom's taxonomy mapping, concept extraction, and embedding similarity | Upload a resource and instantly know which ACARA codes, IB objectives, and Common Core standards it addresses — rated by confidence level (primary, secondary, partial) |
| **AI Curriculum Enrichment** | Extracts key concepts, identifies common misconceptions, suggests activities, estimates cognitive load, and maps real-world applications for every content description | Every curriculum objective becomes a rich teaching resource, not just a code to tick off |
| **Bloom's Taxonomy Integration** | Automatically classifies all content descriptions against Bloom's taxonomy (Remember → Create) with associated action verbs | Teachers can deliberately plan for higher-order thinking and see the cognitive demand profile of their units |
| **Lesson Plan Generation** | AI-generated lesson plans incorporating codes from multiple frameworks, cross-curricular connections, differentiation (enabling/extending/ESL), and assessment strategies | A single lesson plan can address ACARA requirements, IB learner profile attributes, and general capabilities simultaneously |
| **General Capabilities & ATL Mapping** | Maps content to ACARA's 7 General Capabilities and IB's 5 Approaches to Learning skill categories | Develops transferable skills alongside content knowledge, with explicit tracking against both frameworks |
| **Content Repository** | Searchable library of curriculum-aligned content items with metadata, quality scores, alignment confidence, and usage analytics | Centralised content management where every resource is mapped to every relevant standard across all curricula |
| **Equivalent Code Discovery** | AI identifies equivalent objectives across frameworks with similarity scores (e.g., "ACARA ACSSU177 is 87% equivalent to IB MYP 4.5.2") | Teachers switching between curricula or schools adopting new frameworks can instantly map their existing resources |

### Course Management
A structured learning pathway system with progress tracking and milestone management.

| Capability | Description | Benefit |
|---|---|---|
| **Course Cataloguing** | Browse and search courses by subject, year level, and learning area | Students find relevant content quickly through intuitive navigation |
| **Progress Tracking** | Real-time progress dashboards showing completion rates, time spent, and mastery levels | Learners and teachers see exactly where students are in their learning journey |
| **Learning Milestones** | Structured checkpoints within courses that validate understanding before progression | Prevents knowledge gaps by ensuring prerequisite mastery |

### Project-Based Learning (PBL)
A Gold Standard PBL framework supporting collaborative, real-world project creation and management.

| Capability | Description | Benefit |
|---|---|---|
| **Project Templates** | Pre-built templates across categories (STEM, Humanities, Arts, Community, Enterprise) with phases, milestones, and deliverables | Teachers can launch PBL units in minutes rather than designing from scratch |
| **Team Formation** | AI-assisted team formation considering skill diversity, personality compatibility, and learning goals | Builds balanced teams that maximise collaboration and peer learning |
| **Phase Management** | Structured project phases (Investigate, Design, Build, Reflect, Present) with milestone tracking | Keeps students on track with clear expectations for each project stage |
| **Scaffold & Guidance** | Teacher guidance notes and student scaffolds embedded at every project phase | Differentiates support so all students can succeed regardless of starting point |
| **Deliverable Tracking** | Track individual and team deliverables with type-specific requirements (documents, prototypes, presentations, reflections) | Makes collaboration visible and accountable |

### EduScrum Orchestrator
An agile learning framework that brings Scrum methodology into the classroom for student team collaboration.

| Capability | Description | Benefit |
|---|---|---|
| **Sprint Management** | Student teams run 1-4 week learning sprints with backlogs, standups, and retrospectives | Builds real-world agile skills while structuring collaborative work |
| **Kanban Boards** | Visual task boards (To Do / In Progress / Done) for each team | Students self-manage work and see progress in real-time |
| **AI Team Coaching** | AI observes team dynamics, detects blockers, and suggests interventions | Proactive support for teams before problems escalate |
| **Burndown Charts** | Sprint velocity tracking and burndown visualisation | Teaches data-driven project management through lived experience |
| **Team Maturity Model** | Tracks team growth from Forming through Performing stages with maturity assessments | Helps teachers identify which teams need support and which are ready for more autonomy |

---

## 2. Design Thinking & Entrepreneurship

### Design & Pitch AI
A comprehensive design thinking and entrepreneurial pitching platform that guides learners through real-world problem-solving.

| Capability | Description | Benefit |
|---|---|---|
| **Design Challenges** | Structured design thinking challenges with constraints, rubrics, and real-world contexts | Develops creative problem-solving skills through guided practice |
| **Learner Journeys** | Multi-phase journeys (Empathise → Define → Ideate → Prototype → Test → Pitch) with AI coaching | Students experience the complete design thinking cycle with personalised guidance |
| **Problem Validation** | AI-assisted problem statement refinement with evidence collection and validation scoring | Ensures students tackle genuine problems with real stakeholder impact |
| **Peer Review System** | Structured peer feedback with annotation pins, AI synthesis, and growth area identification | Builds critical evaluation skills and provides diverse perspectives |
| **Pitch Deck Builder** | Slide-by-slide pitch deck creation with templates, themes, and presentation modes | Professional-quality pitch presentations that develop communication skills |
| **Rubric-Based Scoring** | Multi-criteria rubric scoring (Problem, Solution, Design, Presentation, Innovation) on 0-10 scales | Transparent, consistent assessment aligned to design thinking competencies |
| **LTI Integration** | Configuration for LTI 1.3 tool launches from external LMS platforms | Seamless integration with existing school LMS (Canvas, Blackboard, Moodle) |

### Showcase Portfolio
The terminal phase of the design journey — public-facing portfolios that celebrate student achievement.

| Capability | Description | Benefit |
|---|---|---|
| **Portfolio Builder** | Drag-and-drop portfolio creation with themes, layouts, and SEO settings | Students curate and present their best work professionally |
| **Artifact Curation** | Add design artifacts with reflections, display configurations, and version history | Demonstrates growth and metacognitive awareness |
| **Pitch Deck Embedding** | Embed interactive pitch decks directly within showcase portfolios | Complete design journey visible in one place |
| **Skill Tagging** | Tag portfolio items with categorised skills and evidence links | Skills-based evidence trail for university and employer applications |
| **Analytics Dashboard** | View counts, visitor locations, traffic sources, and item engagement metrics | Data on who's viewing portfolios helps students understand their audience |
| **Guestbook** | Visitors can leave feedback and comments (with moderation) | External validation and community engagement with student work |
| **Access Control** | Generate time-limited, password-protected sharing links | Safe sharing with specific audiences (parents, employers, universities) |
| **AI Curation Suggestions** | AI analyses work and suggests optimal presentation ordering and grouping | Helps students present their strongest narrative |

---

## 3. Language Learning (LinguaFlow)

### Core Language Learning
A comprehensive language acquisition platform supporting 7+ languages with AI-powered conversation and pronunciation, grounded in second language acquisition (SLA) research.

| Capability | Description | Benefit |
|---|---|---|
| **Vocabulary Builder** | Spaced repetition flashcard system with audio pronunciation, example sentences, and mastery tracking | Optimises memory retention using proven cognitive science techniques |
| **Grammar Engine** | Interactive grammar lessons with progressive difficulty, exercises, and rule explanations | Structured grammar acquisition from beginner to advanced levels |
| **AI Conversation Partners** | Chat with AI personas in target languages, with real-time corrections and suggestions | Unlimited speaking practice without the anxiety of real-time human interaction |
| **Progress Tracking** | CEFR-aligned progress tracking (A1→C2) across reading, writing, listening, speaking | Clear benchmarking against international language proficiency standards |
| **Heritage Speaker Pathways** | Specialised learning paths for heritage speakers with cultural context, identity affirmation, and advanced literacy | Recognises and builds on existing family language foundations |
| **Conversation Personas** | Multiple AI personas per language (café owner, travel guide, newsreader, etc.) with distinct speech patterns | Exposure to diverse registers and contexts within the target language |
| **Four-Skills Framework** | Integrated Listening, Speaking, Reading, and Writing skill development plus Cultural competency | Balanced development of all language modalities, not just grammar and vocabulary |
| **Listening Comprehension** | Adaptive audio content with speed adjustment (0.5-1.5x), accent selection, background noise levels, and dictation engine | Develops real-world listening skills across accents, speeds, and contexts |
| **Reading Comprehension** | Graded readers, text annotation, vocabulary highlighting, and reading speed targets | Progressive reading fluency with built-in comprehension support |
| **Writing Production** | Guided prompts, error correction with explanations, journaling, and essay writing (higher levels) | Structured writing development from simple messages to academic prose |
| **Cultural Competency** | Cultural context lessons, authentic media, social customs, and cross-cultural communication | Language learning embedded in real cultural understanding |
| **SLA Research Foundation** | Built on Comprehensible Input (i+1), Output Hypothesis, Interaction Hypothesis, Noticing Hypothesis, and Affective Filter theory | Every design decision backed by peer-reviewed language acquisition research |
| **Curriculum Alignment** | Maps to ACARA Languages curriculum and IB language frameworks (PYP, MYP, DP, Ab Initio) | Meets school reporting requirements for language learning areas |

### Virtual Language Immersion
Multi-tier immersive language experiences using 2D, 3D, AR, and VR technologies.

| Capability | Description | Benefit |
|---|---|---|
| **Immersion Scenarios** | Pre-built cultural scenarios (Tokyo market, Parisian café, Beijing temple, etc.) across 7+ languages | Authentic cultural contexts that make language learning meaningful |
| **Multi-Tier Rendering** | 2D illustrated, 3D rendered, AR overlay, and VR full-immersion tiers based on device capability | Works on any device from basic browser to VR headset |
| **AI Pronunciation Scoring** | Real-time phoneme-level pronunciation analysis with accuracy, fluency, and intonation metrics | Precise feedback that native speakers often can't articulate |
| **Vocabulary Acquisition** | In-context vocabulary learning within immersive scenarios with difficulty-appropriate word selection | Words learned in context are retained significantly longer than isolated vocabulary |
| **Session Management** | Timed immersion sessions with objectives, progress tracking, and debriefing | Structured practice ensures consistent skill development |

### Language Exchange
Peer-to-peer language exchange matching with native speakers across the platform.

| Capability | Description | Benefit |
|---|---|---|
| **Partner Matching** | Algorithm-based matching by target language, proficiency level, interests, and availability | Finds compatible language exchange partners automatically |
| **Exchange Sessions** | Structured conversation sessions with topic suggestions and role-switching timers | Balanced practice time for both partners in each language |
| **Exchange Profiles** | Detailed profiles showing languages offered/wanted, teaching style, and reliability ratings | Informed partner selection based on compatibility |

---

## 4. Early Years Education (Little Explorers)

### Early Years Core
A specialised learning environment for ages 3-7 with age-appropriate interactions and developmental tracking.

| Capability | Description | Benefit |
|---|---|---|
| **Child Profiles** | Detailed developmental profiles tracking cognitive, physical, social, emotional, and language domains | Holistic view of each child's development across all early years learning areas |
| **Learning Sessions** | Structured play-based learning sessions with activities, observations, and assessment points | Guided early learning that follows EYLF (Early Years Learning Framework) principles |
| **Developmental Milestones** | EYLF-aligned milestone tracking with age-appropriate expectations | Teachers and parents can track development against national benchmarks |
| **Parent Portal** | Dedicated parent interface showing child progress, session summaries, and developmental updates | Keeps families connected and informed about their child's learning journey |
| **Enrollment Management** | Digital enrollment with family information, medical details, and consent management | Streamlines the administrative burden of early years enrollment |
| **Activity Planning** | Pre-built and custom activity templates aligned to EYLF outcomes | Ensures play-based activities always connect to learning outcomes |
| **Picture Passwords** | Pre-literate authentication using image-based passwords for young children | Children can independently access the platform before they can read or type |

### Phonics Engine (Systematic Synthetic Phonics)
A structured phonics programme following the SSP methodology with 6-phase progression.

| Capability | Description | Benefit |
|---|---|---|
| **6-Phase Progression** | Structured phonics phases from letter recognition through complex vowel digraphs | Research-based progression that mirrors leading phonics programmes |
| **Phoneme Mastery Tracking** | Individual phoneme-level mastery tracking with automatic phase advancement | Precise understanding of where each child is in their phonics journey |
| **Decodable Readers** | Phase-appropriate decodable books that only use phonemes already taught | Children experience reading success from the very beginning |
| **Blending & Segmentation** | Interactive activities for blending sounds into words and segmenting words into sounds | Builds the two core skills that underpin independent reading |
| **Letter Formation** | Guided letter formation practice with directional cues and motor skill tracking | Develops handwriting alongside phonics for integrated literacy |
| **Audio Feedback** | Real-time sound production feedback for accurate phoneme articulation | Children hear correct pronunciation modelled alongside their own attempts |

### Numeracy Engine (Concrete-Pictorial-Abstract)
A mathematics foundation engine following the CPA progression methodology.

| Capability | Description | Benefit |
|---|---|---|
| **CPA Progression** | Concrete manipulatives → pictorial representations → abstract symbols | Research-proven approach that builds deep mathematical understanding |
| **Number Recognition** | Progressive number recognition from 0-20 with counting strategies and subitizing | Strong number sense that forms the foundation for all future mathematics |
| **Operations** | Addition and subtraction through manipulative visualisations and number stories | Children understand what operations mean before memorising procedures |
| **Comparison & Ordering** | Interactive activities for comparing quantities and ordering numbers | Develops relational thinking essential for algebraic reasoning |
| **Manipulative Visualisations** | Digital manipulatives (counters, ten frames, number lines, base-10 blocks) | Hands-on mathematical exploration without physical resource constraints |

### Engagement & Gamification (Little Explorers)
Age-appropriate motivation systems designed for early learners.

| Capability | Description | Benefit |
|---|---|---|
| **Thematic Worlds** | Five explorable worlds (Letters, Numbers, Nature, Space, Ocean) with episode progression | Imaginative contexts that make learning feel like an adventure |
| **Star Rewards** | Collectible star system with streak tracking and celebration animations | Gentle, positive reinforcement that encourages daily engagement |
| **Character Unlocking** | Unlock new characters and companions through learning milestones | Long-term motivation through discovery and collection |
| **Adaptive Difficulty** | Real-time difficulty adjustment targeting 75-85% success rate | Children stay in the optimal challenge zone — challenged but not frustrated |
| **Eye Tracking Integration** | Optional eye-tracking for reading behaviour analysis, fixation tracking, and visual attention mapping | Early detection of reading difficulties through objective observation |

---

## 5. AI-Powered Intelligence

### AI Integration Engine
A multi-provider AI orchestration layer supporting OpenAI, Anthropic, Google, and local models.

| Capability | Description | Benefit |
|---|---|---|
| **Multi-Provider Support** | Seamless switching between AI providers (OpenAI, Anthropic, Google, local/custom) with unified API | No vendor lock-in; best-of-breed AI for each task |
| **Chat Completion** | Streaming and non-streaming chat with system prompts, temperature control, and token management | Foundation for all AI features across the platform |
| **Embedding Generation** | Text embedding generation for semantic search, content matching, and similarity analysis | Powers intelligent content recommendation and curriculum alignment |
| **Rate Limiting & Caching** | Built-in rate limiting, response caching, and token usage tracking | Cost control and performance optimisation for AI calls |

### AI Buddy
A personalised AI learning companion with distinct pedagogical personas.

| Capability | Description | Benefit |
|---|---|---|
| **Conversational Learning** | Natural language conversations about any topic with age-appropriate explanations | Students get patient, always-available help without fear of judgement |
| **Buddy Personas** | Multiple AI roles (Tutor, Study Buddy, Coach, Mentor) with distinct interaction styles | Different support modes for different learning needs and moments |
| **Context-Aware Responses** | AI considers learner profile, recent activity, and curriculum context in every response | Personalised support that builds on what the student is actually learning |
| **Conversation History** | Full conversation persistence with search and topic threading | Students can revisit past explanations and build on previous conversations |
| **Safety Guardrails** | Content filtering, topic boundaries, and escalation to human teachers | Safe, appropriate AI interactions for all age groups |

### AI Content Studio
An AI-powered content generation suite for teachers to create curriculum-aligned materials.

| Capability | Description | Benefit |
|---|---|---|
| **Lesson Plan Generator** | Creates complete lesson plans with objectives, activities, differentiation, and assessment from minimal input | Reduces lesson planning from hours to minutes while maintaining quality |
| **Assessment Builder** | Generates assessments with multiple question types (MCQ, short answer, extended response, rubric-based) | Diverse, curriculum-aligned assessments created on demand |
| **Resource Generator** | Creates learning resources (worksheets, slides, handouts) matched to content descriptions | Fresh, targeted resources for every lesson without searching external sites |
| **Scaffolded Pathways** | AI-generated multi-stage learning pathways with checkpoints and differentiation branches | Personalised learning paths that adapt to student needs |
| **Pedagogical Approaches** | Supports multiple pedagogical models (Direct Instruction, Inquiry-Based, Collaborative, Experiential) | Teachers can match AI output to their preferred teaching methodology |

---

## 6. Adaptive Learning (Golden Path)

### Adaptation Engine
An intelligent adaptive learning system using Bayesian Knowledge Tracing and Zone of Proximal Development theory.

| Capability | Description | Benefit |
|---|---|---|
| **Bayesian Knowledge Tracing (BKT)** | Probabilistic mastery estimation using prior knowledge, learning rate, guess probability, and slip probability per skill | Precise, granular understanding of what each student actually knows |
| **Zone of Proximal Development (ZPD)** | Real-time calculation of each learner's ZPD to serve content at optimal challenge level | Content is never too easy (boring) or too hard (frustrating) |
| **Cognitive Fatigue Detection** | Monitors response patterns, time-on-task, and error rates to detect cognitive fatigue | Prevents burnout by suggesting breaks or switching activities at the right moment |
| **Mastery Progression** | Visual mastery bars across all tracked skills with detailed breakdown | Students see their growth and know exactly where to focus effort |

### Curiosity Engine
An interest-discovery system that identifies and nurtures student curiosity through learning behaviour analysis.

| Capability | Description | Benefit |
|---|---|---|
| **Interest Clustering** | Groups learning interactions into interest clusters using engagement signals (time, depth, revisits, sharing) | Discovers student interests that even the student may not be aware of |
| **Emerging Interest Detection** | Identifies nascent interests from early signals before they fully form | Enables proactive resource recommendation at the spark of curiosity |
| **Curiosity-Driven Suggestions** | Generates content and activity suggestions aligned to detected interests | Fan the flames of natural curiosity rather than forcing prescribed paths |
| **Interest Profiles** | Rich interest profiles showing strength, recency, and trajectory of each cluster | Teachers and parents understand what genuinely engages each learner |

### Multi-Objective Optimizer
A Pareto-optimal path planner that balances multiple learning objectives simultaneously.

| Capability | Description | Benefit |
|---|---|---|
| **Objective Weighting** | Adjustable sliders for mastery, engagement, curiosity, time-efficiency, and breadth objectives | Each learner's path can be tuned to their priorities and circumstances |
| **Pareto Frontier Calculation** | Tchebycheff decomposition to find optimal learning paths across competing objectives | Mathematically optimal paths, not arbitrary compromises |
| **Path Simulation** | Simulate and compare alternative learning paths before committing | Preview the trade-offs of different learning strategies |
| **Path Comparison** | Side-by-side comparison of current vs. recommended paths with projected outcomes | Data-driven decision-making about learning direction |

---

## 7. Advanced Learning

### Video Coaching
An Edthena-style lesson observation and coaching platform for professional practice development.

| Capability | Description | Benefit |
|---|---|---|
| **Lesson Recording** | Record, upload, and manage classroom lesson videos with metadata tagging | Builds a video library for reflective practice and peer learning |
| **AI-Powered Analysis** | Automatic analysis of teaching practices, questioning techniques, and student engagement | Objective feedback on teaching practice without requiring observer presence |
| **Timestamped Comments** | Coaches and peers can leave comments at specific video timestamps | Precise feedback tied to exact moments in the lesson |
| **Review Queues** | Structured review workflows for mentors, coaches, and department heads | Systematic professional development rather than ad-hoc observation |

### Peer Review
An AI-enhanced peer feedback system that develops critical evaluation skills.

| Capability | Description | Benefit |
|---|---|---|
| **Assignment Management** | Create review assignments with specific criteria and rubrics | Structured peer feedback aligned to learning objectives |
| **Anonymous Reviews** | Optional anonymity to encourage honest, constructive feedback | Reduces social pressure and improves feedback quality |
| **AI Feedback Quality Check** | AI evaluates peer reviews for specificity, constructiveness, and actionability | Ensures students learn to give useful feedback, not just superficial comments |
| **Review Synthesis** | AI synthesises multiple peer reviews into consolidated feedback summaries | Students receive coherent, integrated feedback rather than fragmented comments |

### Industry Experience
A work-based learning (WBL) placement management system connecting students with Australian industry partners.

| Capability | Description | Benefit |
|---|---|---|
| **Opportunity Listings** | Searchable catalogue of industry placements, internships, and mentoring opportunities | Students discover real-world career pathways aligned to their interests |
| **Partner Network** | Integrated Australian industry partners (CSIRO, BHP, ABC, major universities, etc.) | Access to prestigious organisations for authentic workplace learning |
| **Application Management** | End-to-end application tracking with status updates and document management | Professional application experience that builds career readiness skills |
| **Placement Tracking** | Hours logging, supervisor feedback, competency sign-off, and reflection journals | Verified evidence of workplace learning for portfolios and transcripts |

### Professional Development Hub
An AITSL-aligned professional development system for educators.

| Capability | Description | Benefit |
|---|---|---|
| **PD Course Library** | Curated professional development courses aligned to AITSL Teacher Standards | Targeted PD that directly supports teacher registration and career progression |
| **AITSL Standards Mapping** | Every PD activity maps to specific AITSL Professional Standards for Teachers | Simplifies evidence collection for teacher accreditation and renewal |
| **Certificate Generation** | Automatic certificates upon course completion with NESA/TQI hour tracking | Eliminates manual PD record-keeping for teacher registration |
| **Enrollment Management** | Self-service enrollment with manager approval workflows and waitlisting | Schools can manage PD budgets and ensure equitable access |

### PBL Framework (Gold Standard)
An implementation of the Buck Institute's Gold Standard PBL model with Australian curriculum integration.

| Capability | Description | Benefit |
|---|---|---|
| **Challenge-Based Projects** | Real-world challenges with driving questions, entry events, and authentic audiences | Students work on problems that matter, with real stakeholders |
| **Phase Stepper** | Visual progress through Investigate → Design → Build → Reflect → Present phases | Clear structure that keeps students oriented within long-term projects |
| **Cross-Curricular Integration** | Projects that span multiple learning areas with explicit curriculum mapping | Deep learning that mirrors real-world interdisciplinary problem-solving |
| **Portfolio Integration** | Completed projects automatically feed into digital portfolios with reflection prompts | Seamless evidence trail from project work to portfolio presentation |

---

## 8. Assessment & Grading

### Teacher Grading Hub
A centralised grading workspace with rubric-based scoring across multiple assessment types.

| Capability | Description | Benefit |
|---|---|---|
| **Pitch Grading** | Rubric-based scoring for pitch presentations (Problem, Solution, Design, Presentation, Innovation) on 0-10 scales | Consistent, transparent assessment of entrepreneurial presentations |
| **Portfolio Grading** | Criteria-based scoring for portfolios (Curation, Reflection, Growth, Presentation) | Structured evaluation that goes beyond surface-level portfolio review |
| **Batch Grading** | Process multiple submissions efficiently with inline rubrics and comment banks | Reduces grading time while improving feedback quality |
| **Grade Analytics** | Distribution charts, class averages, and grade trend analysis | Data-driven insights into student performance and assessment calibration |

### Review Management
A structured peer and teacher review workflow system.

| Capability | Description | Benefit |
|---|---|---|
| **Reviewer Assignment** | Manual and AI-assisted student-to-reviewer assignment with conflict detection | Fair, balanced review allocation that avoids friendship bias |
| **Bulk Assignment** | One-click assignment of reviewers across entire cohorts | Efficient setup for large-scale peer review activities |
| **Review Progress Tracking** | Dashboard showing completion rates, pending reviews, and overdue items | Teachers can intervene before deadlines when reviews are at risk |

---

## 9. Digital Portfolios & Showcase

### Digital Portfolio System
A comprehensive portfolio management system for documenting learning journeys and achievements.

| Capability | Description | Benefit |
|---|---|---|
| **Artifact Management** | Upload, categorise, and tag learning artifacts (documents, images, videos, code, designs) with metadata | All student work in one searchable, organised repository |
| **Learning Goals** | SMART goal setting with progress tracking, milestones, and reflection prompts | Develops self-directed learning skills and metacognitive awareness |
| **Learning Journeys** | Visual timeline of learning milestones, achievements, and growth moments | Compelling narrative of growth that goes beyond grades |
| **Achievement Badges** | Gamified achievement system with criteria-based badge awards | Motivation through recognition of diverse accomplishments |
| **Reflection Tools** | Structured reflection prompts that encourage deep thinking about learning processes | Builds metacognitive skills that transfer across all learning areas |

---

## 10. Tutoring & Mentoring

### Tutor Booking Platform
A jurisdiction-aware tutoring marketplace connecting learners with qualified tutors.

| Capability | Description | Benefit |
|---|---|---|
| **Tutor Discovery** | Search and filter tutors by subject, year level, qualifications, ratings, and availability | Parents and students find the right tutor quickly and confidently |
| **AI-Powered Matching** | Algorithm that considers learning style, goals, location, and compatibility for tutor recommendations | Better tutor-student matches lead to better learning outcomes |
| **Booking Management** | Calendar-based booking with recurring sessions, rescheduling, and cancellation policies | Flexible scheduling that works for families and tutors |
| **Session Management** | Video session support with shared whiteboards, resource sharing, and session recording | Full-featured online tutoring without third-party tools |
| **Jurisdiction Compliance** | Working With Children Check verification and jurisdiction-specific requirements per Australian state/territory | Ensures all tutors meet legal safeguarding requirements |
| **Profile Builder** | Guided tutor profile creation with qualification verification and sample session planning | Quality assurance for the tutor marketplace |
| **Pricing & Payments** | Transparent pricing with currency support, booking deposits, and cancellation refunds | Fair, clear financial arrangements for all parties |

---

## 11. Teacher Tools & Scheduling

### Scheduling Engine
An AI-powered timetabling system that handles complex constraint satisfaction for school scheduling.

| Capability | Description | Benefit |
|---|---|---|
| **Timetable Generation** | AI-generated timetables respecting teacher preferences, room availability, and subject constraints | Produces valid timetables that would take humans weeks to create manually |
| **Constraint Management** | Define teacher preferences, room requirements, time blocks, and subject sequencing rules | Flexible enough to handle the unique constraints of any school |
| **Department/Year Filters** | View and manage timetables by department, year level, or individual teacher | Multiple views for different stakeholders (admin, HoD, individual teacher) |
| **Real-Time Adjustments** | Drag-and-drop timetable modifications with automatic conflict detection | Quick adjustments when circumstances change without breaking the whole timetable |

### Relief Marketplace
A super-intelligent relief teacher management system with AI-powered absence prediction.

| Capability | Description | Benefit |
|---|---|---|
| **Absence Prediction** | AI predicts likely teacher absences using historical patterns, health data, and calendar events | Proactive relief planning instead of reactive scrambling |
| **Relief Teacher Pool** | Managed pool of qualified relief teachers with profiles, availability, and school familiarity | Pre-vetted relief teachers who know your school culture |
| **Intelligent Booking** | Automated relief teacher matching based on subject expertise, availability, and school familiarity | Best-match relief coverage with minimal admin effort |
| **Coverage Analytics** | Statistics on absence patterns, coverage rates, cost per absence, and relief teacher performance | Data to inform staffing decisions and reduce relief costs |

### Capacity Planning
Strategic resource planning for schools managing facilities, staff, and enrolments.

| Capability | Description | Benefit |
|---|---|---|
| **Room Management** | Inventory of rooms with capacity, equipment, AV facilities, and booking status | Optimise space utilisation across the school |
| **Resource Allocation** | Match classes to optimal rooms based on size, equipment needs, and accessibility requirements | Every class in the right space with the right resources |
| **Constraint Editing** | Visual editor for scheduling constraints (teacher preferences, room conflicts, time blocks) | Non-technical staff can manage complex scheduling rules |

### Teacher Dashboard & Class Management
A comprehensive teacher workspace with real-time class oversight.

| Capability | Description | Benefit |
|---|---|---|
| **Class Overview** | At-a-glance class management with student lists, attendance, and progress summaries | One screen tells teachers everything about their classes |
| **Student Profiles** | Individual student views with performance history, goals, and intervention records | Informed, personalised teaching decisions for every student |
| **Challenge Management** | Create, assign, and track design thinking challenges with multi-section configuration forms | Structured project assignment that maintains pedagogical rigour |
| **Journey Tracking** | Monitor student progress through multi-phase learning journeys | Identify students who are stuck and intervene before they disengage |
| **Report Generation** | Generate class, student, and cohort reports with customisable templates | Professional reports for parent-teacher conferences and administration |

---

## 12. Homeschool & Micro-Schools

### Homeschool Hub
A family-centred learning management system for home educators with curriculum guidance.

| Capability | Description | Benefit |
|---|---|---|
| **Family Dashboard** | Multi-child dashboard showing each child's schedule, progress, and upcoming activities | Busy homeschool parents see everything they need on one screen |
| **Curriculum Planner** | Year/term planning tools with ACARA curriculum alignment and subject coverage tracking | Ensures homeschool programs meet state registration requirements |
| **Resource Library** | Searchable library of curriculum-aligned resources with bookmarking and category filters | Quality resources that meet Australian curriculum standards without expensive textbooks |
| **Progress Reporting** | Automated progress reports suitable for state/territory homeschool registration requirements | Simplifies the compliance burden that homeschool families face |

### Micro-Schools
A discovery and management platform for micro-school communities.

| Capability | Description | Benefit |
|---|---|---|
| **School Directory** | Searchable listing of micro-schools with location, size, philosophy, and curriculum focus | Families discover alternative education options that match their values |
| **School Profiles** | Detailed school pages with facilities, teachers, curriculum approach, and enrolment information | Informed school choice with comprehensive information |
| **Application Management** | End-to-end application tracking with status badges, timelines, and document uploads | Streamlined enrolment process for micro-school operators and families |
| **Community Features** | Connect micro-school families for resource sharing, events, and collaborative activities | Builds community among small-school families who can feel isolated |

---

## 13. Standards Compliance & Governance

### Standards Compliance Engine
A comprehensive Australian education standards compliance system covering ACARA, AITSL, HES, and AI ethics.

| Capability | Description | Benefit |
|---|---|---|
| **ACARA Curriculum Alignment** | Automated alignment checking against Australian Curriculum content descriptions, achievement standards, and general capabilities | Ensures every learning activity maps to mandated curriculum requirements |
| **AITSL Teacher Standards** | Assessment and verification of teacher practices against the 7 AITSL Professional Standards | Supports teacher accreditation, renewal, and professional growth |
| **Higher Education Standards (HES)** | Compliance monitoring against TEQSA Higher Education Standards Framework | Ready for integration with higher education pathway programs |
| **Schools4Tomorrow (ST4S)** | Data classification, privacy assessment, and security control verification | Meets Australian schools data protection and privacy requirements |
| **AI Ethics Compliance** | Assessment against Australia's AI Ethics Principles (fairness, transparency, accountability, privacy, safety) | Responsible AI deployment that meets community expectations |
| **AI in Schools Compliance** | Specific checks for AI usage in educational settings (content safety, bias detection, age-appropriateness) | Safe, ethical AI interactions for students of all ages |
| **Compliance Dashboards** | Visual dashboards showing compliance progress across all frameworks with actionable remediation paths | At-a-glance compliance status for school leaders and administrators |
| **Audit Reports** | Detailed audit reports with expandable requirement checklists and evidence trails | Audit-ready documentation that simplifies regulatory reviews |

---

## 14. Self-Sovereign Identity (SSI)

### Decentralised Identity (DID) System
W3C DID Core 1.0 compliant decentralised identity management.

| Capability | Description | Benefit |
|---|---|---|
| **DID Creation & Management** | Create and manage W3C-compliant Decentralised Identifiers (did:key, did:web, did:ion) | Users own their identity — not controlled by any single institution |
| **Key Management** | Cryptographic key generation, rotation, and revocation with multiple key types (Ed25519, P-256, RSA) | Military-grade identity security with user-controlled keys |
| **DID Resolution** | Resolve any DID to its DID Document with service endpoints, verification methods, and metadata | Interoperable identity verification across institutions and platforms |
| **DID Document Publishing** | Publish and update DID Documents to the appropriate method-specific registry | Portable identity that works beyond the Scholarly platform |

### Verifiable Credentials
W3C Verifiable Credentials Data Model v2.0 implementation for tamper-proof digital certificates.

| Capability | Description | Benefit |
|---|---|---|
| **Credential Issuance** | Issue verifiable credentials for academic achievements, qualifications, skills, and badges | Tamper-proof digital certificates that can be instantly verified |
| **Credential Verification** | Cryptographic verification of credential authenticity, issuer identity, and revocation status | Employers and institutions can verify credentials in seconds, not weeks |
| **Credential Types** | Academic transcripts, course completions, skill badges, professional certifications, identity attestations | Comprehensive credentialing across all achievement types |
| **Selective Disclosure** | Share specific credential attributes without revealing the full credential | Privacy-preserving verification (prove age without revealing birthdate) |

### Digital Wallet
A secure credential wallet for managing and sharing verifiable credentials.

| Capability | Description | Benefit |
|---|---|---|
| **Credential Storage** | Secure local and cloud storage of verifiable credentials and DIDs | All credentials in one secure place, accessible anywhere |
| **Presentation Creation** | Create verifiable presentations combining multiple credentials for specific verification requests | Tailor credential sharing to exactly what's needed for each situation |
| **Backup & Recovery** | Encrypted backup and recovery of wallet contents | Never lose credentials due to device loss or failure |
| **Wallet Status Dashboard** | Overview of wallet health, credential count, recent activity, and security status | Users stay in control of their digital identity |

---

## 15. DAO Governance & Token Economy

### DAO Governance
A decentralised autonomous organisation framework for community-driven platform governance.

| Capability | Description | Benefit |
|---|---|---|
| **Proposal System** | Create, discuss, and vote on platform governance proposals with quorum requirements | Democratic, transparent platform evolution driven by the community |
| **Liquid Democracy** | Delegate voting power to trusted community members with topic-specific delegation | Combines direct democracy with expert representation |
| **Voting Mechanisms** | Multiple voting types (simple majority, super-majority, quadratic, conviction) | Right voting mechanism for each type of decision |
| **Delegate Profiles** | Searchable delegate directory with voting history, expertise, and reliability scores | Informed delegation based on track record and expertise |
| **Treasury Management** | Community treasury with allocation tracking, revenue streams, and transaction history | Transparent financial governance with community oversight |
| **Proposal Categories** | Curriculum, Platform, Policy, Budget, Technical, Community proposal types with category-specific workflows | Streamlined governance processes tailored to decision type |

### Token Economy (EDU-Nexus)
A blockchain-based token economy for incentivising platform participation and recognising achievement.

| Capability | Description | Benefit |
|---|---|---|
| **EDU-Nexus Tokens** | Platform utility token for governance, staking, rewards, and marketplace transactions | Unified incentive system that rewards all forms of contribution |
| **Staking Pools** | Multiple staking pools (Governance, Content Creation, Learning, Community) with variable APY | Passive rewards for committed community members |
| **Achievement NFTs** | Mint NFTs for academic achievements, project completions, and community contributions | Unique, collectible recognition that's cryptographically verifiable |
| **Reward Distribution** | Automated token rewards for learning milestones, content creation, peer reviews, and governance participation | Aligned incentives that reward the behaviours the community values |
| **Transaction History** | Complete token transaction ledger with filtering and export | Full transparency on token movements and rewards |

---

## 16. Developer Marketplace

### App Marketplace
An open marketplace for third-party educational applications and integrations.

| Capability | Description | Benefit |
|---|---|---|
| **App Discovery** | Browse and search educational apps across 8+ categories (Learning Tools, Assessment, Communication, Analytics, etc.) | Schools discover best-in-class tools that integrate with Scholarly |
| **App Detail Pages** | Comprehensive app pages with descriptions, screenshots, reviews, changelogs, and permission requirements | Informed purchasing decisions with full transparency |
| **Category Browsing** | Organised app categories with filtering, sorting, and featured selections | Find the right tool quickly even in a large marketplace |
| **User Reviews & Ratings** | Community reviews with star ratings and detailed feedback | Peer recommendations from educators who've used the tools |

### Developer Portal
Tools and resources for third-party developers to build on the Scholarly platform.

| Capability | Description | Benefit |
|---|---|---|
| **App Management** | Dashboard for managing published apps with version control and update submissions | Streamlined app lifecycle management for developers |
| **Revenue Analytics** | Revenue charts, download statistics, and payout tracking | Clear visibility into marketplace performance and earnings |
| **API Documentation** | Comprehensive API docs for integration with Scholarly's services | Easy onboarding for developers building educational tools |

### Community Hub
A community-driven feature request and bounty system.

| Capability | Description | Benefit |
|---|---|---|
| **Feature Requests** | Community members propose and vote on new features | Platform development guided by actual user needs |
| **Bounty System** | Fund development bounties for desired features with progress tracking | Community-funded development of high-priority features |
| **Funding Progress** | Visual funding progress bars with contributor counts | Transparent crowdfunding for platform improvements |

---

## 17. Interoperability & Data Standards

### LTI Advantage 1.3
Full implementation of the 1EdTech LTI Advantage specification for tool and platform interoperability.

| Capability | Description | Benefit |
|---|---|---|
| **Platform Registration** | Register external LTI platforms (Canvas, Blackboard, Moodle, Brightspace) with OAuth 2.0 configuration | Two-click integration with any LTI 1.3 compliant LMS |
| **Tool Registration** | Register Scholarly tools for launch from external platforms | Scholarly content accessible from within existing school LMS |
| **Deep Linking** | LTI Deep Linking for content selection and placement within external platforms | Teachers place Scholarly activities directly into their course pages |
| **Names & Roles** | Access roster information from connected platforms via NRPS | Automatic user provisioning and role synchronisation |
| **Assignment & Grade Services** | Send grades back to connected platforms via AGS | Grades flow seamlessly between Scholarly and the school's gradebook |

### OneRoster 1.2
Complete OneRoster 1.2 implementation for student information system (SIS) data exchange.

| Capability | Description | Benefit |
|---|---|---|
| **SIS Integration** | Connect to any OneRoster 1.2 compliant SIS (TASS, Synergetic, Compass, SIMON) | Automatic student, class, and teacher data synchronisation |
| **Bulk Data Sync** | Full and delta sync of users, classes, enrolments, and demographics | Always up-to-date data without manual entry |
| **Field Mapping** | Configurable field mapping between SIS fields and Scholarly attributes | Flexible enough to handle any school's data structure |
| **Sync History** | Detailed sync job history with success/failure counts, error logs, and timing | Full audit trail of all data exchanges |

### CASE Network
Competency and Academic Standards Exchange (CASE) for standards framework management.

| Capability | Description | Benefit |
|---|---|---|
| **Framework Browser** | Collapsible tree view of standards frameworks with search and navigation | Intuitive exploration of complex standards hierarchies |
| **Item Search** | Full-text search across all standards framework items | Find any standard quickly across ACARA, AITSL, IB, or custom frameworks |
| **Association Mapping** | Link standards items to content, assessments, and learning activities | Traceable standards alignment from activity to framework |
| **Framework Import/Export** | Import and export standards frameworks in CASE JSON format | Share standards with other CASE-compliant systems |

### CLR 2.0 / Open Badges 3.0
Comprehensive Learner Record and Open Badges implementation for portable achievement recognition.

| Capability | Description | Benefit |
|---|---|---|
| **Badge Definitions** | Create and manage Open Badges 3.0 compliant badge definitions with criteria and evidence requirements | Standards-compliant digital badges that work everywhere |
| **Badge Issuance** | Issue badges to learners with evidence links and verification endpoints | Instant, verifiable recognition of achievement |
| **CLR Assembly** | Assemble Comprehensive Learner Records from multiple credential sources | Complete, portable learner records that travel with the student |
| **Verification** | Cryptographic badge and CLR verification with revocation checking | Instant, trustworthy credential verification for employers and institutions |

### Ed-Fi ODS/API v7
Integration with the Ed-Fi Operational Data Store for US education data exchange.

| Capability | Description | Benefit |
|---|---|---|
| **Connection Configuration** | Configure Ed-Fi ODS connections with API key/secret and endpoint management | Straightforward setup for US school district integration |
| **Bi-Directional Sync** | Send and receive student data, grades, attendance, and demographics | Scholarly works as a first-class citizen in Ed-Fi ecosystems |
| **Conflict Resolution** | Queue-based conflict resolution for data discrepancies between systems | Clean data management when multiple systems update the same records |
| **Sync Job Management** | Scheduled and on-demand sync jobs with progress tracking | Reliable, automated data exchange on the school's schedule |

---

## 18. Data Lake & Analytics

### Data Lake Platform
An enterprise-grade ETL (Extract, Transform, Load) and data cataloguing system for educational data.

| Capability | Description | Benefit |
|---|---|---|
| **Data Source Management** | Connect databases, APIs, file systems, and streaming sources with schema detection | All educational data sources unified under one roof |
| **ETL Pipeline Builder** | Visual pipeline builder with stages (Extract, Transform, Validate, Enrich, Load, Aggregate) | Non-technical users can build data workflows without coding |
| **Data Catalogue** | Searchable catalogue of all data assets with metadata, lineage, and quality scores | Find and understand any data asset across the organisation |
| **Data Quality Monitoring** | Automated quality checks (completeness, accuracy, freshness, consistency) with anomaly detection | Catch data issues before they affect decisions |
| **Streaming Pipelines** | Real-time data processing for live dashboards and event-driven analytics | Instant insights from student interactions as they happen |
| **Data Lineage** | End-to-end data lineage tracking from source to report | Know exactly where every number comes from for audit and trust |

### Analytics & Reporting Engine
A role-based analytics platform with AI-powered insights and customisable dashboards.

| Capability | Description | Benefit |
|---|---|---|
| **Role-Based Dashboards** | Pre-built dashboards for Teachers, Administrators, Students, and Parents | Every stakeholder sees the metrics that matter most to them |
| **Custom Widgets** | Configurable widgets (charts, tables, metrics, progress bars) with drag-and-drop layout | Build exactly the dashboard you need without developer help |
| **Report Generation** | Automated report generation with templates, scheduling, and distribution lists | Professional reports delivered on schedule without manual effort |
| **AI-Powered Insights** | Automated insight detection that identifies trends, anomalies, and recommendations | Proactive intelligence that surfaces what humans might miss |
| **At-Risk Identification** | Machine learning models flag students at risk of disengagement or failure | Early intervention before students fall behind |
| **Class Performance Analysis** | Comparative performance analysis across classes, subjects, and cohorts | Data-driven decisions about curriculum and pedagogy effectiveness |
| **Budget & Compliance Reporting** | Financial and compliance reports for school administration | Streamlined reporting for governing bodies and regulators |

---

## 19. Machine Learning Pipeline

### ML Pipeline Platform
A full-featured machine learning operations (MLOps) platform purpose-built for educational prediction.

| Capability | Description | Benefit |
|---|---|---|
| **Model Management** | Create, train, version, and deploy ML models with full lifecycle tracking | Reproducible, auditable ML from experiment to production |
| **Feature Store** | Centralised feature definitions with automated computation and versioning | Consistent features across all models; no duplicated feature engineering |
| **AutoML** | Automated model selection and hyperparameter tuning across multiple frameworks | Best model architecture found automatically without ML expertise |
| **Training Jobs** | Managed training job execution with GPU allocation, logging, and checkpoint management | Reliable model training without infrastructure management |
| **Model Deployment** | One-click deployment with canary releases, rollback, and A/B testing | Safe model updates with zero-downtime deployments |
| **Inference Monitoring** | Real-time prediction monitoring with drift detection and performance alerts | Catch model degradation before it impacts student outcomes |

### Educational Predictions
Purpose-built ML models for educational outcome prediction and intervention.

| Capability | Description | Benefit |
|---|---|---|
| **Student Risk Prediction** | Predict students at risk of disengagement, failure, or dropout with risk factor analysis | Early warning system with actionable intervention recommendations |
| **Performance Forecasting** | Forecast future academic performance with trend analysis and confidence intervals | Proactive academic planning rather than reactive remediation |
| **Engagement Prediction** | Predict engagement levels across different content types and learning modalities | Optimise content delivery for maximum student engagement |
| **Learning Path Recommendations** | AI-recommended learning paths based on goals, performance, and preferences | Personalised learning journeys that adapt to each student |

---

## 20. Platform Infrastructure

### Authentication & Security
A multi-strategy authentication system with role-based access control.

| Capability | Description | Benefit |
|---|---|---|
| **Multi-Strategy Auth** | Email/password, OAuth 2.0 (Google, Microsoft), and SSO support | Flexible sign-in options that work with existing school identity providers |
| **Role-Based Access Control** | Granular roles (Admin, Teacher, Student, Parent, Tutor) with permission hierarchies | Right access for the right people with no over-provisioning |
| **JWT Token Management** | Secure token issuance, refresh, and revocation | Stateless authentication that scales horizontally |
| **Registration & Onboarding** | Self-service registration with role selection and guided onboarding | Smooth first-time experience for all user types |

### Multi-Tenant Architecture
A fully multi-tenant platform supporting school, district, and system-level deployment.

| Capability | Description | Benefit |
|---|---|---|
| **Tenant Isolation** | Complete data isolation between tenants with tenant-scoped queries | Multiple schools on one platform with zero data leakage |
| **Tenant Configuration** | Per-tenant branding, feature flags, and integration configuration | Each school gets their own branded experience |
| **Tenant Limits** | Configurable resource limits per tenant (users, storage, API calls) | Fair resource allocation and capacity planning |

### Feature Flag System
A sophisticated feature flag system for controlled feature rollout.

| Capability | Description | Benefit |
|---|---|---|
| **Flag Management** | Boolean, percentage, and rule-based feature flags with kill switches | Fine-grained control over what features are active for whom |
| **Targeting Rules** | Target flags by user role, tenant, geography, or custom attributes | Phased rollouts and A/B testing of new features |
| **Real-Time Updates** | Flag changes take effect immediately without deployments | Instant feature control for incidents or gradual rollouts |

### Notification System
A multi-channel notification engine for platform-wide communications.

| Capability | Description | Benefit |
|---|---|---|
| **Multi-Channel Delivery** | Email, SMS, push notification, and in-app notification support | Reach users on their preferred communication channel |
| **Notification Preferences** | User-configurable notification preferences per channel and event type | Users control their notification experience, reducing alert fatigue |
| **Bulk Notifications** | Send targeted notifications to user segments, classes, or entire cohorts | Efficient mass communication for announcements and reminders |
| **Priority Levels** | Low, normal, high, and critical priority levels with delivery guarantees | Important messages get delivered promptly; routine ones batch intelligently |

### Blockchain Service
An Ethereum-compatible blockchain integration layer for credential verification and token operations.

| Capability | Description | Benefit |
|---|---|---|
| **Smart Contract Interaction** | Deploy and interact with Ethereum smart contracts for credential anchoring | Immutable, decentralised credential verification |
| **Transaction Management** | Gas estimation, nonce management, and transaction lifecycle tracking | Reliable blockchain operations without understanding crypto infrastructure |
| **Event Listening** | Real-time blockchain event monitoring for credential status changes | Instant notification when credentials are verified, revoked, or updated |

### Content Marketplace (Internal)
An internal marketplace for sharing curriculum-aligned content across the platform.

| Capability | Description | Benefit |
|---|---|---|
| **Content Publishing** | Teachers and content creators publish resources with metadata and pricing | Monetise quality educational content within the Scholarly ecosystem |
| **Review System** | Community reviews and ratings with quality scoring | Quality assurance through peer evaluation |
| **Creator Profiles** | Creator dashboards with publishing history, ratings, and revenue analytics | Recognise and reward excellent content creators |

### LIS-Scholarly Bridge
A bridge service implementing Learning Information Services for data exchange with Student Information Systems.

| Capability | Description | Benefit |
|---|---|---|
| **Student Data Sync** | Synchronise student demographic, enrolment, and academic data with SIS | Single source of truth for student information |
| **Course Section Mapping** | Map SIS course sections to Scholarly classes and learning groups | Automatic class setup from existing school structures |
| **Grade Passback** | Return assessment results and grades to the school's official gradebook | Grades recorded in Scholarly automatically appear in the SIS |

---

## Accessibility & Inclusion

Scholarly embeds accessibility and inclusion throughout the platform rather than treating them as an afterthought.

| Capability | Description | Benefit |
|---|---|---|
| **Multi-Modal Content** | All content available in text, audio, video, and visual formats where applicable | Learners engage through their strongest modality |
| **Differentiation Strategies** | AI-generated differentiation at every level (extension, core, support) across all curriculum services | Every student receives appropriately challenging work regardless of ability |
| **Dark Mode** | Full dark mode support across all 106 pages with `dark:` Tailwind variants | Reduced eye strain and accessibility for light-sensitive users |
| **Keyboard Navigation** | Full keyboard navigation support across all interactive elements | Accessible to users who cannot use a mouse or trackpad |
| **Screen Reader Support** | Semantic HTML and ARIA attributes throughout the component library | Blind and low-vision users can navigate the platform with assistive technology |
| **Pre-Literate Authentication** | Picture-based passwords for early years users who cannot yet read or type | Youngest learners can access the platform independently |
| **Adjustable Playback** | Audio and video playback speed controls (0.5x to 1.5x) across language learning and video coaching | Users control pace to match their processing speed |
| **Responsive Design** | Mobile-first responsive layouts tested at mobile, tablet, and desktop breakpoints | Full functionality on any device, from phone to interactive whiteboard |
| **Heritage Language Support** | Dedicated pathways for heritage speakers with identity affirmation and family language planning | Multilingual families see their languages valued, not marginalised |
| **Age-Appropriate Interfaces** | Distinct UI patterns for early years (3-7), primary, secondary, and adult users | Each age group gets an interface designed for their developmental stage |

---

## Platform Summary

| Metric | Count |
|---|---|
| **Frontend Pages** | 106 |
| **Backend Services** | 50 |
| **API Route Files** | 28 |
| **Database Models** | 162 |
| **Curriculum Frameworks** | ACARA (Australian Curriculum v9), IB (PYP, MYP, DP, CP), National Curriculum (England), Common Core (USA) — with AI-powered cross-framework mapping |
| **Compliance Standards** | AITSL, HES/TEQSA, EYLF, NESA, TQI, ST4S, AI Ethics Framework |
| **Interoperability Standards** | LTI 1.3, OneRoster 1.2, CASE, CLR 2.0, Open Badges 3.0, Ed-Fi v7, W3C DID, W3C VC, CEFR |
| **AI Capabilities** | Multi-provider AI (OpenAI/Anthropic/Google), BKT adaptive learning, curiosity detection, multi-objective optimisation, content generation, lesson planning, assessment building, peer review analysis, video coaching analysis, risk prediction, engagement forecasting |
| **Languages Supported** | 7+ (Japanese, French, Mandarin, Spanish, German, Italian, Korean, and more) |
| **User Roles** | Admin, Teacher, Student/Learner, Parent, Tutor, Content Creator, Developer |
| **Technology Stack** | Next.js 14, Express, Prisma, PostgreSQL, TypeScript, Tailwind CSS, shadcn/ui, recharts, Zustand, Zod, React Hook Form |

---

*Scholarly: Where every learner's journey is supported, every teacher's craft is enhanced, and every institution's mission is empowered through intelligent, interoperable, and inclusive education technology.*
