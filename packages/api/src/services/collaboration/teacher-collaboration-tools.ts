// ============================================================================
// SCHOLARLY PLATFORM — Sprint 14, Deliverable S14-003
// Teacher Collaboration Tools
// ============================================================================
//
// PURPOSE: Shared planning, resource exchange, peer observation scheduling,
// and collaborative annotation. If Scholarly's classroom tools (Sprint 12)
// gave teachers a cockpit, these collaboration tools connect cockpits into
// a shared air-traffic control system where teachers coordinate, share
// resources, and learn from each other.
//
// INTEGRATIONS:
//   - Sprint 1 (auth, roles), Sprint 4 (multi-tenant)
//   - Sprint 5 (storybook library for resource sharing)
//   - Sprint 12 (teacher onboarding, classroom management)
//   - Sprint 13 (SIS integration for roster data)
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// ============================================================================
// SECTION 1: SHARED LESSON PLANNING
// ============================================================================

export interface LessonPlan {
  id: string;
  tenantId: string;
  creatorId: string;
  title: string;
  description: string;
  // Curriculum alignment
  phonicsPhase: number;
  targetGPCs: string[];
  learningObjectives: string[];
  eylf_eyfs_outcomes: string[];
  // Plan structure
  duration: number;               // Minutes
  ageGroup: '3-5' | '5-7' | '7-9';
  sections: LessonSection[];
  // Resources
  attachedStorybookIds: string[];
  attachedResourceIds: string[];
  // Collaboration
  collaborators: LessonCollaborator[];
  status: 'draft' | 'shared' | 'reviewed' | 'published';
  visibility: 'private' | 'school' | 'district' | 'community';
  // Metadata
  tags: string[];
  averageRating: number;
  useCount: number;
  forkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonSection {
  sectionId: string;
  title: string;
  type: 'warm_up' | 'direct_instruction' | 'guided_practice' | 'independent_practice' | 'assessment' | 'wrap_up' | 'extension';
  durationMinutes: number;
  instructions: string;
  teacherNotes: string;
  differentiation: {
    struggling: string;           // Adaptations for struggling learners
    onTrack: string;              // Standard activity
    advanced: string;             // Extension for advanced learners
  };
  resources: string[];            // Resource IDs
  storybookId?: string;           // If this section uses a specific storybook
}

export interface LessonCollaborator {
  userId: string;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
  addedAt: Date;
  lastAccessedAt: Date;
}

export interface LessonPlanComment {
  id: string;
  lessonPlanId: string;
  sectionId?: string;             // Null = comment on whole plan
  authorId: string;
  content: string;
  commentType: 'suggestion' | 'question' | 'praise' | 'revision_request';
  status: 'open' | 'resolved' | 'acknowledged';
  createdAt: Date;
  replies: LessonPlanComment[];
}

export class SharedPlanningService extends ScholarlyBaseService {
  constructor(tenantId: string) {
    super('SharedPlanning', tenantId);
  }

