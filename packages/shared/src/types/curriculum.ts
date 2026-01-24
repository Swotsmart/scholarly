/**
 * Curriculum Types for the Curriculum Curator
 * Supports Machine Readable Australian Curriculum (MRAC) and other frameworks
 */

export type CurriculumFramework =
  | 'ACARA'
  | 'UK_NATIONAL'
  | 'UK_SCOTLAND'
  | 'UK_WALES'
  | 'COMMON_CORE'
  | 'IB'
  | 'CAMBRIDGE'
  | 'ONTARIO'
  | 'BC'
  | 'ALBERTA'
  | 'QUEBEC';

export interface CurriculumStandard {
  id: string;
  tenantId: string;
  framework: CurriculumFramework;

  // Identity
  code: string; // e.g., "ACMNA077"
  externalId?: string; // Original ID from source
  uri?: string; // RDF/JSON-LD URI

  // Classification
  type: CurriculumNodeType;
  learningArea: string;
  subject: string;
  strand?: string;
  substrand?: string;

  // Year/Stage
  yearLevels: string[];
  bandDescriptor?: string;

  // Content
  title: string;
  description: string;
  elaborations?: string[];
  contentDescriptions?: string[];

  // Bloom's Taxonomy
  bloomsLevel?: BloomsTaxonomyLevel;
  cognitiveVerbs: string[];

  // Skills and Concepts
  skills: string[];
  concepts: string[];
  keywords: string[];

  // Relationships
  prerequisites: string[]; // IDs of prerequisite standards
  relatedStandards: string[];
  crossCurricularLinks: CrossCurricularLink[];

  // General Capabilities (Australian Curriculum)
  generalCapabilities?: GeneralCapability[];

  // Cross-Curriculum Priorities
  crossCurriculumPriorities?: CrossCurriculumPriority[];

  // Embeddings for semantic search
  embedding?: number[];

  // Metadata
  source: string;
  version: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CurriculumNodeType =
  | 'learning_area'
  | 'subject'
  | 'strand'
  | 'substrand'
  | 'content_description'
  | 'elaboration'
  | 'achievement_standard'
  | 'band_description';

export type BloomsTaxonomyLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export interface CrossCurricularLink {
  standardId: string;
  standardCode: string;
  learningArea: string;
  connectionType: 'prerequisite' | 'related' | 'extension' | 'application';
  connectionStrength: number; // 0-1
  description?: string;
}

export type GeneralCapability =
  | 'literacy'
  | 'numeracy'
  | 'ict_capability'
  | 'critical_creative_thinking'
  | 'personal_social_capability'
  | 'ethical_understanding'
  | 'intercultural_understanding'
  | 'digital_literacy';

export type CrossCurriculumPriority =
  | 'aboriginal_torres_strait_islander'
  | 'asia_australia_engagement'
  | 'sustainability';

// ============================================================================
// LESSON PLAN TYPES
// ============================================================================

export interface LessonPlan {
  id: string;
  tenantId: string;

  // Identity
  title: string;
  description: string;
  yearLevel: string;
  subject: string;
  duration: number; // minutes

  // Curriculum Alignment
  curriculumCodes: string[];
  generalCapabilities: GeneralCapability[];
  crossCurriculumPriorities: CrossCurriculumPriority[];

  // Learning Intentions
  learningIntentions: string[];
  successCriteria: string[];

  // Structure
  sections: LessonSection[];

  // Differentiation
  differentiation: LessonDifferentiation;

  // Resources
  resources: LessonResource[];

  // Assessment
  assessmentOpportunities: AssessmentOpportunity[];

  // Cross-Curricular
  crossCurricularConnections: CrossCurricularConnection[];

  // Generation metadata
  generatedBy: 'ai' | 'human' | 'hybrid';
  generationPrompt?: string;
  qualityScore?: number;

  // Status
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonSection {
  type: 'introduction' | 'direct_instruction' | 'guided_practice' | 'independent_practice' | 'closure' | 'assessment' | 'extension';
  title: string;
  duration: number; // minutes
  description: string;
  teacherActions: string[];
  studentActions: string[];
  resources: string[];
  differentiationNotes?: string;
}

export interface LessonDifferentiation {
  enabling: string[]; // Support for struggling students
  extending: string[]; // Extension for advanced students
  eslSupport?: string[]; // English as second language support
  accessibilityConsiderations?: string[];
}

export interface LessonResource {
  type: 'worksheet' | 'video' | 'interactive' | 'textbook' | 'manipulative' | 'digital_tool' | 'other';
  title: string;
  description?: string;
  url?: string;
  contentId?: string; // Reference to Content Marketplace
}

export interface AssessmentOpportunity {
  type: 'formative' | 'summative';
  method: 'observation' | 'questioning' | 'exit_ticket' | 'quiz' | 'project' | 'peer_assessment' | 'self_assessment';
  description: string;
  curriculumCodes: string[];
}

export interface CrossCurricularConnection {
  subject: string;
  curriculumCode: string;
  description: string;
  suggestedActivity?: string;
}

// ============================================================================
// CONTENT ALIGNMENT TYPES
// ============================================================================

export interface ContentAlignment {
  id: string;
  contentId: string;
  standardId: string;
  standardCode: string;
  alignmentScore: number; // 0-1
  alignmentMethod: 'manual' | 'ai_semantic' | 'keyword' | 'hybrid';
  conceptsMatched: string[];
  skillsMatched: string[];
  confidence: number;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================================

export interface KnowledgeGraphNode {
  id: string;
  type: 'concept' | 'skill' | 'standard' | 'topic';
  label: string;
  description?: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: 'prerequisite' | 'related' | 'part_of' | 'leads_to' | 'applies_to';
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}
