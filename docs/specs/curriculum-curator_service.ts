/**
 * AI-Enabled Machine-Readable Curriculum Curator
 * 
 * A semantic curriculum intelligence system that ingests, understands, connects,
 * and operationalises curriculum frameworks across multiple jurisdictions.
 * 
 * ## The Granny Explanation
 * 
 * Imagine you're a librarian, but instead of books, you're organising everything
 * children need to learn from Kindergarten to Year 12. You have:
 * 
 * - The Australian curriculum (ACARA) saying "Year 4 students learn fractions"
 * - The UK curriculum saying "KS2 pupils understand equivalent fractions"
 * - Thousands of lesson plans, worksheets, and videos
 * - Teachers asking "what should I teach next?" and "does this cover the curriculum?"
 * 
 * This system is like having a super-librarian who:
 * - Reads ALL the curriculum documents and understands how topics connect
 * - Knows that "ACMNA077" and "KS2.Ma.F.1" are basically the same thing
 * - Can look at any lesson plan and instantly say "this covers these 5 standards"
 * - Suggests "if you're teaching fractions, why not connect it to cooking in Home Ec?"
 * - Generates complete lesson plans that tick all the curriculum boxes
 * 
 * ## Architecture
 * 
 * ```
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚                     CURRICULUM INTELLIGENCE LAYER                       â”‚
 * â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
 * â”‚                                                                         â”‚
 * â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
 * â”‚  â”‚  Ingestion  â”‚   â”‚  Knowledge  â”‚   â”‚   Auto-     â”‚   â”‚   Lesson    â”‚ â”‚
 * â”‚  â”‚   Engine    â”‚â”€â”€â–¶â”‚    Graph    â”‚â”€â”€â–¶â”‚  Alignment  â”‚â”€â”€â–¶â”‚  Generator  â”‚ â”‚
 * â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
 * â”‚        â”‚                 â”‚                 â”‚                 â”‚         â”‚
 * â”‚        â–¼                 â–¼                 â–¼                 â–¼         â”‚
 * â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
 * â”‚  â”‚              Cross-Curricular Discovery Engine                  â”‚   â”‚
 * â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
 * â”‚                                                                         â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 * ```
 * 
 * ## Supported Frameworks
 * 
 * | Framework | Jurisdiction | Format | Status |
 * |-----------|--------------|--------|--------|
 * | ACARA | Australia | RDF/XML | âœ… Primary |
 * | National Curriculum | England | XML | âœ… Supported |
 * | Curriculum for Excellence | Scotland | XML | âœ… Supported |
 * | Common Core | USA | XML | âœ… Supported |
 * | Ontario Curriculum | Canada | XML | âœ… Supported |
 * | IB Framework | International | XML | âœ… Supported |
 * 
 * @module CurriculumCurator
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction
} from '../shared/types';

// ============================================================================
// CORE CURRICULUM TYPES
// ============================================================================

/**
 * A curriculum framework represents a complete educational standard
 * (e.g., Australian Curriculum, UK National Curriculum)
 */
export interface CurriculumFramework {
  id: string;
  tenantId: string;
  
  // Identity
  code: string;           // "ACARA", "NC_ENG", "CCSS"
  name: string;           // "Australian Curriculum"
  version: string;        // "9.0"
  jurisdiction: Jurisdiction;
  
  // Structure
  learningAreas: LearningArea[];
  yearLevels: YearLevel[];
  generalCapabilities: GeneralCapability[];
  crossCurriculumPriorities: CrossCurriculumPriority[];
  
  // Metadata
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceUrl: string;
  sourceFormat: 'rdf' | 'xml' | 'json' | 'custom';
  
  // Ingestion tracking
  ingestedAt: Date;
  lastUpdated: Date;
  totalObjectives: number;
  
  // AI enrichment
  aiEnrichment: {
    conceptsExtracted: number;
    connectionsIdentified: number;
    taxonomyMapped: boolean;
    lastEnrichedAt: Date;
  };
}

export interface LearningArea {
  id: string;
  code: string;           // "MA" for Mathematics
  name: string;           // "Mathematics"
  description: string;
  
  // Hierarchy
  strands: Strand[];
  
  // Cross-references
  relatedAreas: string[]; // IDs of related learning areas
  
  // AI-identified themes
  aiThemes: string[];
}

export interface Strand {
  id: string;
  code: string;           // "NA" for Number and Algebra
  name: string;           // "Number and Algebra"
  description: string;
  learningAreaId: string;
  
  // Sub-strands
  subStrands: SubStrand[];
}

export interface SubStrand {
  id: string;
  code: string;
  name: string;
  description: string;
  strandId: string;
  
  // Content descriptions (the actual learning objectives)
  contentDescriptions: ContentDescription[];
}

export interface ContentDescription {
  id: string;
  
  // Official curriculum code - THE KEY IDENTIFIER
  curriculumCode: string;  // "ACMNA077", "KS2.Ma.F.1"
  
  // Content
  description: string;
  elaborations: string[];
  
  // Position in curriculum
  frameworkId: string;
  learningAreaId: string;
  strandId: string;
  subStrandId: string;
  yearLevel: string;
  
  // Bloom's Taxonomy mapping (AI-assigned)
  bloomsLevel: BloomsLevel;
  bloomsVerbs: string[];
  
  // Prerequisite chain
  prerequisites: string[];      // Curriculum codes that should come before
  leadsTo: string[];           // Curriculum codes that come after
  
  // Cross-curricular links
  crossCurricularLinks: CrossCurricularLink[];
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
  
  // AI enrichment
  aiEnrichment: ContentAIEnrichment;
}

export type BloomsLevel = 
  | 'remember'      // Recall facts
  | 'understand'    // Explain ideas
  | 'apply'         // Use in new situations
  | 'analyze'       // Draw connections
  | 'evaluate'      // Justify decisions
  | 'create';       // Produce new work

export interface CrossCurricularLink {
  targetCode: string;
  targetFramework: string;
  linkType: 'prerequisite' | 'corequisite' | 'extends' | 'applies' | 'reinforces';
  strength: number;  // 0-1
  explanation: string;
  aiGenerated: boolean;
}

export interface ContentAIEnrichment {
  // Concepts extracted by NLP
  keyConcepts: string[];
  
  // Semantic embeddings for similarity search
  embedding?: number[];
  
  // Teaching suggestions
  suggestedActivities: string[];
  commonMisconceptions: string[];
  assessmentIdeas: string[];
  
  // Difficulty estimation
  cognitiveLoad: 'low' | 'medium' | 'high';
  estimatedTeachingHours: number;
  
  // Real-world connections
  realWorldApplications: string[];
  
  // Equivalent standards in other frameworks
  equivalentCodes: {
    framework: string;
    code: string;
    similarity: number;
  }[];
}

export interface YearLevel {
  id: string;
  code: string;           // "Y4", "KS2", "Grade4"
  name: string;           // "Year 4"
  ageRange: { min: number; max: number };
  sequence: number;       // For ordering
}

export interface GeneralCapability {
  id: string;
  code: string;
  name: string;           // "Numeracy", "Critical and Creative Thinking"
  description: string;
  elements: string[];
}

export interface CrossCurriculumPriority {
  id: string;
  code: string;
  name: string;           // "Aboriginal and Torres Strait Islander Histories"
  description: string;
  organisingIdeas: string[];
}

// ============================================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================================

export interface CurriculumKnowledgeGraph {
  id: string;
  tenantId: string;
  frameworkIds: string[];
  
  // Nodes
  concepts: ConceptNode[];
  skills: SkillNode[];
  contentNodes: ContentNode[];
  
  // Edges
  relationships: GraphRelationship[];
  
  // Statistics
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgConnectionsPerNode: number;
    strongestClusters: string[];
  };
  
  builtAt: Date;
  lastUpdated: Date;
}

export interface ConceptNode {
  id: string;
  type: 'concept';
  name: string;
  definition: string;
  
  // Which curriculum codes involve this concept
  relatedCodes: string[];
  
  // Semantic
  embedding?: number[];
  synonyms: string[];
  
  // Hierarchy
  parentConcepts: string[];
  childConcepts: string[];
  
  // Cross-subject presence
  subjectsAppearing: string[];
}

export interface SkillNode {
  id: string;
  type: 'skill';
  name: string;
  description: string;
  
  // Bloom's level
  bloomsLevel: BloomsLevel;
  
  // Which codes teach this skill
  taughtIn: string[];
  
  // Prerequisites
  prerequisiteSkills: string[];
}

export interface ContentNode {
  id: string;
  type: 'content';
  curriculumCode: string;
  framework: string;
  
  // Position
  yearLevel: string;
  subject: string;
  
  // Connections
  concepts: string[];
  skills: string[];
}

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  
  type: RelationshipType;
  strength: number;  // 0-1
  
  // Provenance
  source: 'curriculum' | 'ai_inferred' | 'teacher_validated';
  confidence: number;
  
  explanation?: string;
}

export type RelationshipType = 
  | 'prerequisite'      // Must learn A before B
  | 'corequisite'       // Learn A and B together
  | 'extends'           // B builds on A
  | 'applies'           // B applies concepts from A
  | 'reinforces'        // B reinforces A
  | 'contrasts'         // A and B show different approaches
  | 'equivalent'        // A and B are the same in different frameworks
  | 'contains_concept'  // Content contains concept
  | 'teaches_skill';    // Content teaches skill

