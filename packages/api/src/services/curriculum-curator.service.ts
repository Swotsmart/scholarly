/**
 * AI-Enabled Machine-Readable Curriculum Curator
 *
 * A semantic curriculum intelligence system that ingests, understands, connects,
 * and operationalises curriculum frameworks across multiple jurisdictions.
 *
 * ## Supported Frameworks
 *
 * | Framework | Jurisdiction | Format | Status |
 * |-----------|--------------|--------|--------|
 * | ACARA | Australia | RDF/XML | Primary |
 * | National Curriculum | England | XML | Supported |
 * | Common Core | USA | XML | Supported |
 * | IB Framework | International | XML | Supported |
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig,
  Jurisdiction
} from '@scholarly/shared/types/scholarly-types';
import { AIIntegrationService, getAIService } from './ai-integration.service';

// ============================================================================
// CORE CURRICULUM TYPES
// ============================================================================

export interface CurriculumFramework {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  version: string;
  jurisdiction: Jurisdiction;
  learningAreas: LearningArea[];
  yearLevels: YearLevel[];
  generalCapabilities: GeneralCapability[];
  crossCurriculumPriorities: CrossCurriculumPriority[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceUrl: string;
  sourceFormat: 'rdf' | 'xml' | 'json' | 'custom';
  ingestedAt: Date;
  lastUpdated: Date;
  totalObjectives: number;
  aiEnrichment: {
    conceptsExtracted: number;
    connectionsIdentified: number;
    taxonomyMapped: boolean;
    lastEnrichedAt: Date;
  };
}

export interface LearningArea {
  id: string;
  code: string;
  name: string;
  description: string;
  strands: Strand[];
  relatedAreas: string[];
  aiThemes: string[];
}

export interface Strand {
  id: string;
  code: string;
  name: string;
  description: string;
  learningAreaId: string;
  subStrands: SubStrand[];
}

export interface SubStrand {
  id: string;
  code: string;
  name: string;
  description: string;
  strandId: string;
  contentDescriptions: ContentDescription[];
}

export interface ContentDescription {
  id: string;
  curriculumCode: string;
  description: string;
  elaborations: string[];
  frameworkId: string;
  learningAreaId: string;
  strandId: string;
  subStrandId: string;
  yearLevel: string;
  bloomsLevel: BloomsLevel;
  bloomsVerbs: string[];
  prerequisites: string[];
  leadsTo: string[];
  crossCurricularLinks: CrossCurricularLink[];
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
  aiEnrichment: ContentAIEnrichment;
}

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface CrossCurricularLink {
  targetCode: string;
  targetFramework: string;
  linkType: 'prerequisite' | 'corequisite' | 'extends' | 'applies' | 'reinforces';
  strength: number;
  explanation: string;
  aiGenerated: boolean;
}

export interface ContentAIEnrichment {
  keyConcepts: string[];
  embedding?: number[];
  suggestedActivities: string[];
  commonMisconceptions: string[];
  assessmentIdeas: string[];
  cognitiveLoad: 'low' | 'medium' | 'high';
  estimatedTeachingHours: number;
  realWorldApplications: string[];
  equivalentCodes: { framework: string; code: string; similarity: number }[];
}

export interface YearLevel {
  id: string;
  code: string;
  name: string;
  ageRange: { min: number; max: number };
  sequence: number;
}

export interface GeneralCapability {
  id: string;
  code: string;
  name: string;
  description: string;
  elements: string[];
}

export interface CrossCurriculumPriority {
  id: string;
  code: string;
  name: string;
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
  concepts: ConceptNode[];
  skills: SkillNode[];
  contentNodes: ContentNode[];
  relationships: GraphRelationship[];
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
  relatedCodes: string[];
  embedding?: number[];
  synonyms: string[];
  parentConcepts: string[];
  childConcepts: string[];
  subjectsAppearing: string[];
}

export interface SkillNode {
  id: string;
  type: 'skill';
  name: string;
  description: string;
  bloomsLevel: BloomsLevel;
  taughtIn: string[];
  prerequisiteSkills: string[];
}

export interface ContentNode {
  id: string;
  type: 'content';
  curriculumCode: string;
  framework: string;
  yearLevel: string;
  subject: string;
  concepts: string[];
  skills: string[];
}

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number;
  source: 'curriculum' | 'ai_inferred' | 'teacher_validated';
  confidence: number;
  explanation?: string;
}

export type RelationshipType =
  | 'prerequisite'
  | 'corequisite'
  | 'extends'
  | 'applies'
  | 'reinforces'
  | 'contrasts'
  | 'equivalent'
  | 'contains_concept'
  | 'teaches_skill';

// ============================================================================
// CONTENT ALIGNMENT TYPES
// ============================================================================

export interface ContentItem {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: 'lesson_plan' | 'worksheet' | 'video' | 'assessment' | 'activity' | 'resource';
  contentText?: string;
  contentUrl?: string;
  manualAlignments: string[];
  aiAlignments: AIAlignment[];
  yearLevels: string[];
  subjects: string[];
  duration?: number;
  createdAt: Date;
  alignedAt?: Date;
}

export interface AIAlignment {
  curriculumCode: string;
  framework: string;
  confidence: number;
  alignmentType: 'primary' | 'secondary' | 'partial';
  matchedConcepts: string[];
  matchedSkills: string[];
  explanation: string;
  coverageDepth: 'introduces' | 'develops' | 'consolidates' | 'extends';
  estimatedCoverage: number;
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
  sourceCode: string;
  sourceFramework: string;
  connections: CrossCurricularConnection[];
  integratedUnitIdeas: IntegratedUnitIdea[];
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
  connectionType: RelationshipType;
  strength: number;
  sharedConcepts: string[];
  sharedSkills: string[];
  integrationIdea: string;
  discoveredBy: 'graph_traversal' | 'semantic_similarity' | 'concept_overlap' | 'teacher_validated';
}

export interface IntegratedUnitIdea {
  title: string;
  description: string;
  subjects: string[];
  yearLevel: string;
  curriculumCodes: string[];
  durationWeeks: number;
  keyActivities: string[];
  assessmentIdeas: string[];
  feasibilityScore: number;
  engagementPrediction: number;
}

// ============================================================================
// LESSON PLAN GENERATION TYPES
// ============================================================================

export interface LessonPlanRequest {
  tenantId: string;
  curriculumCodes: string[];
  yearLevel: string;
  subject: string;
  duration: number;
  teachingStyle?: 'direct' | 'inquiry' | 'collaborative' | 'flipped';
  resourceConstraints?: string[];
  differentiationNeeds?: string[];
  enableCrossCurricular?: boolean;
  preferredConnections?: string[];
  includeAssessment?: boolean;
  includeResources?: boolean;
  includeExtension?: boolean;
}

export interface GeneratedLessonPlan {
  id: string;
  tenantId: string;
  title: string;
  subject: string;
  yearLevel: string;
  duration: number;
  primaryCodes: string[];
  secondaryCodes: string[];
  generalCapabilities: string[];
  crossCurriculumPriorities: string[];
  learningIntentions: string[];
  successCriteria: string[];
  sections: LessonSection[];
  differentiation: {
    enabling: string[];
    extending: string[];
    esl: string[];
  };
  assessment?: {
    formative: string[];
    summative?: string;
    rubric?: RubricCriterion[];
  };
  resources: {
    required: string[];
    optional: string[];
    links: { title: string; url: string }[];
  };
  crossCurricularConnections?: {
    subject: string;
    connection: string;
    activity: string;
  }[];
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
  teacherActions: string[];
  studentActions: string[];
  resources?: string[];
  differentiationNotes?: string;
  assessmentOpportunity?: string;
}

export interface RubricCriterion {
  criterion: string;
  levels: { level: string; description: string; points: number }[];
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
// SUPPORTING TYPES
// ============================================================================

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

interface AlignmentScore {
  confidence: number;
  coverage: number;
  matchedConcepts: string[];
  matchedSkills: string[];
}

interface ParsedCurriculum {
  learningAreas: LearningArea[];
  yearLevels: YearLevel[];
  generalCapabilities: GeneralCapability[];
  crossCurriculumPriorities: CrossCurriculumPriority[];
  totalObjectives: number;
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
  private aiService: AIIntegrationService;

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
    this.aiService = getAIService();
  }

  // ==========================================================================
  // CURRICULUM INGESTION
  // ==========================================================================

  /**
   * Ingest a curriculum framework from RDF/XML source
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
      const parsed = await this.parseCurriculumSource(source);

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

      const savedFramework = await this.frameworkRepo.save(tenantId, framework);
      const contentDescriptions = this.extractContentDescriptions(parsed, savedFramework.id);
      await this.contentDescRepo.saveMany(tenantId, contentDescriptions);
      await this.buildInitialGraphNodes(tenantId, savedFramework, contentDescriptions);

      const stats: IngestionStats = {
        learningAreas: parsed.learningAreas.length,
        strands: parsed.learningAreas.reduce((sum, la) => sum + la.strands.length, 0),
        contentDescriptions: contentDescriptions.length,
        yearLevels: parsed.yearLevels.length,
        processingTime: 0
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
        const concepts = await this.extractConcepts(tenantId, content.description, content.yearLevel, content.learningAreaId);
        content.aiEnrichment.keyConcepts = concepts;
        conceptsExtracted += concepts.length;

        const blooms = await this.mapToBloomsTaxonomyAI(tenantId, content.description);
        content.bloomsLevel = blooms.level;
        content.bloomsVerbs = blooms.verbs;
        bloomsMapped++;

        content.aiEnrichment.embedding = await this.generateEmbeddingAI(tenantId, content.description);

        const prerequisites = await this.inferPrerequisites(tenantId, content, contentDescriptions);
        content.prerequisites = prerequisites;
        prerequisitesInferred += prerequisites.length;

        const connections = await this.findCrossCurricularConnectionsAI(tenantId, content);
        content.crossCurricularLinks = connections;
        connectionsIdentified += connections.length;

        content.aiEnrichment.suggestedActivities = await this.generateActivitySuggestionsAI(tenantId, content);
        content.aiEnrichment.commonMisconceptions = await this.identifyMisconceptionsAI(tenantId, content);
        content.aiEnrichment.realWorldApplications = await this.findRealWorldApplicationsAI(tenantId, content);

        await this.contentDescRepo.save(tenantId, content);
      }

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
      const frameworks = options?.frameworkIds
        ? await Promise.all(options.frameworkIds.map(id => this.frameworkRepo.findById(tenantId, id)))
        : await this.frameworkRepo.findAll(tenantId);

      const validFrameworks = frameworks.filter((f): f is CurriculumFramework => f !== null);

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

      const conceptMap = new Map<string, ConceptNode>();
      const skillMap = new Map<string, SkillNode>();

      for (const framework of validFrameworks) {
        const contents = await this.contentDescRepo.findByFramework(tenantId, framework.id);

        for (const content of contents) {
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
        }
      }

      graph.concepts = Array.from(conceptMap.values());
      graph.skills = Array.from(skillMap.values());

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

      if (options?.includePrerequisites !== false) {
        const prereqs = await this.getPrerequisiteChain(tenantId, startCode, depth);
        progression.push(...prereqs.map(p => ({ ...p, position: 'before' as const })));
      }

      progression.push({
        code: content.curriculumCode,
        description: content.description,
        yearLevel: content.yearLevel,
        bloomsLevel: content.bloomsLevel,
        estimatedHours: content.aiEnrichment.estimatedTeachingHours,
        position: 'current'
      });

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

      const contentEmbedding = await this.generateEmbeddingAI(tenantId, request.contentText);
      const contentConcepts = await this.extractConcepts(tenantId, request.contentText, request.yearLevelHint || '', request.subjectHint || '');
      const contentBlooms = await this.mapToBloomsTaxonomyAI(tenantId, request.contentText);

      const similarContent = await this.contentDescRepo.findSimilar(tenantId, contentEmbedding, 20);

      const alignments: AIAlignment[] = [];

      for (const candidate of similarContent) {
        if (request.targetFrameworks.length > 0) {
          const framework = await this.frameworkRepo.findById(tenantId, candidate.frameworkId);
          if (framework && !request.targetFrameworks.includes(framework.code)) continue;
        }

        const score = this.calculateAlignmentScore(
          { concepts: contentConcepts, blooms: contentBlooms, embedding: contentEmbedding },
          candidate
        );

        if (score.confidence > 0.5) {
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

      alignments.sort((a, b) => b.confidence - a.confidence);

      await this.contentItemRepo.updateAlignments(tenantId, request.contentId, alignments);

      const processingTime = Date.now() - startTime;

      await this.publishEvent('scholarly.curriculum.content_aligned', tenantId, {
        contentId: request.contentId,
        alignmentsFound: alignments.length,
        topAlignment: alignments[0]?.curriculumCode
      });

      return {
        contentId: request.contentId,
        alignments: alignments.slice(0, 10),
        processingTime,
        confidence: alignments[0]?.confidence || 0,
        suggestions: this.generateAlignmentSuggestions(alignments)
      };
    }, { contentId: request.contentId });
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

      const graphConnections = await this.findGraphConnections(tenantId, content);
      const semanticConnections = await this.findSemanticConnections(tenantId, content, options?.targetSubjects);
      const conceptConnections = await this.findConceptConnections(tenantId, content);

      const allConnections = this.mergeConnections(graphConnections, semanticConnections, conceptConnections);

      const filteredConnections = allConnections
        .filter(c => c.strength >= minStrength)
        .filter(c => !options?.targetSubjects || options.targetSubjects.includes(c.targetSubject))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, maxConnections);

      const unitIdeas = await this.generateIntegratedUnitIdeas(tenantId, content, filteredConnections);
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
      const contents: ContentDescription[] = [];
      for (const code of request.curriculumCodes) {
        const content = await this.contentDescRepo.findByCode(tenantId, code);
        if (content) contents.push(content);
      }

      if (contents.length === 0) {
        throw new ValidationError('No valid curriculum codes found');
      }

      const learningIntentions = await this.generateLearningIntentionsAI(tenantId, contents);
      const successCriteria = await this.generateSuccessCriteriaAI(tenantId, contents, learningIntentions);

      const sections = await this.designLessonStructureAI(
        tenantId,
        request.duration,
        request.teachingStyle || 'direct',
        contents
      );

      const differentiation = await this.generateDifferentiationAI(tenantId, contents, request.differentiationNeeds);

      const assessment = request.includeAssessment
        ? await this.generateAssessmentAI(tenantId, contents, learningIntentions)
        : undefined;

      const resources = await this.identifyResourcesAI(tenantId, contents, request.resourceConstraints);

      let crossCurricularConnections;
      if (request.enableCrossCurricular) {
        const discoveries = await Promise.all(
          request.curriculumCodes.map(code => this.discoverCrossCurricular(tenantId, code, {
            maxConnections: 3,
            targetSubjects: request.preferredConnections
          }))
        );

        crossCurricularConnections = discoveries
          .filter((d): d is { success: true; data: CrossCurricularDiscovery } => d.success)
          .flatMap(d => d.data.connections.slice(0, 2))
          .map(c => ({
            subject: c.targetSubject,
            connection: c.integrationIdea,
            activity: `Connect to ${c.targetSubject}: ${c.sharedConcepts.join(', ')}`
          }));
      }

      const generalCapabilities = [...new Set(contents.flatMap(c => c.generalCapabilities))];
      const crossCurriculumPriorities = [...new Set(contents.flatMap(c => c.crossCurriculumPriorities))];

      const title = await this.generateLessonTitleAI(tenantId, contents);

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
          alignmentScore: this.assessAlignmentScoreVal(contents, learningIntentions),
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

  // ==========================================================================
  // PRIVATE HELPER METHODS WITH REAL AI INTEGRATION
  // ==========================================================================

  private async parseCurriculumSource(source: { sourceFormat: string; rawContent: string }): Promise<ParsedCurriculum> {
    // Parse RDF/XML/JSON curriculum sources
    if (source.sourceFormat === 'json') {
      try {
        const data = JSON.parse(source.rawContent);
        return {
          learningAreas: data.learningAreas || [],
          yearLevels: data.yearLevels || [],
          generalCapabilities: data.generalCapabilities || [],
          crossCurriculumPriorities: data.crossCurriculumPriorities || [],
          totalObjectives: data.totalObjectives || 0
        };
      } catch {
        return { learningAreas: [], yearLevels: [], generalCapabilities: [], crossCurriculumPriorities: [], totalObjectives: 0 };
      }
    }

    // For XML/RDF, use AI to extract structure
    const result = await this.aiService.structuredOutput<ParsedCurriculum>('system', {
      prompt: `Parse this curriculum document and extract the structure:\n\n${source.rawContent.slice(0, 10000)}`,
      schema: {
        type: 'object',
        properties: {
          learningAreas: { type: 'array' },
          yearLevels: { type: 'array' },
          generalCapabilities: { type: 'array' },
          crossCurriculumPriorities: { type: 'array' },
          totalObjectives: { type: 'number' }
        }
      },
      systemContext: 'You are an expert curriculum analyst. Extract curriculum structure from the provided document.'
    });

    return result.success ? result.data : { learningAreas: [], yearLevels: [], generalCapabilities: [], crossCurriculumPriorities: [], totalObjectives: 0 };
  }

  private extractContentDescriptions(parsed: ParsedCurriculum, frameworkId: string): ContentDescription[] {
    const descriptions: ContentDescription[] = [];

    for (const area of parsed.learningAreas) {
      for (const strand of area.strands || []) {
        for (const subStrand of strand.subStrands || []) {
          for (const cd of subStrand.contentDescriptions || []) {
            const cdAny = cd as any;
            descriptions.push({
              id: cd.id || this.generateId('cd'),
              curriculumCode: cdAny.code || cd.curriculumCode || `${area.code}.${strand.code}.${subStrand.code}`,
              description: cd.description || '',
              elaborations: cd.elaborations || [],
              frameworkId,
              learningAreaId: area.id,
              strandId: strand.id,
              subStrandId: subStrand.id,
              yearLevel: cd.yearLevel || '',
              bloomsLevel: 'understand',
              bloomsVerbs: [],
              prerequisites: [],
              leadsTo: [],
              crossCurricularLinks: [],
              generalCapabilities: cd.generalCapabilities || [],
              crossCurriculumPriorities: cd.crossCurriculumPriorities || [],
              aiEnrichment: {
                keyConcepts: [],
                suggestedActivities: [],
                commonMisconceptions: [],
                assessmentIdeas: [],
                cognitiveLoad: 'medium',
                estimatedTeachingHours: 1,
                realWorldApplications: [],
                equivalentCodes: []
              }
            });
          }
        }
      }
    }

    return descriptions;
  }

  private async buildInitialGraphNodes(tenantId: string, framework: CurriculumFramework, contents: ContentDescription[]): Promise<void> {
    for (const content of contents) {
      await this.graphRepo.addNode(tenantId, {
        id: `content_${content.curriculumCode}`,
        type: 'content',
        curriculumCode: content.curriculumCode,
        framework: framework.code,
        yearLevel: content.yearLevel,
        subject: content.learningAreaId,
        concepts: [],
        skills: []
      });
    }
  }

  private async extractConcepts(tenantId: string, text: string, yearLevel: string, subject: string): Promise<string[]> {
    const result = await this.aiService.extractConcepts(tenantId, text, yearLevel, subject);
    return result.success ? result.data.concepts : [];
  }

  private async mapToBloomsTaxonomyAI(tenantId: string, text: string): Promise<{ level: BloomsLevel; verbs: string[] }> {
    const result = await this.aiService.mapToBloomsTaxonomy(tenantId, text);
    if (result.success) {
      return {
        level: result.data.level as BloomsLevel,
        verbs: result.data.verbs
      };
    }

    // Fallback: pattern-based mapping
    const lowerText = text.toLowerCase();
    const bloomsPatterns: { level: BloomsLevel; verbs: string[]; patterns: string[] }[] = [
      { level: 'remember', verbs: ['recall', 'identify', 'list', 'name'], patterns: ['recall', 'identify', 'list', 'name', 'define', 'recognize'] },
      { level: 'understand', verbs: ['explain', 'describe', 'summarize'], patterns: ['explain', 'describe', 'summarize', 'interpret', 'classify'] },
      { level: 'apply', verbs: ['use', 'apply', 'demonstrate'], patterns: ['use', 'apply', 'demonstrate', 'solve', 'implement'] },
      { level: 'analyze', verbs: ['compare', 'contrast', 'examine'], patterns: ['compare', 'contrast', 'analyze', 'examine', 'differentiate'] },
      { level: 'evaluate', verbs: ['assess', 'evaluate', 'judge'], patterns: ['assess', 'evaluate', 'judge', 'critique', 'justify'] },
      { level: 'create', verbs: ['create', 'design', 'develop'], patterns: ['create', 'design', 'develop', 'construct', 'produce'] }
    ];

    for (const { level, verbs, patterns } of bloomsPatterns.reverse()) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { level, verbs };
      }
    }

    return { level: 'understand', verbs: ['explain', 'describe'] };
  }

  private async generateEmbeddingAI(tenantId: string, text: string): Promise<number[]> {
    const result = await this.aiService.embed(tenantId, { text });
    return result.success ? result.data.embeddings[0] : new Array(1536).fill(0);
  }

  private async inferPrerequisites(tenantId: string, content: ContentDescription, allContents: ContentDescription[]): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ prerequisites: string[] }>(tenantId, {
      prompt: `Given this curriculum content description:
"${content.description}"

And these other curriculum codes from the same framework:
${allContents.slice(0, 50).map(c => `- ${c.curriculumCode}: ${c.description}`).join('\n')}

Identify which curriculum codes are likely prerequisites for this content. Return only codes that students should understand BEFORE learning this content.`,
      schema: {
        type: 'object',
        properties: {
          prerequisites: { type: 'array', items: { type: 'string' } }
        },
        required: ['prerequisites']
      },
      systemContext: 'You are an expert curriculum analyst identifying learning prerequisites.'
    });

    return result.success ? result.data.prerequisites : [];
  }

  private async findCrossCurricularConnectionsAI(tenantId: string, content: ContentDescription): Promise<CrossCurricularLink[]> {
    const result = await this.aiService.discoverCrossCurricular(
      tenantId,
      content.description,
      content.learningAreaId,
      content.yearLevel
    );

    if (!result.success) return [];

    return result.data.connections.map(c => ({
      targetCode: `${c.targetSubject}.${content.yearLevel}`,
      targetFramework: 'ACARA',
      linkType: 'applies' as const,
      strength: c.strength / 10,
      explanation: c.connectionPoint,
      aiGenerated: true
    }));
  }

  private async generateActivitySuggestionsAI(tenantId: string, content: ContentDescription): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ activities: string[] }>(tenantId, {
      prompt: `Suggest 5 engaging learning activities for this curriculum content:
"${content.description}"
Year Level: ${content.yearLevel}
Subject: ${content.learningAreaId}

Provide practical, classroom-ready activities.`,
      schema: {
        type: 'object',
        properties: {
          activities: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are an experienced teacher suggesting engaging activities.'
    });

    return result.success ? result.data.activities : [];
  }

  private async identifyMisconceptionsAI(tenantId: string, content: ContentDescription): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ misconceptions: string[] }>(tenantId, {
      prompt: `What are common student misconceptions when learning this content?
"${content.description}"
Year Level: ${content.yearLevel}
Subject: ${content.learningAreaId}

List 3-5 common misconceptions students have.`,
      schema: {
        type: 'object',
        properties: {
          misconceptions: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are an experienced educator identifying common student misconceptions.'
    });

    return result.success ? result.data.misconceptions : [];
  }

  private async findRealWorldApplicationsAI(tenantId: string, content: ContentDescription): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ applications: string[] }>(tenantId, {
      prompt: `What are real-world applications of this curriculum content?
"${content.description}"
Year Level: ${content.yearLevel}
Subject: ${content.learningAreaId}

Provide 3-5 concrete, age-appropriate real-world examples.`,
      schema: {
        type: 'object',
        properties: {
          applications: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are connecting curriculum content to real-world applications.'
    });

    return result.success ? result.data.applications : [];
  }

  private normalizeConceptId(concept: string): string {
    return `concept_${concept.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
  }

  private identifyStrongestClusters(graph: CurriculumKnowledgeGraph): string[] {
    // Find concepts that appear in multiple subjects
    const conceptSubjects = new Map<string, Set<string>>();

    for (const concept of graph.concepts) {
      const subjects = new Set(concept.subjectsAppearing);
      conceptSubjects.set(concept.id, subjects);
    }

    return Array.from(conceptSubjects.entries())
      .filter(([_, subjects]) => subjects.size >= 2)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([id]) => id);
  }

  private async getPrerequisiteChain(tenantId: string, code: string, depth: number): Promise<ProgressionStep[]> {
    const steps: ProgressionStep[] = [];
    const visited = new Set<string>();
    let currentCodes = [code];

    for (let d = 0; d < depth && currentCodes.length > 0; d++) {
      const nextCodes: string[] = [];

      for (const currCode of currentCodes) {
        if (visited.has(currCode)) continue;
        visited.add(currCode);

        const content = await this.contentDescRepo.findByCode(tenantId, currCode);
        if (content && content.prerequisites.length > 0) {
          for (const prereq of content.prerequisites) {
            if (!visited.has(prereq)) {
              const prereqContent = await this.contentDescRepo.findByCode(tenantId, prereq);
              if (prereqContent) {
                steps.unshift({
                  code: prereq,
                  description: prereqContent.description,
                  yearLevel: prereqContent.yearLevel,
                  bloomsLevel: prereqContent.bloomsLevel,
                  estimatedHours: prereqContent.aiEnrichment.estimatedTeachingHours,
                  position: 'before'
                });
                nextCodes.push(prereq);
              }
            }
          }
        }
      }

      currentCodes = nextCodes;
    }

    return steps;
  }

  private async getExtensionChain(tenantId: string, code: string, depth: number): Promise<ProgressionStep[]> {
    const steps: ProgressionStep[] = [];
    const visited = new Set<string>();
    let currentCodes = [code];

    for (let d = 0; d < depth && currentCodes.length > 0; d++) {
      const nextCodes: string[] = [];

      for (const currCode of currentCodes) {
        if (visited.has(currCode)) continue;
        visited.add(currCode);

        const content = await this.contentDescRepo.findByCode(tenantId, currCode);
        if (content && content.leadsTo.length > 0) {
          for (const next of content.leadsTo) {
            if (!visited.has(next)) {
              const nextContent = await this.contentDescRepo.findByCode(tenantId, next);
              if (nextContent) {
                steps.push({
                  code: next,
                  description: nextContent.description,
                  yearLevel: nextContent.yearLevel,
                  bloomsLevel: nextContent.bloomsLevel,
                  estimatedHours: nextContent.aiEnrichment.estimatedTeachingHours,
                  position: 'after'
                });
                nextCodes.push(next);
              }
            }
          }
        }
      }

      currentCodes = nextCodes;
    }

    return steps;
  }

  private calculateAlignmentScore(
    contentFeatures: { concepts: string[]; blooms: { level: BloomsLevel; verbs: string[] }; embedding: number[] },
    candidate: ContentDescription
  ): AlignmentScore {
    // Calculate concept overlap
    const matchedConcepts = contentFeatures.concepts.filter(c =>
      candidate.aiEnrichment.keyConcepts.some(k => k.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(k.toLowerCase()))
    );

    // Calculate skill overlap (Bloom's verbs)
    const matchedSkills = contentFeatures.blooms.verbs.filter(v =>
      candidate.bloomsVerbs.some(bv => bv.toLowerCase() === v.toLowerCase())
    );

    // Calculate embedding similarity (cosine similarity)
    let embeddingSimilarity = 0;
    if (contentFeatures.embedding.length > 0 && candidate.aiEnrichment.embedding && candidate.aiEnrichment.embedding.length > 0) {
      const dotProduct = contentFeatures.embedding.reduce((sum, val, i) => sum + val * (candidate.aiEnrichment.embedding![i] || 0), 0);
      const norm1 = Math.sqrt(contentFeatures.embedding.reduce((sum, val) => sum + val * val, 0));
      const norm2 = Math.sqrt(candidate.aiEnrichment.embedding.reduce((sum, val) => sum + val * val, 0));
      embeddingSimilarity = norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0;
    }

    // Combine scores
    const conceptScore = matchedConcepts.length / Math.max(1, contentFeatures.concepts.length);
    const skillScore = matchedSkills.length / Math.max(1, contentFeatures.blooms.verbs.length);

    const confidence = (conceptScore * 0.3 + skillScore * 0.2 + embeddingSimilarity * 0.5);
    const coverage = Math.round((matchedConcepts.length / Math.max(1, candidate.aiEnrichment.keyConcepts.length)) * 100);

    return {
      confidence: Math.min(1, Math.max(0, confidence)),
      coverage: Math.min(100, Math.max(0, coverage)),
      matchedConcepts,
      matchedSkills
    };
  }

  private generateAlignmentExplanation(score: AlignmentScore): string {
    const parts: string[] = [];

    if (score.matchedConcepts.length > 0) {
      parts.push(`Aligned on concepts: ${score.matchedConcepts.slice(0, 3).join(', ')}`);
    }
    if (score.matchedSkills.length > 0) {
      parts.push(`Matching skills: ${score.matchedSkills.join(', ')}`);
    }

    parts.push(`Coverage: ${score.coverage}%, Confidence: ${Math.round(score.confidence * 100)}%`);

    return parts.join('. ');
  }

  private assessCoverageDepth(text: string, candidate: ContentDescription): 'introduces' | 'develops' | 'consolidates' | 'extends' {
    const lowerText = text.toLowerCase();
    const candidateConcepts = candidate.aiEnrichment.keyConcepts.map(c => c.toLowerCase());

    // Count how many concepts are mentioned and how deeply
    let mentionCount = 0;
    let detailedCount = 0;

    for (const concept of candidateConcepts) {
      const regex = new RegExp(concept, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        mentionCount++;
        if (matches.length > 2) detailedCount++;
      }
    }

    const coverage = mentionCount / Math.max(1, candidateConcepts.length);

    if (coverage < 0.3) return 'introduces';
    if (coverage < 0.5) return 'develops';
    if (coverage < 0.8) return 'consolidates';
    return 'extends';
  }

  private generateAlignmentSuggestions(alignments: AIAlignment[]): string[] {
    const suggestions: string[] = [];

    if (alignments.length === 0) {
      suggestions.push('Consider adding curriculum-specific keywords to improve alignment');
      suggestions.push('Include learning objectives that match curriculum standards');
    }

    const partialAlignments = alignments.filter(a => a.alignmentType === 'partial');
    if (partialAlignments.length > alignments.length * 0.5) {
      suggestions.push('Content shows partial alignment - consider deeper coverage of key concepts');
    }

    const lowConfidence = alignments.filter(a => a.confidence < 0.6);
    if (lowConfidence.length > 0) {
      suggestions.push('Some alignments have low confidence - review and verify manually');
    }

    return suggestions;
  }

  private async findGraphConnections(tenantId: string, content: ContentDescription): Promise<CrossCurricularConnection[]> {
    const connections: CrossCurricularConnection[] = [];
    const nodeId = `content_${content.curriculumCode}`;

    const graphRelationships = await this.graphRepo.findConnections(tenantId, nodeId, 2);

    for (const rel of graphRelationships) {
      if (rel.type === 'equivalent' || rel.type === 'applies' || rel.type === 'reinforces') {
        const targetContent = await this.contentDescRepo.findByCode(tenantId, rel.targetId.replace('content_', ''));
        if (targetContent && targetContent.learningAreaId !== content.learningAreaId) {
          connections.push({
            targetCode: targetContent.curriculumCode,
            targetFramework: targetContent.frameworkId,
            targetSubject: targetContent.learningAreaId,
            targetYearLevel: targetContent.yearLevel,
            targetDescription: targetContent.description,
            connectionType: rel.type,
            strength: rel.strength,
            sharedConcepts: [],
            sharedSkills: [],
            integrationIdea: `Integrate ${content.learningAreaId} with ${targetContent.learningAreaId} through shared concepts`,
            discoveredBy: 'graph_traversal'
          });
        }
      }
    }

    return connections;
  }

  private async findSemanticConnections(tenantId: string, content: ContentDescription, targetSubjects?: string[]): Promise<CrossCurricularConnection[]> {
    const connections: CrossCurricularConnection[] = [];

    if (!content.aiEnrichment.embedding || content.aiEnrichment.embedding.length === 0) {
      return connections;
    }

    const similar = await this.contentDescRepo.findSimilar(tenantId, content.aiEnrichment.embedding, 20);

    for (const candidate of similar) {
      if (candidate.learningAreaId === content.learningAreaId) continue;
      if (targetSubjects && !targetSubjects.includes(candidate.learningAreaId)) continue;

      const sharedConcepts = content.aiEnrichment.keyConcepts.filter(c =>
        candidate.aiEnrichment.keyConcepts.some(k => k.toLowerCase().includes(c.toLowerCase()))
      );

      if (sharedConcepts.length > 0) {
        connections.push({
          targetCode: candidate.curriculumCode,
          targetFramework: candidate.frameworkId,
          targetSubject: candidate.learningAreaId,
          targetYearLevel: candidate.yearLevel,
          targetDescription: candidate.description,
          connectionType: 'applies',
          strength: 0.5 + (sharedConcepts.length * 0.1),
          sharedConcepts,
          sharedSkills: [],
          integrationIdea: `Connect through shared concepts: ${sharedConcepts.slice(0, 3).join(', ')}`,
          discoveredBy: 'semantic_similarity'
        });
      }
    }

    return connections.slice(0, 10);
  }

  private async findConceptConnections(tenantId: string, content: ContentDescription): Promise<CrossCurricularConnection[]> {
    const connections: CrossCurricularConnection[] = [];

    for (const concept of content.aiEnrichment.keyConcepts.slice(0, 5)) {
      const conceptId = this.normalizeConceptId(concept);
      const graph = await this.graphRepo.findByTenant(tenantId);

      if (graph) {
        const conceptNode = graph.concepts.find(c => c.id === conceptId);
        if (conceptNode && conceptNode.subjectsAppearing.length > 1) {
          for (const subject of conceptNode.subjectsAppearing) {
            if (subject !== content.learningAreaId) {
              const relatedCodes = conceptNode.relatedCodes.filter(code => code.startsWith(subject));
              if (relatedCodes.length > 0) {
                const relatedContent = await this.contentDescRepo.findByCode(tenantId, relatedCodes[0]);
                if (relatedContent) {
                  connections.push({
                    targetCode: relatedContent.curriculumCode,
                    targetFramework: relatedContent.frameworkId,
                    targetSubject: subject,
                    targetYearLevel: relatedContent.yearLevel,
                    targetDescription: relatedContent.description,
                    connectionType: 'applies',
                    strength: 0.7,
                    sharedConcepts: [concept],
                    sharedSkills: [],
                    integrationIdea: `Both subjects explore the concept of "${concept}"`,
                    discoveredBy: 'concept_overlap'
                  });
                }
              }
            }
          }
        }
      }
    }

    return connections;
  }

  private mergeConnections(...connectionArrays: CrossCurricularConnection[][]): CrossCurricularConnection[] {
    const merged = new Map<string, CrossCurricularConnection>();

    for (const connections of connectionArrays) {
      for (const conn of connections) {
        const key = `${conn.targetCode}-${conn.targetSubject}`;
        const existing = merged.get(key);

        if (!existing || conn.strength > existing.strength) {
          merged.set(key, conn);
        } else if (existing) {
          // Merge shared concepts and skills
          existing.sharedConcepts = [...new Set([...existing.sharedConcepts, ...conn.sharedConcepts])];
          existing.sharedSkills = [...new Set([...existing.sharedSkills, ...conn.sharedSkills])];
          existing.strength = Math.max(existing.strength, conn.strength);
        }
      }
    }

    return Array.from(merged.values());
  }

  private async generateIntegratedUnitIdeas(tenantId: string, content: ContentDescription, connections: CrossCurricularConnection[]): Promise<IntegratedUnitIdea[]> {
    if (connections.length === 0) return [];

    const subjects = [...new Set(connections.map(c => c.targetSubject))].slice(0, 3);
    const sharedConcepts = [...new Set(connections.flatMap(c => c.sharedConcepts))].slice(0, 5);

    const result = await this.aiService.structuredOutput<{ units: IntegratedUnitIdea[] }>(tenantId, {
      prompt: `Design 2-3 integrated unit ideas that connect:
Primary Subject: ${content.learningAreaId}
Connected Subjects: ${subjects.join(', ')}
Shared Concepts: ${sharedConcepts.join(', ')}
Year Level: ${content.yearLevel}

Primary Content: "${content.description}"

Create engaging, practical integrated unit ideas that authentically connect these subjects.`,
      schema: {
        type: 'object',
        properties: {
          units: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                subjects: { type: 'array', items: { type: 'string' } },
                yearLevel: { type: 'string' },
                curriculumCodes: { type: 'array', items: { type: 'string' } },
                durationWeeks: { type: 'number' },
                keyActivities: { type: 'array', items: { type: 'string' } },
                assessmentIdeas: { type: 'array', items: { type: 'string' } },
                feasibilityScore: { type: 'number' },
                engagementPrediction: { type: 'number' }
              }
            }
          }
        }
      },
      systemContext: 'You are an expert curriculum designer creating integrated units.'
    });

    return result.success ? result.data.units : [];
  }

  private calculateSubjectStrengths(connections: CrossCurricularConnection[]): { subject: string; strength: number }[] {
    const subjectMap = new Map<string, number[]>();
    for (const c of connections) {
      if (!subjectMap.has(c.targetSubject)) {
        subjectMap.set(c.targetSubject, []);
      }
      subjectMap.get(c.targetSubject)!.push(c.strength);
    }
    return Array.from(subjectMap.entries()).map(([subject, strengths]) => ({
      subject,
      strength: strengths.reduce((a, b) => a + b, 0) / strengths.length
    })).sort((a, b) => b.strength - a.strength);
  }

  private async generateLearningIntentionsAI(tenantId: string, contents: ContentDescription[]): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ intentions: string[] }>(tenantId, {
      prompt: `Generate clear, measurable learning intentions for a lesson covering:
${contents.map(c => `- ${c.curriculumCode}: ${c.description}`).join('\n')}

Create 2-4 learning intentions that:
- Start with "Students will..."
- Are specific and measurable
- Use appropriate Bloom's taxonomy verbs
- Are appropriate for the year level`,
      schema: {
        type: 'object',
        properties: {
          intentions: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are an expert teacher writing learning intentions aligned to curriculum.'
    });

    if (result.success) return result.data.intentions;

    // Fallback
    return contents.map(c => `Students will ${c.bloomsVerbs[0] || 'understand'} ${c.description}`);
  }

  private async generateSuccessCriteriaAI(tenantId: string, contents: ContentDescription[], intentions: string[]): Promise<string[]> {
    const result = await this.aiService.structuredOutput<{ criteria: string[] }>(tenantId, {
      prompt: `Generate success criteria for these learning intentions:
${intentions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Create 3-5 success criteria that:
- Start with "I can..."
- Are observable and measurable
- Progress from simple to complex
- Help students self-assess their learning`,
      schema: {
        type: 'object',
        properties: {
          criteria: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are an expert teacher writing success criteria for student self-assessment.'
    });

    return result.success ? result.data.criteria : ['I can explain the key concepts', 'I can apply the learned skills'];
  }

  private async designLessonStructureAI(tenantId: string, duration: number, style: string, contents: ContentDescription[]): Promise<LessonSection[]> {
    const result = await this.aiService.generateLessonPlan(tenantId, {
      curriculumDescriptions: contents.map(c => c.description),
      yearLevel: contents[0]?.yearLevel || 'Year 7',
      subject: contents[0]?.learningAreaId || 'General',
      duration,
      teachingStyle: style,
      differentiationNeeds: [],
      includeAssessment: true
    });

    if (result.success) {
      return result.data.sections.map(s => ({
        name: s.name,
        duration: s.duration,
        type: s.type as LessonSection['type'],
        teacherActions: s.teacherActions,
        studentActions: s.studentActions,
        resources: s.resources,
        differentiationNotes: s.differentiation
      }));
    }

    // Fallback to basic structure
    return this.createDefaultLessonStructure(duration, style);
  }

  private createDefaultLessonStructure(duration: number, style: string): LessonSection[] {
    const sections: LessonSection[] = [];
    const introTime = Math.floor(duration * 0.1);
    const mainTime = Math.floor(duration * 0.7);
    const closureTime = duration - introTime - mainTime;

    sections.push({
      name: 'Introduction',
      duration: introTime,
      type: 'introduction',
      teacherActions: ['Review prior knowledge', 'Introduce learning intentions'],
      studentActions: ['Participate in discussion', 'Review success criteria']
    });

    sections.push({
      name: style === 'inquiry' ? 'Inquiry Activity' : 'Direct Instruction',
      duration: Math.floor(mainTime * 0.4),
      type: style === 'inquiry' ? 'guided_practice' : 'direct_instruction',
      teacherActions: ['Model concepts', 'Provide examples'],
      studentActions: ['Take notes', 'Ask questions']
    });

    sections.push({
      name: 'Practice',
      duration: Math.floor(mainTime * 0.6),
      type: 'independent_practice',
      teacherActions: ['Circulate and support', 'Provide feedback'],
      studentActions: ['Complete practice activities', 'Self-assess progress']
    });

    sections.push({
      name: 'Closure',
      duration: closureTime,
      type: 'closure',
      teacherActions: ['Summarize key learning', 'Preview next lesson'],
      studentActions: ['Reflect on learning', 'Complete exit ticket']
    });

    return sections;
  }

  private async generateDifferentiationAI(tenantId: string, contents: ContentDescription[], needs?: string[]): Promise<{ enabling: string[]; extending: string[]; esl: string[] }> {
    const result = await this.aiService.structuredOutput<{ enabling: string[]; extending: string[]; esl: string[] }>(tenantId, {
      prompt: `Generate differentiation strategies for teaching this content:
${contents.map(c => c.description).join('\n')}

Year Level: ${contents[0]?.yearLevel || 'Year 7'}
Special needs to consider: ${needs?.join(', ') || 'General classroom'}

Provide:
1. Enabling prompts/scaffolds for students who need support
2. Extending activities for students who need challenge
3. ESL/EAL support strategies`,
      schema: {
        type: 'object',
        properties: {
          enabling: { type: 'array', items: { type: 'string' } },
          extending: { type: 'array', items: { type: 'string' } },
          esl: { type: 'array', items: { type: 'string' } }
        }
      },
      systemContext: 'You are an expert in differentiated instruction and inclusive education.'
    });

    return result.success ? result.data : {
      enabling: ['Provide scaffolded worksheets', 'Allow partner work', 'Use visual aids'],
      extending: ['Provide extension problems', 'Encourage deeper exploration'],
      esl: ['Pre-teach vocabulary', 'Provide bilingual resources']
    };
  }

  private async generateAssessmentAI(tenantId: string, contents: ContentDescription[], intentions: string[]): Promise<{ formative: string[]; summative?: string; rubric?: RubricCriterion[] }> {
    const result = await this.aiService.structuredOutput<{ formative: string[]; summative: string; rubric: RubricCriterion[] }>(tenantId, {
      prompt: `Design assessment opportunities for this lesson:
Learning Intentions: ${intentions.join('; ')}
Content: ${contents.map(c => c.description).join('; ')}

Create:
1. 3-4 formative assessment strategies (quick checks during the lesson)
2. A summative assessment idea
3. A rubric with 3 levels for one key criterion`,
      schema: {
        type: 'object',
        properties: {
          formative: { type: 'array', items: { type: 'string' } },
          summative: { type: 'string' },
          rubric: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                criterion: { type: 'string' },
                levels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      level: { type: 'string' },
                      description: { type: 'string' },
                      points: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      systemContext: 'You are an expert in assessment design.'
    });

    return result.success ? result.data : {
      formative: ['Exit ticket', 'Observation checklist', 'Self-assessment'],
      summative: 'End-of-unit test',
      rubric: [{
        criterion: 'Understanding',
        levels: [
          { level: 'Emerging', description: 'Demonstrates basic understanding', points: 1 },
          { level: 'Developing', description: 'Demonstrates solid understanding', points: 2 },
          { level: 'Proficient', description: 'Demonstrates thorough understanding', points: 3 }
        ]
      }]
    };
  }

  private async identifyResourcesAI(tenantId: string, contents: ContentDescription[], constraints?: string[]): Promise<{ required: string[]; optional: string[]; links: { title: string; url: string }[] }> {
    const result = await this.aiService.structuredOutput<{ required: string[]; optional: string[]; links: { title: string; url: string }[] }>(tenantId, {
      prompt: `Identify resources needed for teaching this content:
${contents.map(c => c.description).join('\n')}

Constraints: ${constraints?.join(', ') || 'Standard classroom'}

List:
1. Required resources (essential for the lesson)
2. Optional resources (would enhance the lesson)
3. Useful web links (educational websites)`,
      schema: {
        type: 'object',
        properties: {
          required: { type: 'array', items: { type: 'string' } },
          optional: { type: 'array', items: { type: 'string' } },
          links: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      },
      systemContext: 'You are an experienced teacher recommending resources.'
    });

    return result.success ? result.data : {
      required: ['Whiteboard', 'Student notebooks'],
      optional: ['Digital device', 'Manipulatives'],
      links: []
    };
  }

  private async generateLessonTitleAI(tenantId: string, contents: ContentDescription[]): Promise<string> {
    const result = await this.aiService.complete(tenantId, {
      messages: [{
        role: 'user',
        content: `Create an engaging lesson title (5-10 words) for content covering:
${contents.map(c => c.description).slice(0, 3).join('\n')}

Year Level: ${contents[0]?.yearLevel || 'Year 7'}
Subject: ${contents[0]?.learningAreaId || 'General'}

Return ONLY the title, nothing else.`
      }],
      maxTokens: 50,
      temperature: 0.7
    });

    if (result.success && result.data.content) {
      return result.data.content.replace(/["']/g, '').trim();
    }

    const mainConcepts = contents.flatMap(c => c.aiEnrichment.keyConcepts).slice(0, 3);
    return mainConcepts.length > 0 ? `Exploring ${mainConcepts.join(' and ')}` : 'Learning Activity';
  }

  private assessPlanConfidence(contents: ContentDescription[], sections: LessonSection[]): number {
    let score = 0.5;

    // Higher confidence if we have rich content descriptions
    if (contents.every(c => c.aiEnrichment.keyConcepts.length > 0)) score += 0.1;
    if (contents.every(c => c.bloomsVerbs.length > 0)) score += 0.1;

    // Higher confidence if lesson structure is complete
    if (sections.length >= 4) score += 0.1;
    if (sections.every(s => s.teacherActions.length > 0 && s.studentActions.length > 0)) score += 0.1;

    // Check time allocation
    const totalTime = sections.reduce((sum, s) => sum + s.duration, 0);
    if (totalTime > 0) score += 0.1;

    return Math.min(1, score);
  }

  private assessAlignmentScoreVal(contents: ContentDescription[], intentions: string[]): number {
    let score = 0.5;

    // Check if intentions cover the content
    for (const content of contents) {
      const contentWords = content.description.toLowerCase().split(/\s+/);
      const matchedInIntentions = intentions.some(i =>
        contentWords.some(w => w.length > 4 && i.toLowerCase().includes(w))
      );
      if (matchedInIntentions) score += 0.1;
    }

    return Math.min(1, score);
  }

  private predictEngagement(sections: LessonSection[], style?: string): number {
    let score = 0.5;

    // Active learning styles get higher engagement
    if (style === 'inquiry' || style === 'collaborative') score += 0.15;
    if (style === 'flipped') score += 0.1;

    // Variety in section types increases engagement
    const uniqueTypes = new Set(sections.map(s => s.type)).size;
    score += Math.min(0.2, uniqueTypes * 0.05);

    // Shorter direct instruction relative to practice
    const directTime = sections.filter(s => s.type === 'direct_instruction').reduce((sum, s) => sum + s.duration, 0);
    const practiceTime = sections.filter(s => s.type === 'independent_practice' || s.type === 'collaborative').reduce((sum, s) => sum + s.duration, 0);
    if (practiceTime > directTime) score += 0.1;

    return Math.min(1, score);
  }
}

export { CurriculumCuratorService as default };