  async createLessonPlan(plan: Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt' | 'averageRating' | 'useCount' | 'forkCount'>): Promise<Result<LessonPlan>> {
    // Validate curriculum alignment
    if (plan.targetGPCs.length === 0) {
      return this.fail('Lesson plan must target at least one GPC');
    }
    if (plan.sections.length === 0) {
      return this.fail('Lesson plan must have at least one section');
    }

    const totalDuration = plan.sections.reduce((sum, s) => sum + s.durationMinutes, 0);
    if (Math.abs(totalDuration - plan.duration) > 5) {
      this.log('warn', 'Section durations do not sum to plan duration', {
        planDuration: plan.duration,
        sectionTotal: totalDuration,
      });
    }

    const newPlan: LessonPlan = {
      ...plan,
      id: `lp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      averageRating: 0,
      useCount: 0,
      forkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In production: prisma.lessonPlan.create({ data: newPlan })

    this.log('info', 'Lesson plan created', {
      planId: newPlan.id,
      phase: plan.phonicsPhase,
      gpcs: plan.targetGPCs.length,
      sections: plan.sections.length,
    });

    return this.ok(newPlan);
  }

  async forkLessonPlan(originalId: string, newCreatorId: string): Promise<Result<LessonPlan>> {
    // In production: fetch original, deep clone, update metadata
    // This is the "remix culture" of education — take a good plan, adapt it
    this.log('info', 'Lesson plan forked', { originalId, newCreatorId });

    return this.ok({
      id: `lp_fork_${Date.now()}`,
      tenantId: this.tenantId,
      creatorId: newCreatorId,
      title: '[Forked] Original Plan Title',
      description: 'Forked from original',
      phonicsPhase: 2,
      targetGPCs: ['s', 'a', 't', 'p'],
      learningObjectives: [],
      eylf_eyfs_outcomes: [],
      duration: 30,
      ageGroup: '5-7',
      sections: [],
      attachedStorybookIds: [],
      attachedResourceIds: [],
      collaborators: [{ userId: newCreatorId, role: 'owner', addedAt: new Date(), lastAccessedAt: new Date() }],
      status: 'draft',
      visibility: 'private',
      tags: [],
      averageRating: 0,
      useCount: 0,
      forkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async addCollaborator(planId: string, userId: string, role: LessonCollaborator['role']): Promise<Result<void>> {
    // In production: check plan ownership, add collaborator, send notification
    this.log('info', 'Collaborator added to lesson plan', { planId, userId, role });
    return this.ok(undefined);
  }

  async addComment(planId: string, comment: Omit<LessonPlanComment, 'id' | 'createdAt' | 'replies'>): Promise<Result<LessonPlanComment>> {
    const newComment: LessonPlanComment = {
      ...comment,
      id: `comment_${Date.now()}`,
      createdAt: new Date(),
      replies: [],
    };
    return this.ok(newComment);
  }

  async searchLessonPlans(filters: {
    phonicsPhase?: number;
    targetGPCs?: string[];
    ageGroup?: string;
    tags?: string[];
    visibility?: string;
    minRating?: number;
    query?: string;
  }): Promise<Result<LessonPlan[]>> {
    // In production: full-text search with Prisma + PostgreSQL ts_vector
    this.log('info', 'Searching lesson plans', { filters });
    return this.ok([]);
  }
}


// ============================================================================
// SECTION 2: RESOURCE EXCHANGE
// ============================================================================

export interface SharedResource {
  id: string;
  tenantId: string;
  creatorId: string;
  title: string;
  description: string;
  resourceType: 'worksheet' | 'flashcards' | 'game' | 'assessment' | 'poster' | 'activity_guide' | 'parent_letter' | 'storybook_companion';
  // Curriculum metadata
  phonicsPhases: number[];
  targetGPCs: string[];
  ageGroups: string[];
  // File data
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  thumbnailUrl?: string;
  // Licensing
  license: 'all_rights_reserved' | 'cc_by' | 'cc_by_sa' | 'cc_by_nc' | 'cc0';
  // Community metrics
  downloadCount: number;
  averageRating: number;
  ratingCount: number;
  // Access control
  visibility: 'private' | 'school' | 'district' | 'community';
  createdAt: Date;
}

export interface ResourceReview {
  id: string;
  resourceId: string;
  reviewerId: string;
  rating: number;                  // 1-5
  review: string;
  usedWith: string;                // "Used with my Year 1 class"
  effectiveness: 'very_effective' | 'effective' | 'neutral' | 'ineffective';
  createdAt: Date;
}

export class ResourceExchangeService extends ScholarlyBaseService {
  constructor(tenantId: string) {
    super('ResourceExchange', tenantId);
  }

  async uploadResource(resource: Omit<SharedResource, 'id' | 'downloadCount' | 'averageRating' | 'ratingCount' | 'createdAt'>): Promise<Result<SharedResource>> {
    // Validate file type
    const allowedTypes = ['pdf', 'docx', 'pptx', 'png', 'jpg', 'mp3', 'mp4'];
    if (!allowedTypes.some(t => resource.fileType.includes(t))) {
      return this.fail(`Unsupported file type: ${resource.fileType}. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Size limit: 50MB
    if (resource.fileSizeBytes > 50 * 1024 * 1024) {
      return this.fail('File size exceeds 50MB limit');
    }

    const newResource: SharedResource = {
      ...resource,
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      downloadCount: 0,
      averageRating: 0,
      ratingCount: 0,
      createdAt: new Date(),
    };

    this.log('info', 'Resource uploaded', {
      resourceId: newResource.id,
      type: resource.resourceType,
      phases: resource.phonicsPhases,
    });

    return this.ok(newResource);
  }

  async searchResources(filters: {
    resourceType?: string;
    phonicsPhase?: number;
    targetGPCs?: string[];
    ageGroup?: string;
    license?: string;
    minRating?: number;
    query?: string;
    sortBy?: 'rating' | 'downloads' | 'newest';
  }): Promise<Result<SharedResource[]>> {
    this.log('info', 'Searching resources', { filters });
    return this.ok([]);
  }

  async reviewResource(review: Omit<ResourceReview, 'id' | 'createdAt'>): Promise<Result<ResourceReview>> {
    if (review.rating < 1 || review.rating > 5) {
      return this.fail('Rating must be between 1 and 5');
    }

    const newReview: ResourceReview = {
      ...review,
      id: `review_${Date.now()}`,
      createdAt: new Date(),
    };

    return this.ok(newReview);
  }

  async trackDownload(resourceId: string, downloaderId: string): Promise<Result<void>> {
    // In production: increment download count, emit NATS event
    this.log('info', 'Resource downloaded', { resourceId, downloaderId });
    return this.ok(undefined);
  }
}


// ============================================================================
// SECTION 3: PEER OBSERVATION SCHEDULING
// ============================================================================

export interface PeerObservation {
  id: string;
  tenantId: string;
  observerId: string;             // Teacher doing the observing
  observeeId: string;             // Teacher being observed
  // Scheduling
  scheduledDate: Date;
  durationMinutes: number;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  classroomId?: string;
  lessonPlanId?: string;          // Lesson being observed
  // Focus areas
  focusAreas: ObservationFocus[];
  // Pre-observation
  preObservationNotes: string;
  observeeGoals: string[];        // What the teacher being observed wants feedback on
  // Observation
  observationNotes: ObservationNote[];
  // Post-observation
  postObservationReflection?: string;
  feedbackSummary?: string;
  strengths: string[];
  growthAreas: string[];
  agreeNextSteps: string[];
  // Metadata
  createdAt: Date;
  completedAt?: Date;
}

export type ObservationFocus =
  | 'phonics_instruction_quality'
  | 'differentiation'
  | 'engagement_strategies'
  | 'assessment_integration'
  | 'technology_use'
  | 'questioning_techniques'
  | 'classroom_management'
  | 'inclusive_practice';

export interface ObservationNote {
  timestamp: Date;
  category: ObservationFocus;
  note: string;
  sentiment: 'positive' | 'neutral' | 'growth_area';
}

export class PeerObservationService extends ScholarlyBaseService {
  constructor(tenantId: string) {
    super('PeerObservation', tenantId);
  }