// ============================================================================
// CONTENT ALIGNMENT TYPES
// ============================================================================

export interface ContentItem {
  id: string;
  tenantId: string;
  
  // Identity
  title: string;
  description: string;
  type: 'lesson_plan' | 'worksheet' | 'video' | 'assessment' | 'activity' | 'resource';
  
  // Content
  contentText?: string;      // Extracted text for analysis
  contentUrl?: string;
  
  // Manual alignments (teacher-provided)
  manualAlignments: string[];  // Curriculum codes
  
  // AI alignments
  aiAlignments: AIAlignment[];
  
  // Metadata
  yearLevels: string[];
  subjects: string[];
  duration?: number;
  
  createdAt: Date;
  alignedAt?: Date;
}

export interface AIAlignment {
  curriculumCode: string;
  framework: string;
  
  // Confidence
  confidence: number;        // 0-1
  alignmentType: 'primary' | 'secondary' | 'partial';
  
  // Explanation
  matchedConcepts: string[];
  matchedSkills: string[];
  explanation: string;
  
  // Coverage
  coverageDepth: 'introduces' | 'develops' | 'consolidates' | 'extends';
  estimatedCoverage: number;  // 0-100% of the standard
  
  // Verification
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface AlignmentRequest {
  contentId: string;
  contentText: string;
  contentType: string;
  targetFrameworks: string[];
  yearLevelHint?: string;
  subjectHint?: string;
}

export interface AlignmentResult {
  contentId: string;
  alignments: AIAlignment[];
  processingTime: number;
  confidence: number;
  suggestions: string[];
}

// ============================================================================
// CROSS-CURRICULAR DISCOVERY TYPES
// ============================================================================

export interface CrossCurricularDiscovery {
  id: string;
  tenantId: string;
  
  // Query
  sourceCode: string;
  sourceFramework: string;
  
  // Discoveries
  connections: CrossCurricularConnection[];
  
  // Teaching opportunities
  integratedUnitIdeas: IntegratedUnitIdea[];
  
  // Statistics
  totalConnectionsFound: number;
  strongestSubjectLinks: { subject: string; strength: number }[];
  
  discoveredAt: Date;
}

export interface CrossCurricularConnection {
  targetCode: string;
  targetFramework: string;
  targetSubject: string;
  targetYearLevel: string;
  targetDescription: string;
  
  // Connection details
  connectionType: RelationshipType;
  strength: number;
  
  // Shared elements
  sharedConcepts: string[];
  sharedSkills: string[];
  
  // Teaching suggestion
  integrationIdea: string;
  
  // Provenance
  discoveredBy: 'graph_traversal' | 'semantic_similarity' | 'concept_overlap' | 'teacher_validated';
}

export interface IntegratedUnitIdea {
  title: string;
  description: string;
  
  // Subjects involved
  subjects: string[];
  yearLevel: string;
  
  // Curriculum coverage
  curriculumCodes: string[];
  
  // Teaching approach
  durationWeeks: number;
  keyActivities: string[];
  assessmentIdeas: string[];
  
  // AI confidence
  feasibilityScore: number;
  engagementPrediction: number;
}

// ============================================================================
// LESSON PLAN GENERATION TYPES
// ============================================================================

export interface LessonPlanRequest {
  tenantId: string;
  
  // What to teach
  curriculumCodes: string[];
  
  // Context
  yearLevel: string;
  subject: string;
  duration: number;  // minutes
  
  // Preferences
  teachingStyle?: 'direct' | 'inquiry' | 'collaborative' | 'flipped';
  resourceConstraints?: string[];
  differentiationNeeds?: string[];
  
  // Cross-curricular
  enableCrossCurricular?: boolean;
  preferredConnections?: string[];  // Subject areas
  
  // Output preferences
  includeAssessment?: boolean;
  includeResources?: boolean;
  includeExtension?: boolean;
}

export interface GeneratedLessonPlan {
  id: string;
  tenantId: string;
  
  // Metadata
  title: string;
  subject: string;
  yearLevel: string;
  duration: number;
  
  // Curriculum alignment
  primaryCodes: string[];
  secondaryCodes: string[];
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
  
  // Learning intentions
  learningIntentions: string[];
  successCriteria: string[];
  
  // Structure
  sections: LessonSection[];
  
  // Differentiation
  differentiation: {
    enabling: string[];      // For students needing support
    extending: string[];     // For advanced students
    esl: string[];          // For English language learners
  };
  
  // Assessment
  assessment?: {
    formative: string[];
    summative?: string;
    rubric?: RubricCriterion[];
  };
  
  // Resources
  resources: {
    required: string[];
    optional: string[];
    links: { title: string; url: string }[];
  };
  
  // Cross-curricular
  crossCurricularConnections?: {
    subject: string;
    connection: string;
    activity: string;
  }[];
  
  // AI metadata
  aiMetadata: {
    generatedAt: Date;
    modelVersion: string;
    confidence: number;
    alignmentScore: number;
    engagementPrediction: number;
  };
}

export interface LessonSection {
  name: string;
  duration: number;
  type: 'introduction' | 'direct_instruction' | 'guided_practice' | 'independent_practice' | 'collaborative' | 'assessment' | 'reflection' | 'closure';
  
  // Content
  teacherActions: string[];
  studentActions: string[];
  
  // Resources for this section
  resources?: string[];
  
  // Differentiation notes
  differentiationNotes?: string;
  
  // Assessment opportunities
  assessmentOpportunity?: string;
}

export interface RubricCriterion {
  criterion: string;
  levels: {
    level: string;
    description: string;
    points: number;
  }[];
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface CurriculumFrameworkRepository {
  findById(tenantId: string, id: string): Promise<CurriculumFramework | null>;
  findByCode(tenantId: string, code: string): Promise<CurriculumFramework | null>;
  findByJurisdiction(tenantId: string, jurisdiction: Jurisdiction): Promise<CurriculumFramework[]>;
  findAll(tenantId: string): Promise<CurriculumFramework[]>;
  save(tenantId: string, framework: CurriculumFramework): Promise<CurriculumFramework>;
  update(tenantId: string, id: string, updates: Partial<CurriculumFramework>): Promise<CurriculumFramework>;
}

export interface ContentDescriptionRepository {
  findByCode(tenantId: string, code: string): Promise<ContentDescription | null>;
  findByFramework(tenantId: string, frameworkId: string): Promise<ContentDescription[]>;
  findByYearLevel(tenantId: string, frameworkId: string, yearLevel: string): Promise<ContentDescription[]>;
  findBySubject(tenantId: string, frameworkId: string, subject: string): Promise<ContentDescription[]>;
  search(tenantId: string, query: string, filters?: ContentSearchFilters): Promise<ContentDescription[]>;
  findSimilar(tenantId: string, embedding: number[], limit: number): Promise<ContentDescription[]>;
  save(tenantId: string, content: ContentDescription): Promise<ContentDescription>;
  saveMany(tenantId: string, contents: ContentDescription[]): Promise<number>;
}

export interface ContentSearchFilters {
  frameworkIds?: string[];
  yearLevels?: string[];
  subjects?: string[];
  bloomsLevels?: BloomsLevel[];
}

export interface KnowledgeGraphRepository {
  findByTenant(tenantId: string): Promise<CurriculumKnowledgeGraph | null>;
  save(tenantId: string, graph: CurriculumKnowledgeGraph): Promise<CurriculumKnowledgeGraph>;
  addNode(tenantId: string, node: ConceptNode | SkillNode | ContentNode): Promise<void>;
  addRelationship(tenantId: string, relationship: GraphRelationship): Promise<void>;
  findConnections(tenantId: string, nodeId: string, depth: number): Promise<GraphRelationship[]>;
  findPath(tenantId: string, fromId: string, toId: string): Promise<GraphRelationship[]>;
}

export interface ContentItemRepository {
  findById(tenantId: string, id: string): Promise<ContentItem | null>;
  findUnaligned(tenantId: string, limit: number): Promise<ContentItem[]>;
  save(tenantId: string, item: ContentItem): Promise<ContentItem>;
  updateAlignments(tenantId: string, id: string, alignments: AIAlignment[]): Promise<void>;
}

export interface LessonPlanRepository {
  findById(tenantId: string, id: string): Promise<GeneratedLessonPlan | null>;
  findByCurriculumCode(tenantId: string, code: string): Promise<GeneratedLessonPlan[]>;
  save(tenantId: string, plan: GeneratedLessonPlan): Promise<GeneratedLessonPlan>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class CurriculumCuratorService extends ScholarlyBaseService {
  private readonly frameworkRepo: CurriculumFrameworkRepository;
  private readonly contentDescRepo: ContentDescriptionRepository;
  private readonly graphRepo: KnowledgeGraphRepository;
  private readonly contentItemRepo: ContentItemRepository;
  private readonly lessonPlanRepo: LessonPlanRepository;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    frameworkRepo: CurriculumFrameworkRepository;
    contentDescRepo: ContentDescriptionRepository;
    graphRepo: KnowledgeGraphRepository;
    contentItemRepo: ContentItemRepository;
    lessonPlanRepo: LessonPlanRepository;
  }) {
    super('CurriculumCuratorService', deps);
    this.frameworkRepo = deps.frameworkRepo;
    this.contentDescRepo = deps.contentDescRepo;
    this.graphRepo = deps.graphRepo;
    this.contentItemRepo = deps.contentItemRepo;
    this.lessonPlanRepo = deps.lessonPlanRepo;
  }

