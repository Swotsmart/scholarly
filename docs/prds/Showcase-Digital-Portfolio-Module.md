# **Addendum To the Product Requirements Document\_Design & Pitch AI Module Showcase Portfolio & Digital Curation Module**

## **1\. Module Overview**

The **Showcase Portfolio** is the terminal phase of the Design & Pitch journey. It allows learners to transform their raw iterative process (sketches, failed prototypes, peer critiques) into a polished, professional narrative for external stakeholders, employers, or college admissions.

## **2\. Core Functional Requirements**

### **2.1 Curation & "Push to Showcase"**

* **\[FR-5.1\] Artifact Selection:** Learners can "star" specific versions of artifacts from their journey (e.g., V1 vs. Final) to include in their portfolio.  
* **\[FR-5.2\] Narrative Overlays:** For every curated artifact, the learner must provide a "Reflection" block explaining what they learned during that specific iteration.  
* **\[FR-5.3\] Pitch Deck Embedding:** A native, web-optimized viewer for the 10/20/30 pitch decks, allowing external viewers to play the presentation without the LMS wrapper.

### **2.2 Showcase Capabilities (Sharing & Privacy)**

* **\[FR-5.4\] Public/Private Vanity URLs:** Learners can generate a unique, non-sequential URL (e.g., portfolio.designpitch.ai/u/jules-smith-2024) to share externally.  
* **\[FR-5.5\] Access Control:** Support for password-protected showcases or "time-limited" links for sharing with specific employers or judges.  
* **\[FR-5.6\] Stakeholder Guest Comments:** A "Guestbook" feature where external viewers (without accounts) can leave high-level feedback, subject to learner approval.

### **2.3 AI Portfolio Assistant (Auto-Curation)**

* **\[FR-5.7\] Skill Mapping AI:** The AI analyzes the learner's journey and automatically suggests "Skill Tags" (e.g., *Rapid Prototyping*, *User Empathy*, *Data-Driven Persuasion*) based on the evidence in the artifacts.  
* **\[FR-5.8\] Portfolio "Executive Summary" Generator:** AI generates a 200-word biography/summary of the learner's journey, highlighting their growth from the initial "Problem Statement" to the final "Pitch."

## **3\. Technical Requirements for Showcase**

### **3.1 Public Routing & SEO**

* **Isolated Public View:** The Portfolio must render using a separate, lightweight frontend template that does not require LMS authentication (LTI 1.3 session) for external viewers.  
* **SEO Management:** Option for learners to toggle "No-Index" to prevent their portfolio from appearing in public search engines.

### **3.2 Data Schema Extension**

\-- Portfolio Showcase Table  
CREATE TABLE Portfolios (  
    portfolio\_id UUID PRIMARY KEY,  
    user\_id UUID REFERENCES Users(user\_id),  
    custom\_slug VARCHAR(255) UNIQUE, \-- Vanity URL  
    is\_public BOOLEAN DEFAULT FALSE,  
    password\_hash VARCHAR(255), \-- For protected shares  
    theme\_config JSONB, \-- Custom layout/colors  
    ai\_generated\_summary TEXT  
);

\-- Linking Artifacts to Showcase  
CREATE TABLE Portfolio\_Items (  
    portfolio\_item\_id UUID PRIMARY KEY,  
    portfolio\_id UUID REFERENCES Portfolios(portfolio\_id),  
    artifact\_id UUID REFERENCES Artifacts(artifact\_id),  
    learner\_reflection TEXT,  
    display\_order INT,  
    is\_featured BOOLEAN DEFAULT FALSE  
);

## **4\. User Journey: The "Showcase" Workflow**

1. **Selection:** During the "Iterate & Refine" phase, the learner clicks "Add to Portfolio" on their most successful V2 prototype.  
2. **Reflection:** The system prompts: *"How did peer feedback influence this version?"* The response is saved as metadata for the portfolio.  
3. **Synthesis:** After the final Pitch, the AI analyzes all selected items and suggests a layout that highlights "Growth" (showing the delta between V1 and Final).  
4. **Distribution:** The learner generates a password-protected link and includes it in their CV or LinkedIn profile.  
5. **Analytics:** The learner receives a notification: *"Your Pitch Deck was viewed 3 times by a stakeholder in London."*

## **5\. Success Metrics for Showcase**

* **External Reach:** Number of unique non-LMS views per portfolio.  
* **Curation Rate:** Average number of reflections written per showcase.  
* **Skill Identification:** Accuracy of AI skill-tagging as validated by instructors.