  async scheduleObservation(observation: Omit<PeerObservation, 'id' | 'status' | 'observationNotes' | 'strengths' | 'growthAreas' | 'agreeNextSteps' | 'createdAt' | 'completedAt'>): Promise<Result<PeerObservation>> {
    if (observation.observerId === observation.observeeId) {
      return this.fail('Cannot observe yourself');
    }
    if (observation.focusAreas.length === 0) {
      return this.fail('At least one focus area is required');
    }
    if (observation.focusAreas.length > 3) {
      return this.fail('Maximum 3 focus areas per observation (focus leads to better feedback)');
    }

    const newObservation: PeerObservation = {
      ...observation,
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: 'requested',
      observationNotes: [],
      strengths: [],
      growthAreas: [],
      agreeNextSteps: [],
      createdAt: new Date(),
    };

    // In production: send notification to observee, create calendar event
    this.log('info', 'Peer observation scheduled', {
      observationId: newObservation.id,
      observer: observation.observerId,
      observee: observation.observeeId,
      date: observation.scheduledDate,
      focusAreas: observation.focusAreas,
    });

    return this.ok(newObservation);
  }

  async addObservationNote(observationId: string, note: Omit<ObservationNote, 'timestamp'>): Promise<Result<void>> {
    // In production: append to observation record
    this.log('info', 'Observation note added', { observationId, category: note.category });
    return this.ok(undefined);
  }