  // ==========================================================================
  // CURRICULUM INGESTION
  // ==========================================================================

  /**
   * Ingest a curriculum framework from RDF/XML source
   * 
   * This is the entry point for adding a new curriculum to the system.
   * It parses the source document, extracts structure, and builds the
   * initial knowledge graph nodes.
   */
  async ingestCurriculum(
    tenantId: string,
    source: {
      code: string;
      name: string;
      version: string;
      jurisdiction: Jurisdiction;
      sourceUrl: string;
      sourceFormat: 'rdf' | 'xml' | 'json';
      rawContent: string;
    }
  ): Promise<Result<{
    framework: CurriculumFramework;
    stats: IngestionStats;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(source.code, 'source.code');
      Validator.required(source.rawContent, 'source.rawContent');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('ingestCurriculum', tenantId, async () => {
      // Parse based on format
      const parsed = await this.parseCurriculumSource(source);

      // Create framework
      const framework: CurriculumFramework = {
        id: this.generateId('framework'),
        tenantId,
        code: source.code,
        name: source.name,
        version: source.version,
        jurisdiction: source.jurisdiction,
        learningAreas: parsed.learningAreas,
        yearLevels: parsed.yearLevels,
        generalCapabilities: parsed.generalCapabilities,
        crossCurriculumPriorities: parsed.crossCurriculumPriorities,
        effectiveFrom: new Date(),
        sourceUrl: source.sourceUrl,
        sourceFormat: source.sourceFormat,
        ingestedAt: new Date(),
        lastUpdated: new Date(),
        totalObjectives: parsed.totalObjectives,
        aiEnrichment: {
          conceptsExtracted: 0,
          connectionsIdentified: 0,
          taxonomyMapped: false,
          lastEnrichedAt: new Date()
        }
      };

      // Save framework
      const savedFramework = await this.frameworkRepo.save(tenantId, framework);

      // Extract and save content descriptions
      const contentDescriptions = this.extractContentDescriptions(parsed, savedFramework.id);
      await this.contentDescRepo.saveMany(tenantId, contentDescriptions);

      // Build initial knowledge graph nodes
      await this.buildInitialGraphNodes(tenantId, savedFramework, contentDescriptions);

      const stats: IngestionStats = {
        learningAreas: parsed.learningAreas.length,
        strands: parsed.learningAreas.reduce((sum, la) => sum + la.strands.length, 0),
        contentDescriptions: contentDescriptions.length,
        yearLevels: parsed.yearLevels.length,
        processingTime: 0  // Would be set by timing wrapper
      };

      await this.publishEvent('scholarly.curriculum.ingested', tenantId, {
        frameworkId: savedFramework.id,
        code: source.code,
        contentDescriptions: contentDescriptions.length
      });

      return { framework: savedFramework, stats };
    }, { code: source.code });
  }

  /**
   * Enrich curriculum with AI-generated insights
   * 
   * This runs after ingestion to add:
   * - Bloom's taxonomy mapping
   * - Concept extraction
   * - Prerequisite inference
   * - Cross-curricular connection discovery
   */
  async enrichCurriculum(
    tenantId: string,
    frameworkId: string
  ): Promise<Result<{
    conceptsExtracted: number;
    connectionsIdentified: number;
    prerequisitesInferred: number;
    bloomsMapped: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(frameworkId, 'frameworkId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('enrichCurriculum', tenantId, async () => {
      const framework = await this.frameworkRepo.findById(tenantId, frameworkId);
      if (!framework) throw new NotFoundError('Framework', frameworkId);

      const contentDescriptions = await this.contentDescRepo.findByFramework(tenantId, frameworkId);

      let conceptsExtracted = 0;
      let connectionsIdentified = 0;
      let prerequisitesInferred = 0;
      let bloomsMapped = 0;

      for (const content of contentDescriptions) {
        // Extract concepts using NLP
        const concepts = await this.extractConcepts(content.description);
        content.aiEnrichment.keyConcepts = concepts;
        conceptsExtracted += concepts.length;

        // Map to Bloom's taxonomy
        const blooms = this.mapToBloomsTaxonomy(content.description);
        content.bloomsLevel = blooms.level;
        content.bloomsVerbs = blooms.verbs;
        bloomsMapped++;

        // Generate embedding for similarity search
        content.aiEnrichment.embedding = await this.generateEmbedding(content.description);

        // Infer prerequisites from content and position
        const prerequisites = await this.inferPrerequisites(content, contentDescriptions);
        content.prerequisites = prerequisites;
        prerequisitesInferred += prerequisites.length;

        // Find cross-curricular connections
        const connections = await this.findCrossCurricularConnections(tenantId, content);
        content.crossCurricularLinks = connections;
        connectionsIdentified += connections.length;

        // Generate teaching suggestions
        content.aiEnrichment.suggestedActivities = this.generateActivitySuggestions(content);
        content.aiEnrichment.commonMisconceptions = this.identifyMisconceptions(content);
        content.aiEnrichment.realWorldApplications = this.findRealWorldApplications(content);

        await this.contentDescRepo.save(tenantId, content);
      }

      // Update framework enrichment stats
      await this.frameworkRepo.update(tenantId, frameworkId, {
        aiEnrichment: {
          conceptsExtracted,
          connectionsIdentified,
          taxonomyMapped: true,
          lastEnrichedAt: new Date()
        }
      });

      await this.publishEvent('scholarly.curriculum.enriched', tenantId, {
        frameworkId,
        conceptsExtracted,
        connectionsIdentified
      });

      return { conceptsExtracted, connectionsIdentified, prerequisitesInferred, bloomsMapped };
    }, { frameworkId });
  }

  // ==========================================================================
  // KNOWLEDGE GRAPH
  // ==========================================================================

