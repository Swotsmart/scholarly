# **Product Requirements Document (PRD): Design & Pitch AI**

**Version:** 1.0  
**Status:** Production-Ready  
**Product Category:** EdTech / AI-Enabled Learning Module  
**Architecture:** Multi-Tenant SaaS with LMS Integration (LTI 1.3)

## **1\. Executive Summary**

The **Design & Pitch AI** module is a pedagogical tool designed to bridge the gap between academic theory and real-world application. By integrating principles of instructional design, design thinking, and entrepreneurial pitching, the platform empowers learners to identify real-world problems, iterate on solutions through peer feedback, and deliver professional-grade pitches.  
The system utilizes AI to scaffold the learning journey, ensuring students remain within project scope and adhere to industry-standard pitching constraints (the 10/20/30 rule).

## **2\. Target Audience & Roles**

| Role | Responsibility |
| :---- | :---- |
| **Super Admin** | Manage tenants (institutions), global AI prompt configurations, and system-wide analytics. |
| **Instructor** | Configure course-specific challenges, monitor team progress, moderate peer reviews, and sync grades to LMS. |
| **Learner** | Define personal learning journeys, upload prototypes, participate in peer review, and build pitch decks. |
| **Peer Reviewer** | Evaluate peer artifacts using structured rubrics and inline annotations (Feedback Pins). |

## **3\. System Architecture & Compliance**

### **3.1 Multi-Tenancy**

* **Data Isolation:** Row-level security (RLS) or schema-per-tenant to ensure student data privacy across different institutions.  
* **Tenant Management:** Dedicated dashboard for institution admins to manage user seats and LTI configurations.

### **3.2 LMS Integration (LTI 1.3 Advantage)**

* **Single Sign-On (SSO):** Seamless transition from Canvas, Moodle, or Blackboard without secondary login.  
* **Deep Linking:** Instructors can link specific "Design Challenges" directly as LMS assignments.  
* **Assignment & Grade Service (AGS):** Automated write-back of final pitch scores to the LMS gradebook.

### **3.3 AI Infrastructure**

* **Engine:** Integration with LLMs (OpenAI o1/GPT-4o or Anthropic Claude 3.5).  
* **Feedback Loop:** Asynchronous AI analysis of student inputs to provide non-blocking formative feedback.

## **4\. Functional Requirements by Process Phase**

### **Phase 1: Empathize & Define (The Learner Journey)**

* **\[FR-1.1\] Journey Builder:** A wizard-based interface for students to declare their learning goals.  
* **\[FR-1.2\] Problem Scaffolding AI:** AI must validate the "Problem Statement" for clarity and viability.  
* **\[FR-1.3\] Evidence Locker:** Support for multimedia uploads (images, PDFs, audio) documenting user research and "Jobs to be Done."

### **Phase 2: Ideate & Prototype**

* **\[FR-2.1\] Artifact Gallery:** A version-controlled space to host prototype sketches, wireframes, or STEM data models.  
* **\[FR-2.2\] Pre-Pitch Coach:** An AI assistant that asks critical questions based on the student's defined user personas to trigger deeper refinement.

### **Phase 3: Iterate & Refine (Peer Review System)**

* **\[FR-3.1\] Double-Blind Review:** System must support anonymized peer-to-peer review cycles.  
* **\[FR-3.2\] Inline Annotations (Feedback Pins):** Reviewers drop pins on specific coordinates of a prototype image/slide to leave context-aware comments.  
* **\[FR-3.3\] AI Synthesis:** AI summarizes high volumes of peer feedback into three actionable "Growth Areas."

### **Phase 4: Pitch & Present (10/20/30 Enforcement)**

* **\[FR-4.1\] Constraint-Based Editor:** \* Hard limit of **10 slides**.  
  * Global font-size lock (minimum **30pt**).  
* **\[FR-4.2\] Pitch Timer:** Built-in presenter mode with a **20-minute** countdown and "Show, Don't Tell" visual prompts.

## **5\. Technical Specifications**

### **5.1 Database Schema (Conceptual)**

\-- Core Tenants  
CREATE TABLE Tenants (  
    tenant\_id UUID PRIMARY KEY,  
    name VARCHAR(255),  
    lti\_keys JSONB,  
    created\_at TIMESTAMP DEFAULT NOW()  
);

\-- Learner Projects  
CREATE TABLE Journeys (  
    journey\_id UUID PRIMARY KEY,  
    tenant\_id UUID REFERENCES Tenants(tenant\_id),  
    learner\_id UUID,  
    problem\_statement TEXT,  
    ai\_validation\_status VARCHAR(50) \-- 'Pending', 'Approved', 'Needs\_Refinement'  
);

\-- Versioned Artifacts  
CREATE TABLE Artifacts (  
    artifact\_id UUID PRIMARY KEY,  
    journey\_id UUID REFERENCES Journeys(journey\_id),  
    version\_num INT DEFAULT 1,  
    file\_path TEXT,  
    metadata JSONB \-- Storage for coordinates and types  
);

\-- Feedback & Peer Review  
CREATE TABLE PeerReview (  
    review\_id UUID PRIMARY KEY,  
    artifact\_id UUID REFERENCES Artifacts(artifact\_id),  
    reviewer\_id UUID,  
    feedback\_text TEXT,  
    pins JSONB, \-- Coordinates: \[{x: 0.5, y: 0.2, comment: "..."}\]  
    is\_anonymous BOOLEAN DEFAULT TRUE  
);

## **6\. Non-Functional Requirements**

* **Scalability:** System must handle 10,000+ concurrent users during peak "Presentation Week" periods.  
* **Accessibility:** Full WCAG 2.1 AA compliance for screen readers and keyboard navigation.  
* **AI Governance:** All AI outputs must include a disclaimer and allow for "Human-in-the-Loop" instructor overrides.

## **7\. Roadmap & Success Metrics**

### **Success Metrics (KPIs)**

1. **Iterative Depth:** Percentage of students who complete at least two versions of a prototype.  
2. **Feedback Loop Closure:** Number of feedback pins addressed/resolved by the learner.  
3. **LMS Sync Success:** 99.9% reliability in gradebook write-back.