  async completeObservation(
    observationId: string,
    feedback: {
      feedbackSummary: string;
      strengths: string[];
      growthAreas: string[];
      agreeNextSteps: string[];
      postObservationReflection?: string;
    }
  ): Promise<Result<PeerObservation>> {
    if (feedback.strengths.length === 0) {
      return this.fail('Feedback must include at least one strength');
    }

    this.log('info', 'Observation completed', {
      observationId,
      strengths: feedback.strengths.length,
      growthAreas: feedback.growthAreas.length,
      nextSteps: feedback.agreeNextSteps.length,
    });

    // Return placeholder — production updates the full record
    return this.ok({} as PeerObservation);
  }

  async getTeacherObservationHistory(teacherId: string): Promise<Result<{
    asObserver: PeerObservation[];
    asObservee: PeerObservation[];
    totalObservations: number;
    topStrengths: string[];
    growthJourney: string[];
  }>> {
    // In production: query observation records for this teacher
    return this.ok({
      asObserver: [],
      asObservee: [],
      totalObservations: 0,
      topStrengths: [],
      growthJourney: [],
    });
  }
}


// ============================================================================
// SECTION 4: PROFESSIONAL LEARNING COMMUNITIES
// ============================================================================

export interface ProfessionalLearningCommunity {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  focusTopic: string;             // e.g., "Phase 3 phonics strategies", "Supporting EAL learners"
  // Membership
  facilitatorId: string;
  members: PLCMember[];
  maxMembers: number;
  joinPolicy: 'open' | 'approval_required' | 'invite_only';
  // Activity
  meetingSchedule: {
    frequency: 'weekly' | 'fortnightly' | 'monthly';
    dayOfWeek: number;
    time: string;
    durationMinutes: number;
    platform: 'in_person' | 'video_call' | 'scholarly_chat';
  };
  discussions: PLCDiscussion[];
  sharedResources: string[];      // Resource IDs
  sharedLessonPlans: string[];    // Lesson Plan IDs
  // Goals & outcomes
  communityGoals: string[];
  evidenceOfImpact: string[];
  // Status
  status: 'active' | 'paused' | 'archived';
  createdAt: Date;
}

export interface PLCMember {
  userId: string;
  role: 'facilitator' | 'member';
  joinedAt: Date;
  contributionScore: number;      // Based on posts, resources shared, reviews
}

export interface PLCDiscussion {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  content: string;
  type: 'discussion' | 'question' | 'resource_share' | 'success_story' | 'challenge' | 'meeting_notes';
  attachmentIds: string[];
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  createdAt: Date;
}

export class PLCService extends ScholarlyBaseService {
  constructor(tenantId: string) {
    super('PLCService', tenantId);
  }

  async createCommunity(community: Omit<ProfessionalLearningCommunity, 'id' | 'discussions' | 'sharedResources' | 'sharedLessonPlans' | 'evidenceOfImpact' | 'createdAt'>): Promise<Result<ProfessionalLearningCommunity>> {
    if (community.members.length === 0) {
      return this.fail('Community must have at least one member');
    }

    const newCommunity: ProfessionalLearningCommunity = {
      ...community,
      id: `plc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      discussions: [],
      sharedResources: [],
      sharedLessonPlans: [],
      evidenceOfImpact: [],
      createdAt: new Date(),
    };

    this.log('info', 'PLC created', {
      plcId: newCommunity.id,
      focus: community.focusTopic,
      memberCount: community.members.length,
    });

    return this.ok(newCommunity);
  }

  async postDiscussion(communityId: string, discussion: Omit<PLCDiscussion, 'id' | 'replyCount' | 'likeCount' | 'isPinned' | 'createdAt'>): Promise<Result<PLCDiscussion>> {
    const newDiscussion: PLCDiscussion = {
      ...discussion,
      id: `disc_${Date.now()}`,
      replyCount: 0,
      likeCount: 0,
      isPinned: false,
      createdAt: new Date(),
    };

    return this.ok(newDiscussion);
  }

  async joinCommunity(communityId: string, userId: string): Promise<Result<void>> {
    // In production: check join policy, add member, send welcome notification
    this.log('info', 'Teacher joined PLC', { communityId, userId });
    return this.ok(undefined);
  }

  async getTeacherCommunities(teacherId: string): Promise<Result<ProfessionalLearningCommunity[]>> {
    return this.ok([]);
  }

  async searchCommunities(filters: {
    focusTopic?: string;
    joinPolicy?: string;
    query?: string;
  }): Promise<Result<ProfessionalLearningCommunity[]>> {
    return this.ok([]);
  }
}