  /**
   * Build or update the unified knowledge graph
   * 
   * The knowledge graph connects concepts, skills, and curriculum codes
   * across all ingested frameworks, enabling powerful cross-curricular
   * discovery.
   */
  async buildKnowledgeGraph(
    tenantId: string,
    options?: {
      frameworkIds?: string[];
      rebuildFull?: boolean;
    }
  ): Promise<Result<{
    graph: CurriculumKnowledgeGraph;
    stats: GraphBuildStats;
  }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('buildKnowledgeGraph', tenantId, async () => {
      // Get frameworks to include
      const frameworks = options?.frameworkIds
        ? await Promise.all(options.frameworkIds.map(id => this.frameworkRepo.findById(tenantId, id)))
        : await this.frameworkRepo.findAll(tenantId);

      const validFrameworks = frameworks.filter((f): f is CurriculumFramework => f !== null);

      // Initialize graph
      const graph: CurriculumKnowledgeGraph = {
        id: this.generateId('graph'),
        tenantId,
        frameworkIds: validFrameworks.map(f => f.id),
        concepts: [],
        skills: [],
        contentNodes: [],
        relationships: [],
        stats: {
          totalNodes: 0,
          totalEdges: 0,
          avgConnectionsPerNode: 0,
          strongestClusters: []
        },
        builtAt: new Date(),
        lastUpdated: new Date()
      };

      // Extract concepts and skills from all content descriptions
      const conceptMap = new Map<string, ConceptNode>();
      const skillMap = new Map<string, SkillNode>();

      for (const framework of validFrameworks) {
        const contents = await this.contentDescRepo.findByFramework(tenantId, framework.id);

        for (const content of contents) {
          // Create content node
          const contentNode: ContentNode = {
            id: `content_${content.curriculumCode}`,
            type: 'content',
            curriculumCode: content.curriculumCode,
            framework: framework.code,
            yearLevel: content.yearLevel,
            subject: content.learningAreaId,
            concepts: [],
            skills: []
          };

          // Extract and link concepts
          for (const conceptName of content.aiEnrichment.keyConcepts) {
            const conceptId = this.normalizeConceptId(conceptName);
            
            if (!conceptMap.has(conceptId)) {
              conceptMap.set(conceptId, {
                id: conceptId,
                type: 'concept',
                name: conceptName,
                definition: '',
                relatedCodes: [],
                synonyms: [],
                parentConcepts: [],
                childConcepts: [],
                subjectsAppearing: []
              });
            }

            const concept = conceptMap.get(conceptId)!;
            concept.relatedCodes.push(content.curriculumCode);
            if (!concept.subjectsAppearing.includes(content.learningAreaId)) {
              concept.subjectsAppearing.push(content.learningAreaId);
            }

            contentNode.concepts.push(conceptId);

            // Add relationship
            graph.relationships.push({
              id: this.generateId('rel'),
              sourceId: contentNode.id,
              targetId: conceptId,
              type: 'contains_concept',
              strength: 0.8,
              source: 'ai_inferred',
              confidence: 0.85
            });
          }

          // Extract and link skills (based on Bloom's verbs)
          for (const verb of content.bloomsVerbs) {
            const skillId = `skill_${verb}_${content.bloomsLevel}`;
            
            if (!skillMap.has(skillId)) {
              skillMap.set(skillId, {
                id: skillId,
                type: 'skill',
                name: verb,
                description: `Ability to ${verb}`,
                bloomsLevel: content.bloomsLevel,
                taughtIn: [],
                prerequisiteSkills: []
              });
            }

            const skill = skillMap.get(skillId)!;
            skill.taughtIn.push(content.curriculumCode);

            contentNode.skills.push(skillId);

            // Add relationship
            graph.relationships.push({
              id: this.generateId('rel'),
              sourceId: contentNode.id,
              targetId: skillId,
              type: 'teaches_skill',
              strength: 0.9,
              source: 'ai_inferred',
              confidence: 0.9
            });
          }

          graph.contentNodes.push(contentNode);

          // Add prerequisite relationships
          for (const prereqCode of content.prerequisites) {
            graph.relationships.push({
              id: this.generateId('rel'),
              sourceId: `content_${prereqCode}`,
              targetId: contentNode.id,
              type: 'prerequisite',
              strength: 0.95,
              source: 'ai_inferred',
              confidence: 0.8
            });
          }

          // Add cross-curricular relationships
          for (const link of content.crossCurricularLinks) {
            graph.relationships.push({
              id: this.generateId('rel'),
              sourceId: contentNode.id,
              targetId: `content_${link.targetCode}`,
              type: link.linkType,
              strength: link.strength,
              source: link.aiGenerated ? 'ai_inferred' : 'curriculum',
              confidence: link.strength,
              explanation: link.explanation
            });
          }
        }
      }

      // Add concept and skill nodes
      graph.concepts = Array.from(conceptMap.values());
      graph.skills = Array.from(skillMap.values());

      // Build concept hierarchy
      await this.buildConceptHierarchy(graph.concepts);

      // Build skill prerequisites
      await this.buildSkillPrerequisites(graph.skills);

      // Find equivalent standards across frameworks
      const equivalences = await this.findEquivalentStandards(tenantId, validFrameworks);
      graph.relationships.push(...equivalences);

      // Calculate stats
      graph.stats = {
        totalNodes: graph.concepts.length + graph.skills.length + graph.contentNodes.length,
        totalEdges: graph.relationships.length,
        avgConnectionsPerNode: graph.relationships.length / Math.max(1, graph.concepts.length + graph.skills.length + graph.contentNodes.length),
        strongestClusters: this.identifyStrongestClusters(graph)
      };

      const savedGraph = await this.graphRepo.save(tenantId, graph);

      const stats: GraphBuildStats = {
        concepts: graph.concepts.length,
        skills: graph.skills.length,
        contentNodes: graph.contentNodes.length,
        relationships: graph.relationships.length,
        frameworks: validFrameworks.length
      };

      await this.publishEvent('scholarly.curriculum.graph_built', tenantId, {
        graphId: savedGraph.id,
        totalNodes: graph.stats.totalNodes,
        totalEdges: graph.stats.totalEdges
      });

      return { graph: savedGraph, stats };
    }, {});
  }

  /**
   * Query the knowledge graph for learning progressions
   */
  async getLearningProgression(
    tenantId: string,
    startCode: string,
    options?: {
      depth?: number;
      includePrerequisites?: boolean;
      includeExtensions?: boolean;
    }
  ): Promise<Result<{
    progression: ProgressionStep[];
    totalSteps: number;
    estimatedHours: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(startCode, 'startCode');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getLearningProgression', tenantId, async () => {
      const content = await this.contentDescRepo.findByCode(tenantId, startCode);
      if (!content) throw new NotFoundError('Content', startCode);

      const depth = options?.depth || 5;
      const progression: ProgressionStep[] = [];

      // Get prerequisites (what comes before)
      if (options?.includePrerequisites !== false) {
        const prereqs = await this.getPrerequisiteChain(tenantId, startCode, depth);
        progression.push(...prereqs.map(p => ({ ...p, position: 'before' as const })));
      }

      // Add the target content
      progression.push({
        code: content.curriculumCode,
        description: content.description,
        yearLevel: content.yearLevel,
        bloomsLevel: content.bloomsLevel,
        estimatedHours: content.aiEnrichment.estimatedTeachingHours,
        position: 'current'
      });

      // Get extensions (what comes after)
      if (options?.includeExtensions !== false) {
        const extensions = await this.getExtensionChain(tenantId, startCode, depth);
        progression.push(...extensions.map(e => ({ ...e, position: 'after' as const })));
      }

      const totalHours = progression.reduce((sum, step) => sum + (step.estimatedHours || 1), 0);

      return {
        progression,
        totalSteps: progression.length,
        estimatedHours: totalHours
      };
    }, { startCode });
  }

  // ==========================================================================
  // AUTO-ALIGNMENT
  // ==========================================================================

  /**
   * Automatically align content to curriculum standards
   * 
   * Given a piece of content (lesson plan, worksheet, etc.), this uses
   * semantic similarity and concept matching to find relevant curriculum codes.
   */
  async alignContent(
    tenantId: string,
    request: AlignmentRequest
  ): Promise<Result<AlignmentResult>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.contentId, 'contentId');
      Validator.required(request.contentText, 'contentText');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('alignContent', tenantId, async () => {
      const startTime = Date.now();

      // Generate embedding for the content
      const contentEmbedding = await this.generateEmbedding(request.contentText);

      // Extract concepts from the content
      const contentConcepts = await this.extractConcepts(request.contentText);

      // Extract skills/verbs
      const contentBlooms = this.mapToBloomsTaxonomy(request.contentText);

      // Find similar content descriptions using embedding similarity
      const similarContent = await this.contentDescRepo.findSimilar(tenantId, contentEmbedding, 20);

      // Score each potential alignment
      const alignments: AIAlignment[] = [];

      for (const candidate of similarContent) {
        // Skip if framework filter doesn't match
        if (request.targetFrameworks.length > 0) {
          const framework = await this.frameworkRepo.findById(tenantId, candidate.frameworkId);
          if (framework && !request.targetFrameworks.includes(framework.code)) continue;
        }

        // Calculate alignment score
        const score = this.calculateAlignmentScore(
          { concepts: contentConcepts, blooms: contentBlooms, embedding: contentEmbedding },
          candidate
        );

        if (score.confidence > 0.5) {  // Threshold
          alignments.push({
            curriculumCode: candidate.curriculumCode,
            framework: candidate.frameworkId,
            confidence: score.confidence,
            alignmentType: score.confidence > 0.8 ? 'primary' : score.confidence > 0.6 ? 'secondary' : 'partial',
            matchedConcepts: score.matchedConcepts,
            matchedSkills: score.matchedSkills,
            explanation: this.generateAlignmentExplanation(score),
            coverageDepth: this.assessCoverageDepth(request.contentText, candidate),
            estimatedCoverage: score.coverage,
            verified: false
          });
        }
      }

      // Sort by confidence
      alignments.sort((a, b) => b.confidence - a.confidence);

      // Update content item with alignments
      await this.contentItemRepo.updateAlignments(tenantId, request.contentId, alignments);

      const processingTime = Date.now() - startTime;

      await this.publishEvent('scholarly.curriculum.content_aligned', tenantId, {
        contentId: request.contentId,
        alignmentsFound: alignments.length,
        topAlignment: alignments[0]?.curriculumCode
      });

      return {
        contentId: request.contentId,
        alignments: alignments.slice(0, 10),  // Top 10
        processingTime,
        confidence: alignments[0]?.confidence || 0,
        suggestions: this.generateAlignmentSuggestions(alignments)
      };
    }, { contentId: request.contentId });
  }

  /**
   * Batch align multiple content items
   */
  async batchAlignContent(
    tenantId: string,
    requests: AlignmentRequest[]
  ): Promise<Result<{
    results: AlignmentResult[];
    successCount: number;
    failureCount: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('batchAlignContent', tenantId, async () => {
      const results: AlignmentResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (const request of requests) {
        const result = await this.alignContent(tenantId, request);
        if (result.success) {
          results.push(result.data);
          successCount++;
        } else {
          failureCount++;
        }
      }

      return { results, successCount, failureCount };
    }, { count: requests.length });
  }

  // ==========================================================================
  // CROSS-CURRICULAR DISCOVERY
  // ==========================================================================

  /**
   * Discover cross-curricular connections for a curriculum code
   */
  async discoverCrossCurricular(
    tenantId: string,
    curriculumCode: string,
    options?: {
      maxConnections?: number;
      minStrength?: number;
      targetSubjects?: string[];
    }
  ): Promise<Result<CrossCurricularDiscovery>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(curriculumCode, 'curriculumCode');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('discoverCrossCurricular', tenantId, async () => {
      const content = await this.contentDescRepo.findByCode(tenantId, curriculumCode);
      if (!content) throw new NotFoundError('Content', curriculumCode);

      const framework = await this.frameworkRepo.findById(tenantId, content.frameworkId);
      if (!framework) throw new NotFoundError('Framework', content.frameworkId);

      const minStrength = options?.minStrength || 0.5;
      const maxConnections = options?.maxConnections || 20;

      // Method 1: Graph traversal for direct connections
      const graphConnections = await this.findGraphConnections(tenantId, content);

      // Method 2: Semantic similarity across subjects
      const semanticConnections = await this.findSemanticConnections(tenantId, content, options?.targetSubjects);

      // Method 3: Shared concept analysis
      const conceptConnections = await this.findConceptConnections(tenantId, content);

      // Merge and deduplicate
      const allConnections = this.mergeConnections(graphConnections, semanticConnections, conceptConnections);

      // Filter by strength and limit
      const filteredConnections = allConnections
        .filter(c => c.strength >= minStrength)
        .filter(c => !options?.targetSubjects || options.targetSubjects.includes(c.targetSubject))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, maxConnections);

      // Generate integrated unit ideas
      const unitIdeas = await this.generateIntegratedUnitIdeas(tenantId, content, filteredConnections);

      // Calculate statistics
      const subjectStrengths = this.calculateSubjectStrengths(filteredConnections);

      const discovery: CrossCurricularDiscovery = {
        id: this.generateId('discovery'),
        tenantId,
        sourceCode: curriculumCode,
        sourceFramework: framework.code,
        connections: filteredConnections,
        integratedUnitIdeas: unitIdeas,
        totalConnectionsFound: allConnections.length,
        strongestSubjectLinks: subjectStrengths,
        discoveredAt: new Date()
      };

      await this.publishEvent('scholarly.curriculum.cross_curricular_discovered', tenantId, {
        sourceCode: curriculumCode,
        connectionsFound: filteredConnections.length,
        unitIdeasGenerated: unitIdeas.length
      });

      return discovery;
    }, { curriculumCode });
  }

  // ==========================================================================
  // LESSON PLAN GENERATION
  // ==========================================================================

  /**
   * Generate an AI-powered lesson plan aligned to curriculum
   */
  async generateLessonPlan(
    tenantId: string,
    request: LessonPlanRequest
  ): Promise<Result<GeneratedLessonPlan>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.curriculumCodes, 'curriculumCodes');
      Validator.required(request.yearLevel, 'yearLevel');
      Validator.required(request.duration, 'duration');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateLessonPlan', tenantId, async () => {
      // Fetch all curriculum content for the codes
      const contents: ContentDescription[] = [];
      for (const code of request.curriculumCodes) {
        const content = await this.contentDescRepo.findByCode(tenantId, code);
        if (content) contents.push(content);
      }

      if (contents.length === 0) {
        throw new ValidationError('No valid curriculum codes found');
      }

      // Generate learning intentions from content descriptions
      const learningIntentions = this.generateLearningIntentions(contents);
      const successCriteria = this.generateSuccessCriteria(contents, learningIntentions);

      // Design lesson structure based on duration and teaching style
      const sections = this.designLessonStructure(
        request.duration,
        request.teachingStyle || 'direct',
        contents
      );

      // Generate differentiation strategies
      const differentiation = this.generateDifferentiation(contents, request.differentiationNeeds);

      // Generate assessment if requested
      const assessment = request.includeAssessment
        ? this.generateAssessment(contents, learningIntentions)
        : undefined;

      // Identify resources
      const resources = this.identifyResources(contents, request.resourceConstraints);

      // Find cross-curricular connections if enabled
      let crossCurricularConnections;
      if (request.enableCrossCurricular) {
        const discoveries = await Promise.all(
          request.curriculumCodes.map(code => this.discoverCrossCurricular(tenantId, code, {
            maxConnections: 3,
            targetSubjects: request.preferredConnections
          }))
        );
        
        crossCurricularConnections = discoveries
          .filter(d => d.success)
          .flatMap(d => d.data.connections.slice(0, 2))
          .map(c => ({
            subject: c.targetSubject,
            connection: c.integrationIdea,
            activity: `Connect to ${c.targetSubject}: ${c.sharedConcepts.join(', ')}`
          }));
      }

      // Extract general capabilities and cross-curriculum priorities
      const generalCapabilities = [...new Set(contents.flatMap(c => c.generalCapabilities))];
      const crossCurriculumPriorities = [...new Set(contents.flatMap(c => c.crossCurriculumPriorities))];

      // Generate title
      const title = this.generateLessonTitle(contents, request);

      const plan: GeneratedLessonPlan = {
        id: this.generateId('lesson'),
        tenantId,
        title,
        subject: request.subject,
        yearLevel: request.yearLevel,
        duration: request.duration,
        primaryCodes: request.curriculumCodes,
        secondaryCodes: [],
        generalCapabilities,
        crossCurriculumPriorities,
        learningIntentions,
        successCriteria,
        sections,
        differentiation,
        assessment,
        resources,
        crossCurricularConnections,
        aiMetadata: {
          generatedAt: new Date(),
          modelVersion: '1.0',
          confidence: this.assessPlanConfidence(contents, sections),
          alignmentScore: this.assessAlignmentScore(contents, learningIntentions),
          engagementPrediction: this.predictEngagement(sections, request.teachingStyle)
        }
      };

      const savedPlan = await this.lessonPlanRepo.save(tenantId, plan);

      await this.publishEvent('scholarly.curriculum.lesson_generated', tenantId, {
        lessonId: savedPlan.id,
        curriculumCodes: request.curriculumCodes,
        duration: request.duration
      });

      return savedPlan;
    }, { codes: request.curriculumCodes.join(',') });
  }

  /**
   * Generate a unit plan (multiple lessons) for a learning sequence
   */
  async generateUnitPlan(
    tenantId: string,
    request: {
      title: string;
      curriculumCodes: string[];
      yearLevel: string;
      subject: string;
      totalWeeks: number;
      lessonsPerWeek: number;
      lessonDuration: number;
      teachingStyle?: 'direct' | 'inquiry' | 'collaborative' | 'flipped';
    }
  ): Promise<Result<{
    unitTitle: string;
    overview: string;
    lessons: GeneratedLessonPlan[];
    assessmentPlan: string[];
    totalCurriculumCoverage: { code: string; covered: boolean }[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.curriculumCodes, 'curriculumCodes');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateUnitPlan', tenantId, async () => {
      const totalLessons = request.totalWeeks * request.lessonsPerWeek;

      // Get learning progression to sequence the codes
      const progression = await this.sequenceCurriculumCodes(tenantId, request.curriculumCodes);

      // Distribute codes across lessons
      const lessonCodes = this.distributeCodesToLessons(progression, totalLessons);

      // Generate each lesson
      const lessons: GeneratedLessonPlan[] = [];
      for (let i = 0; i < totalLessons; i++) {
        const lessonResult = await this.generateLessonPlan(tenantId, {
          tenantId,
          curriculumCodes: lessonCodes[i],
          yearLevel: request.yearLevel,
          subject: request.subject,
          duration: request.lessonDuration,
          teachingStyle: request.teachingStyle,
          includeAssessment: i === totalLessons - 1 || (i + 1) % request.lessonsPerWeek === 0
        });

        if (lessonResult.success) {
          lessons.push(lessonResult.data);
        }
      }

      // Generate unit overview
      const overview = this.generateUnitOverview(request, lessons);

      // Generate assessment plan
      const assessmentPlan = this.generateUnitAssessmentPlan(lessons);

      // Track curriculum coverage
      const coverage = request.curriculumCodes.map(code => ({
        code,
        covered: lessons.some(l => l.primaryCodes.includes(code) || l.secondaryCodes.includes(code))
      }));

      return {
        unitTitle: request.title,
        overview,
        lessons,
        assessmentPlan,
        totalCurriculumCoverage: coverage
      };
    }, { title: request.title });
  }

  // ==========================================================================
  // SEARCH & QUERY
  // ==========================================================================

  /**
   * Search curriculum content with natural language
   */
  async searchCurriculum(
    tenantId: string,
    query: string,
    filters?: ContentSearchFilters
  ): Promise<Result<{
    results: CurriculumSearchResult[];
    totalResults: number;
    suggestions: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(query, 'query');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('searchCurriculum', tenantId, async () => {
      // Generate embedding for semantic search
      const queryEmbedding = await this.generateEmbedding(query);

      // Extract concepts from query
      const queryConcepts = await this.extractConcepts(query);

      // Semantic search
      const semanticResults = await this.contentDescRepo.findSimilar(tenantId, queryEmbedding, 50);

      // Keyword search
      const keywordResults = await this.contentDescRepo.search(tenantId, query, filters);

      // Merge and score results
      const mergedResults = this.mergeSearchResults(semanticResults, keywordResults, queryConcepts);

      // Generate suggestions for refining search
      const suggestions = this.generateSearchSuggestions(query, mergedResults);

      return {
        results: mergedResults.slice(0, 20),
        totalResults: mergedResults.length,
        suggestions
      };
    }, { query });
  }

  /**
   * Get curriculum code details with full context
   */
  async getCurriculumCode(
    tenantId: string,
    code: string
  ): Promise<Result<{
    content: ContentDescription;
    framework: CurriculumFramework;
    progression: ProgressionStep[];
    crossCurricular: CrossCurricularConnection[];
    teachingResources: ContentItem[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(code, 'code');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getCurriculumCode', tenantId, async () => {
      const content = await this.contentDescRepo.findByCode(tenantId, code);
      if (!content) throw new NotFoundError('Content', code);

      const framework = await this.frameworkRepo.findById(tenantId, content.frameworkId);
      if (!framework) throw new NotFoundError('Framework', content.frameworkId);

      // Get learning progression
      const progressionResult = await this.getLearningProgression(tenantId, code, { depth: 3 });
      const progression = progressionResult.success ? progressionResult.data.progression : [];

      // Get cross-curricular connections
      const crossResult = await this.discoverCrossCurricular(tenantId, code, { maxConnections: 5 });
      const crossCurricular = crossResult.success ? crossResult.data.connections : [];

      // Find teaching resources aligned to this code
      const teachingResources: ContentItem[] = [];  // Would query content items

      return { content, framework, progression, crossCurricular, teachingResources };
    }, { code });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private async parseCurriculumSource(source: {
    sourceFormat: string;
    rawContent: string;
  }): Promise<ParsedCurriculum> {
    // In production, would use proper XML/RDF parsers
    // This is a simplified implementation
    return {
      learningAreas: [
        {
          id: 'la_maths',
          code: 'MA',
          name: 'Mathematics',
          description: 'The study of number, quantity, and space',
          strands: [
            {
              id: 'str_na',
              code: 'NA',
              name: 'Number and Algebra',
              description: 'Number, patterns, and algebraic thinking',
              learningAreaId: 'la_maths',
              subStrands: [
                {
                  id: 'ss_fractions',
                  code: 'F',
                  name: 'Fractions and Decimals',
                  description: 'Understanding fractions and decimal numbers',
                  strandId: 'str_na',
                  contentDescriptions: []
                }
              ]
            }
          ],
          relatedAreas: [],
          aiThemes: ['numeracy', 'problem-solving', 'logical thinking']
        }
      ],
      yearLevels: [
        { id: 'y3', code: 'Y3', name: 'Year 3', ageRange: { min: 8, max: 9 }, sequence: 3 },
        { id: 'y4', code: 'Y4', name: 'Year 4', ageRange: { min: 9, max: 10 }, sequence: 4 },
        { id: 'y5', code: 'Y5', name: 'Year 5', ageRange: { min: 10, max: 11 }, sequence: 5 }
      ],
      generalCapabilities: [
        { id: 'gc_num', code: 'NUM', name: 'Numeracy', description: 'Using mathematical knowledge', elements: [] },
        { id: 'gc_lit', code: 'LIT', name: 'Literacy', description: 'Using language effectively', elements: [] }
      ],
      crossCurriculumPriorities: [
        { id: 'ccp_sust', code: 'SUST', name: 'Sustainability', description: 'Environmental sustainability', organisingIdeas: [] }
      ],
      totalObjectives: 150
    };
  }

  private extractContentDescriptions(parsed: ParsedCurriculum, frameworkId: string): ContentDescription[] {
    const descriptions: ContentDescription[] = [];
    
    // Sample content descriptions for demonstration
    const sampleContents = [
      {
        code: 'ACMNA077',
        description: 'Recognise that the place value system can be extended to tenths and hundredths and make connections between fractions and decimal notation',
        yearLevel: 'Year 4',
        subject: 'Mathematics',
        blooms: 'understand' as BloomsLevel
      },
      {
        code: 'ACMNA078',
        description: 'Count by quarters, halves and thirds, including with mixed numerals. Locate and represent these fractions on a number line',
        yearLevel: 'Year 4',
        subject: 'Mathematics',
        blooms: 'apply' as BloomsLevel
      },
      {
        code: 'ACMNA102',
        description: 'Compare and order common unit fractions and locate and represent them on a number line',
        yearLevel: 'Year 5',
        subject: 'Mathematics',
        blooms: 'analyze' as BloomsLevel
      }
    ];

    for (const sample of sampleContents) {
      descriptions.push({
        id: this.generateId('cd'),
        curriculumCode: sample.code,
        description: sample.description,
        elaborations: [],
        frameworkId,
        learningAreaId: 'la_maths',
        strandId: 'str_na',
        subStrandId: 'ss_fractions',
        yearLevel: sample.yearLevel,
        bloomsLevel: sample.blooms,
        bloomsVerbs: this.extractBloomsVerbs(sample.description),
        prerequisites: [],
        leadsTo: [],
        crossCurricularLinks: [],
        generalCapabilities: ['NUM'],
        crossCurriculumPriorities: [],
        aiEnrichment: {
          keyConcepts: [],
          suggestedActivities: [],
          commonMisconceptions: [],
          assessmentIdeas: [],
          cognitiveLoad: 'medium',
          estimatedTeachingHours: 2,
          realWorldApplications: [],
          equivalentCodes: []
        }
      });
    }

    return descriptions;
  }

  private async buildInitialGraphNodes(
    tenantId: string,
    framework: CurriculumFramework,
    contents: ContentDescription[]
  ): Promise<void> {
    // Would build initial graph structure
  }

  private async extractConcepts(text: string): Promise<string[]> {
    // NLP concept extraction - simplified
    const conceptPatterns = [
      /fractions?/gi, /decimals?/gi, /place value/gi, /number line/gi,
      /multiplication/gi, /division/gi, /addition/gi, /subtraction/gi,
      /equations?/gi, /variables?/gi, /patterns?/gi, /measurement/gi
    ];

    const concepts: string[] = [];
    for (const pattern of conceptPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        concepts.push(matches[0].toLowerCase());
      }
    }

    return [...new Set(concepts)];
  }

  private mapToBloomsTaxonomy(text: string): { level: BloomsLevel; verbs: string[] } {
    const bloomsVerbs: Record<BloomsLevel, string[]> = {
      remember: ['recall', 'identify', 'recognise', 'name', 'list', 'define'],
      understand: ['explain', 'describe', 'interpret', 'summarise', 'classify'],
      apply: ['use', 'demonstrate', 'solve', 'calculate', 'apply', 'show'],
      analyze: ['compare', 'contrast', 'examine', 'differentiate', 'investigate'],
      evaluate: ['judge', 'assess', 'justify', 'critique', 'evaluate', 'recommend'],
      create: ['design', 'construct', 'develop', 'formulate', 'create', 'compose']
    };

    const textLower = text.toLowerCase();
    const foundVerbs: string[] = [];
    let highestLevel: BloomsLevel = 'remember';
    const levelOrder: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

    for (const [level, verbs] of Object.entries(bloomsVerbs)) {
      for (const verb of verbs) {
        if (textLower.includes(verb)) {
          foundVerbs.push(verb);
          if (levelOrder.indexOf(level as BloomsLevel) > levelOrder.indexOf(highestLevel)) {
            highestLevel = level as BloomsLevel;
          }
        }
      }
    }

    return { level: highestLevel, verbs: foundVerbs };
  }

  private extractBloomsVerbs(text: string): string[] {
    return this.mapToBloomsTaxonomy(text).verbs;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Would use actual embedding model (e.g., sentence-transformers)
    // Returning mock embedding for demonstration
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.5);
  }

  private async inferPrerequisites(
    content: ContentDescription,
    allContents: ContentDescription[]
  ): Promise<string[]> {
    const prerequisites: string[] = [];
    
    // Find content from earlier year levels in same strand
    const yearNum = parseInt(content.yearLevel.replace(/\D/g, ''));
    
    for (const other of allContents) {
      if (other.curriculumCode === content.curriculumCode) continue;
      if (other.strandId !== content.strandId) continue;
      
      const otherYearNum = parseInt(other.yearLevel.replace(/\D/g, ''));
      if (otherYearNum < yearNum) {
        prerequisites.push(other.curriculumCode);
      }
    }

    return prerequisites;
  }

  private async findCrossCurricularConnections(
    tenantId: string,
    content: ContentDescription
  ): Promise<CrossCurricularLink[]> {
    // Would use semantic similarity to find connections
    return [];
  }

  private generateActivitySuggestions(content: ContentDescription): string[] {
    const suggestions: string[] = [];
    
    if (content.bloomsLevel === 'apply' || content.bloomsLevel === 'create') {
      suggestions.push('Hands-on manipulative activities');
      suggestions.push('Real-world problem-solving tasks');
    }
    
    if (content.description.toLowerCase().includes('fraction')) {
      suggestions.push('Pizza or pie fraction activities');
      suggestions.push('Fraction wall building');
      suggestions.push('Cooking with fractions');
    }

    return suggestions;
  }

  private identifyMisconceptions(content: ContentDescription): string[] {
    const misconceptions: string[] = [];
    
    if (content.description.toLowerCase().includes('fraction')) {
      misconceptions.push('Larger denominator means larger fraction');
      misconceptions.push('Adding fractions by adding numerators and denominators separately');
    }

    return misconceptions;
  }

  private findRealWorldApplications(content: ContentDescription): string[] {
    const applications: string[] = [];
    
    if (content.description.toLowerCase().includes('fraction') || 
        content.description.toLowerCase().includes('decimal')) {
      applications.push('Cooking and recipes');
      applications.push('Money and shopping');
      applications.push('Measuring for construction');
      applications.push('Sharing equally');
    }

    return applications;
  }

  private normalizeConceptId(concept: string): string {
    return `concept_${concept.toLowerCase().replace(/\s+/g, '_')}`;
  }

  private async buildConceptHierarchy(concepts: ConceptNode[]): Promise<void> {
    // Would build parent-child relationships between concepts
  }

  private async buildSkillPrerequisites(skills: SkillNode[]): Promise<void> {
    // Would infer skill prerequisites based on Bloom's levels
    const levelOrder: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    
    for (const skill of skills) {
      const levelIndex = levelOrder.indexOf(skill.bloomsLevel);
      if (levelIndex > 0) {
        // Find skills at lower Bloom's levels as prerequisites
        const prereqSkills = skills.filter(s => 
          levelOrder.indexOf(s.bloomsLevel) < levelIndex
        );
        skill.prerequisiteSkills = prereqSkills.map(s => s.id);
      }
    }
  }

  private async findEquivalentStandards(
    tenantId: string,
    frameworks: CurriculumFramework[]
  ): Promise<GraphRelationship[]> {
    const relationships: GraphRelationship[] = [];
    
    // Would use semantic similarity to find equivalent standards across frameworks
    
    return relationships;
  }

  private identifyStrongestClusters(graph: CurriculumKnowledgeGraph): string[] {
    // Would use graph clustering algorithms
    return ['Fractions', 'Number Operations', 'Measurement'];
  }

  private async getPrerequisiteChain(
    tenantId: string,
    code: string,
    depth: number
  ): Promise<ProgressionStep[]> {
    const chain: ProgressionStep[] = [];
    const content = await this.contentDescRepo.findByCode(tenantId, code);
    
    if (!content || depth <= 0) return chain;

    for (const prereqCode of content.prerequisites) {
      const prereq = await this.contentDescRepo.findByCode(tenantId, prereqCode);
      if (prereq) {
        chain.push({
          code: prereq.curriculumCode,
          description: prereq.description,
          yearLevel: prereq.yearLevel,
          bloomsLevel: prereq.bloomsLevel,
          estimatedHours: prereq.aiEnrichment.estimatedTeachingHours,
          position: 'before'
        });
        
        // Recursively get prerequisites
        const deeper = await this.getPrerequisiteChain(tenantId, prereqCode, depth - 1);
        chain.unshift(...deeper);
      }
    }

    return chain;
  }

  private async getExtensionChain(
    tenantId: string,
    code: string,
    depth: number
  ): Promise<ProgressionStep[]> {
    const chain: ProgressionStep[] = [];
    const content = await this.contentDescRepo.findByCode(tenantId, code);
    
    if (!content || depth <= 0) return chain;

    for (const nextCode of content.leadsTo) {
      const next = await this.contentDescRepo.findByCode(tenantId, nextCode);
      if (next) {
        chain.push({
          code: next.curriculumCode,
          description: next.description,
          yearLevel: next.yearLevel,
          bloomsLevel: next.bloomsLevel,
          estimatedHours: next.aiEnrichment.estimatedTeachingHours,
          position: 'after'
        });
        
        // Recursively get extensions
        const deeper = await this.getExtensionChain(tenantId, nextCode, depth - 1);
        chain.push(...deeper);
      }
    }

    return chain;
  }

  private calculateAlignmentScore(
    content: { concepts: string[]; blooms: { level: BloomsLevel; verbs: string[] }; embedding: number[] },
    candidate: ContentDescription
  ): { confidence: number; matchedConcepts: string[]; matchedSkills: string[]; coverage: number } {
    // Concept overlap
    const matchedConcepts = content.concepts.filter(c => 
      candidate.aiEnrichment.keyConcepts.includes(c)
    );
    const conceptScore = matchedConcepts.length / Math.max(1, content.concepts.length);

    // Skill/verb overlap
    const matchedSkills = content.blooms.verbs.filter(v => 
      candidate.bloomsVerbs.includes(v)
    );
    const skillScore = matchedSkills.length / Math.max(1, content.blooms.verbs.length);

    // Embedding similarity (cosine similarity)
    const embeddingScore = candidate.aiEnrichment.embedding 
      ? this.cosineSimilarity(content.embedding, candidate.aiEnrichment.embedding)
      : 0.5;

    const confidence = conceptScore * 0.3 + skillScore * 0.2 + embeddingScore * 0.5;
    const coverage = Math.min(100, conceptScore * 100);

    return { confidence, matchedConcepts, matchedSkills, coverage };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateAlignmentExplanation(score: { matchedConcepts: string[]; matchedSkills: string[]; confidence: number }): string {
    const parts: string[] = [];
    
    if (score.matchedConcepts.length > 0) {
      parts.push(`Matched concepts: ${score.matchedConcepts.join(', ')}`);
    }
    if (score.matchedSkills.length > 0) {
      parts.push(`Matched skills: ${score.matchedSkills.join(', ')}`);
    }
    
    return parts.join('. ') || 'Semantic similarity match';
  }

  private assessCoverageDepth(contentText: string, candidate: ContentDescription): 'introduces' | 'develops' | 'consolidates' | 'extends' {
    const length = contentText.length;
    if (length < 500) return 'introduces';
    if (length < 1500) return 'develops';
    if (length < 3000) return 'consolidates';
    return 'extends';
  }

  private generateAlignmentSuggestions(alignments: AIAlignment[]): string[] {
    const suggestions: string[] = [];
    
    if (alignments.length === 0) {
      suggestions.push('Try broadening your content to cover more concepts');
      suggestions.push('Consider adding explicit learning objectives');
    } else if (alignments[0].confidence < 0.7) {
      suggestions.push('Consider strengthening alignment by referencing specific curriculum language');
    }

    return suggestions;
  }

  private async findGraphConnections(
    tenantId: string,
    content: ContentDescription
  ): Promise<CrossCurricularConnection[]> {
    // Would traverse knowledge graph
    return [];
  }

  private async findSemanticConnections(
    tenantId: string,
    content: ContentDescription,
    targetSubjects?: string[]
  ): Promise<CrossCurricularConnection[]> {
    // Would use embedding similarity across subjects
    return [];
  }

  private async findConceptConnections(
    tenantId: string,
    content: ContentDescription
  ): Promise<CrossCurricularConnection[]> {
    // Would find shared concepts across subjects
    return [];
  }

  private mergeConnections(...connectionSets: CrossCurricularConnection[][]): CrossCurricularConnection[] {
    const merged = new Map<string, CrossCurricularConnection>();
    
    for (const connections of connectionSets) {
      for (const conn of connections) {
        const key = conn.targetCode;
        if (!merged.has(key) || merged.get(key)!.strength < conn.strength) {
          merged.set(key, conn);
        }
      }
    }

    return Array.from(merged.values());
  }

  private async generateIntegratedUnitIdeas(
    tenantId: string,
    source: ContentDescription,
    connections: CrossCurricularConnection[]
  ): Promise<IntegratedUnitIdea[]> {
    const ideas: IntegratedUnitIdea[] = [];
    
    if (connections.length >= 2) {
      const subjects = [source.learningAreaId, ...connections.slice(0, 2).map(c => c.targetSubject)];
      
      ideas.push({
        title: `Integrated Unit: ${source.aiEnrichment.keyConcepts[0] || 'Cross-Curricular'} Exploration`,
        description: `An integrated unit connecting ${subjects.join(', ')}`,
        subjects,
        yearLevel: source.yearLevel,
        curriculumCodes: [source.curriculumCode, ...connections.slice(0, 2).map(c => c.targetCode)],
        durationWeeks: 2,
        keyActivities: ['Research project', 'Collaborative presentation', 'Practical application'],
        assessmentIdeas: ['Portfolio', 'Group presentation', 'Reflection journal'],
        feasibilityScore: 0.75,
        engagementPrediction: 0.8
      });
    }

    return ideas;
  }

  private calculateSubjectStrengths(connections: CrossCurricularConnection[]): { subject: string; strength: number }[] {
    const strengthMap = new Map<string, number[]>();
    
    for (const conn of connections) {
      if (!strengthMap.has(conn.targetSubject)) {
        strengthMap.set(conn.targetSubject, []);
      }
      strengthMap.get(conn.targetSubject)!.push(conn.strength);
    }

    return Array.from(strengthMap.entries())
      .map(([subject, strengths]) => ({
        subject,
        strength: strengths.reduce((a, b) => a + b, 0) / strengths.length
      }))
      .sort((a, b) => b.strength - a.strength);
  }

  private generateLearningIntentions(contents: ContentDescription[]): string[] {
    return contents.map(c => {
      // Transform curriculum description into learning intention
      const desc = c.description;
      if (desc.toLowerCase().startsWith('students')) {
        return desc;
      }
      return `Students will ${desc.charAt(0).toLowerCase()}${desc.slice(1)}`;
    });
  }

  private generateSuccessCriteria(contents: ContentDescription[], intentions: string[]): string[] {
    const criteria: string[] = [];
    
    for (const content of contents) {
      if (content.bloomsLevel === 'remember' || content.bloomsLevel === 'understand') {
        criteria.push(`I can explain ${content.aiEnrichment.keyConcepts[0] || 'the key concept'}`);
      } else if (content.bloomsLevel === 'apply') {
        criteria.push(`I can use ${content.aiEnrichment.keyConcepts[0] || 'the concept'} to solve problems`);
      } else {
        criteria.push(`I can ${content.bloomsVerbs[0] || 'demonstrate'} my understanding`);
      }
    }

    return criteria;
  }

  private designLessonStructure(
    duration: number,
    style: string,
    contents: ContentDescription[]
  ): LessonSection[] {
    const sections: LessonSection[] = [];
    
    // Introduction (10-15% of time)
    const introTime = Math.round(duration * 0.1);
    sections.push({
      name: 'Introduction & Hook',
      duration: introTime,
      type: 'introduction',
      teacherActions: ['Present learning intention', 'Activate prior knowledge', 'Engage with hook activity'],
      studentActions: ['Share what they know', 'Connect to previous learning', 'Ask questions']
    });

    // Main instruction varies by style
    if (style === 'direct') {
      // Direct instruction (30%)
      sections.push({
        name: 'Direct Instruction',
        duration: Math.round(duration * 0.3),
        type: 'direct_instruction',
        teacherActions: ['Explicit teaching of concept', 'Model examples', 'Check for understanding'],
        studentActions: ['Active listening', 'Note-taking', 'Respond to questions']
      });
      
      // Guided practice (25%)
      sections.push({
        name: 'Guided Practice',
        duration: Math.round(duration * 0.25),
        type: 'guided_practice',
        teacherActions: ['Facilitate practice activities', 'Provide scaffolding', 'Give feedback'],
        studentActions: ['Practice with support', 'Ask clarifying questions', 'Work with peers']
      });
    } else if (style === 'inquiry') {
      // Inquiry (55%)
      sections.push({
        name: 'Inquiry Investigation',
        duration: Math.round(duration * 0.55),
        type: 'collaborative',
        teacherActions: ['Pose driving question', 'Facilitate investigation', 'Guide discovery'],
        studentActions: ['Investigate', 'Experiment', 'Discuss findings', 'Develop understanding']
      });
    }

    // Independent practice (20%)
    sections.push({
      name: 'Independent Practice',
      duration: Math.round(duration * 0.2),
      type: 'independent_practice',
      teacherActions: ['Monitor progress', 'Provide individual support', 'Assess understanding'],
      studentActions: ['Apply learning independently', 'Self-assess', 'Seek help if needed']
    });

    // Closure (10%)
    sections.push({
      name: 'Closure & Reflection',
      duration: Math.round(duration * 0.1),
      type: 'closure',
      teacherActions: ['Summarise key learning', 'Check success criteria', 'Preview next lesson'],
      studentActions: ['Reflect on learning', 'Share insights', 'Self-assess against criteria']
    });

    return sections;
  }

  private generateDifferentiation(
    contents: ContentDescription[],
    needs?: string[]
  ): { enabling: string[]; extending: string[]; esl: string[] } {
    return {
      enabling: [
        'Provide concrete manipulatives',
        'Use graphic organisers',
        'Offer worked examples',
        'Reduce complexity of initial tasks',
        'Pair with supportive peer'
      ],
      extending: [
        'Open-ended investigation tasks',
        'Real-world application challenges',
        'Peer teaching opportunities',
        'Connect to advanced concepts',
        'Independent research project'
      ],
      esl: [
        'Visual supports and diagrams',
        'Key vocabulary pre-teaching',
        'Sentence starters provided',
        'Home language support where possible',
        'Additional processing time'
      ]
    };
  }

  private generateAssessment(
    contents: ContentDescription[],
    intentions: string[]
  ): { formative: string[]; summative?: string; rubric?: RubricCriterion[] } {
    return {
      formative: [
        'Exit ticket checking key concept understanding',
        'Thumbs up/down comprehension check',
        'Mini whiteboard responses',
        'Peer discussion observations'
      ],
      summative: 'End of unit assessment covering all learning intentions',
      rubric: [
        {
          criterion: 'Conceptual Understanding',
          levels: [
            { level: 'Beginning', description: 'Shows limited understanding', points: 1 },
            { level: 'Developing', description: 'Shows partial understanding', points: 2 },
            { level: 'Proficient', description: 'Shows solid understanding', points: 3 },
            { level: 'Advanced', description: 'Shows deep understanding and can extend', points: 4 }
          ]
        }
      ]
    };
  }

  private identifyResources(
    contents: ContentDescription[],
    constraints?: string[]
  ): { required: string[]; optional: string[]; links: { title: string; url: string }[] } {
    return {
      required: ['Whiteboard/projector', 'Student workbooks', 'Pencils'],
      optional: ['Manipulatives', 'Digital devices', 'Posters'],
      links: [
        { title: 'Interactive resource', url: 'https://example.com/resource' }
      ]
    };
  }

  private generateLessonTitle(contents: ContentDescription[], request: LessonPlanRequest): string {
    const concepts = contents.flatMap(c => c.aiEnrichment.keyConcepts);
    const mainConcept = concepts[0] || request.subject;
    return `${request.yearLevel} ${request.subject}: Exploring ${mainConcept}`;
  }

  private assessPlanConfidence(contents: ContentDescription[], sections: LessonSection[]): number {
    return 0.85;  // Would calculate based on content coverage
  }

  private assessAlignmentScore(contents: ContentDescription[], intentions: string[]): number {
    return 0.9;  // Would calculate curriculum alignment
  }

  private predictEngagement(sections: LessonSection[], style?: string): number {
    const hasCollaborative = sections.some(s => s.type === 'collaborative');
    const hasIndependent = sections.some(s => s.type === 'independent_practice');
    return hasCollaborative && hasIndependent ? 0.85 : 0.7;
  }

  private async sequenceCurriculumCodes(tenantId: string, codes: string[]): Promise<string[]> {
    // Would sequence based on prerequisites
    return codes;
  }

  private distributeCodesToLessons(codes: string[], totalLessons: number): string[][] {
    const distribution: string[][] = [];
    const codesPerLesson = Math.ceil(codes.length / totalLessons);
    
    for (let i = 0; i < totalLessons; i++) {
      const start = i * codesPerLesson;
      const end = Math.min(start + codesPerLesson, codes.length);
      distribution.push(codes.slice(start, end));
    }

    // Fill empty lessons with review
    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i].length === 0 && codes.length > 0) {
        distribution[i] = [codes[codes.length - 1]];  // Review last code
      }
    }

    return distribution;
  }

  private generateUnitOverview(request: any, lessons: GeneratedLessonPlan[]): string {
    return `This ${request.totalWeeks}-week unit covers ${request.curriculumCodes.length} curriculum standards through ${lessons.length} lessons. Students will progress from foundational concepts to application and extension.`;
  }

  private generateUnitAssessmentPlan(lessons: GeneratedLessonPlan[]): string[] {
    return [
      'Pre-assessment: Diagnostic task in Week 1',
      'Formative: Weekly check-ins and exit tickets',
      'Summative: End of unit assessment in final week',
      'Self-assessment: Reflection journal throughout'
    ];
  }

  private mergeSearchResults(
    semantic: ContentDescription[],
    keyword: ContentDescription[],
    concepts: string[]
  ): CurriculumSearchResult[] {
    const resultMap = new Map<string, CurriculumSearchResult>();
    
    // Add semantic results
    for (let i = 0; i < semantic.length; i++) {
      const content = semantic[i];
      resultMap.set(content.curriculumCode, {
        code: content.curriculumCode,
        description: content.description,
        yearLevel: content.yearLevel,
        subject: content.learningAreaId,
        relevanceScore: 1 - (i / semantic.length) * 0.5,
        matchType: 'semantic'
      });
    }

    // Merge keyword results
    for (let i = 0; i < keyword.length; i++) {
      const content = keyword[i];
      const existing = resultMap.get(content.curriculumCode);
      if (existing) {
        existing.relevanceScore = Math.min(1, existing.relevanceScore + 0.3);
        existing.matchType = 'both';
      } else {
        resultMap.set(content.curriculumCode, {
          code: content.curriculumCode,
          description: content.description,
          yearLevel: content.yearLevel,
          subject: content.learningAreaId,
          relevanceScore: 0.8 - (i / keyword.length) * 0.3,
          matchType: 'keyword'
        });
      }
    }

    return Array.from(resultMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generateSearchSuggestions(query: string, results: CurriculumSearchResult[]): string[] {
    const suggestions: string[] = [];
    
    if (results.length === 0) {
      suggestions.push('Try using different keywords');
      suggestions.push('Search for specific curriculum codes');
    } else {
      const subjects = [...new Set(results.slice(0, 5).map(r => r.subject))];
      if (subjects.length > 1) {
        suggestions.push(`Filter by subject: ${subjects.join(', ')}`);
      }
    }

    return suggestions;
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface ParsedCurriculum {
  learningAreas: LearningArea[];
  yearLevels: YearLevel[];
  generalCapabilities: GeneralCapability[];
  crossCurriculumPriorities: CrossCurriculumPriority[];
  totalObjectives: number;
}

interface IngestionStats {
  learningAreas: number;
  strands: number;
  contentDescriptions: number;
  yearLevels: number;
  processingTime: number;
}

interface GraphBuildStats {
  concepts: number;
  skills: number;
  contentNodes: number;
  relationships: number;
  frameworks: number;
}

interface ProgressionStep {
  code: string;
  description: string;
  yearLevel: string;
  bloomsLevel: BloomsLevel;
  estimatedHours: number;
  position: 'before' | 'current' | 'after';
}

interface CurriculumSearchResult {
  code: string;
  description: string;
  yearLevel: string;
  subject: string;
  relevanceScore: number;
  matchType: 'semantic' | 'keyword' | 'both';
}

export { CurriculumCuratorService };
