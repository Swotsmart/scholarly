/**
 * AI Profile Builder Types
 *
 * Type definitions for the conversational AI profile builder that helps tutors
 * create compelling profiles through guided Q&A sessions.
 *
 * @module ScholarlyPayment/ProfileBuilder/Types
 * @version 1.0.0
 */

// ============================================================================
// PROFILE BUILDER SESSION
// ============================================================================

export type ProfileBuildStage =
  | 'welcome'
  | 'background'
  | 'teaching_style'
  | 'specializations'
  | 'personality'
  | 'practical'
  | 'review'
  | 'generating'
  | 'selection'
  | 'complete';

export interface ProfileBuilderSession {
  id: string;
  tenantId: string;
  tutorId: string;
  stage: ProfileBuildStage;
  conversationHistory: ProfileConversationMessage[];
  extractedData: ExtractedProfileData;
  questionsCompleted: number;
  totalQuestions: number;
  progressPercentage: number;
  generatedDrafts: ProfileDrafts | null;
  selections: ProfileSelections;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface ProfileConversationMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: Date;
  questionId?: string;
  extractedInsights?: ExtractedInsight[];
}

export interface ExtractedInsight {
  field: string;
  value: unknown;
  confidence: number;
  source: string;
}

// ============================================================================
// EXTRACTED DATA
// ============================================================================

export interface ExtractedProfileData {
  background: BackgroundData;
  teachingStyle: TeachingStyleData;
  specializations: SpecializationData;
  personality: PersonalityData;
  practical: PracticalData;
}

export interface BackgroundData {
  yearsExperience: number | null;
  educationLevel: string | null;
  qualifications: string[];
  currentRole: string | null;
  previousRoles: string[];
  teachingJourney: string | null;
  inspirationToTeach: string | null;
}

export interface TeachingStyleData {
  primaryApproach: TeachingApproach | null;
  secondaryApproaches: TeachingApproach[];
  learnerTypes: string[];
  sessionStructure: string | null;
  feedbackStyle: string | null;
  homeworkPhilosophy: string | null;
  examPreparation: string | null;
  parentCommunication: string | null;
}

export type TeachingApproach =
  | 'socratic'
  | 'direct_instruction'
  | 'collaborative'
  | 'inquiry_based'
  | 'project_based'
  | 'mastery_learning'
  | 'differentiated'
  | 'blended'
  | 'gamified';

export interface SpecializationData {
  subjects: SubjectSpecialization[];
  yearLevels: string[];
  curricula: string[];
  specialNeeds: string[];
  examBoards: string[];
  uniqueOfferings: string[];
}

export interface SubjectSpecialization {
  subject: string;
  topics: string[];
  proficiencyLevel: 'competent' | 'proficient' | 'expert';
  yearsTeaching: number;
}

export interface PersonalityData {
  communicationStyle: string | null;
  pacePreference: 'patient_methodical' | 'energetic_dynamic' | 'adaptive' | null;
  humorLevel: 'serious' | 'occasional' | 'frequent' | null;
  interests: string[];
  funFacts: string[];
  valueProposition: string | null;
}

export interface PracticalData {
  availability: AvailabilityData;
  location: LocationData;
  pricing: PricingData;
  policies: PolicyData;
}

export interface AvailabilityData {
  weekdayMornings: boolean;
  weekdayAfternoons: boolean;
  weekdayEvenings: boolean;
  weekends: boolean;
  schoolHolidays: boolean;
  typicalHoursPerWeek: number | null;
}

export interface LocationData {
  online: boolean;
  inPerson: boolean;
  travelRadius: number | null;
  suburbs: string[];
  preferredLocations: string[];
}

export interface PricingData {
  hourlyRate: number | null;
  packageRates: { sessions: number; rate: number }[];
  freeTrialOffered: boolean;
  trialDuration: number | null;
}

export interface PolicyData {
  cancellationPolicy: string | null;
  makeupPolicy: string | null;
  paymentTerms: string | null;
}

// ============================================================================
// GENERATED DRAFTS
// ============================================================================

export interface ProfileDrafts {
  headlines: DraftOption[];
  shortBios: DraftOption[];
  taglines: DraftOption[];
  parentPitches: DraftOption[];
  teachingPhilosophy: DraftOption[];
  successStories: DraftOption[];
}

export interface DraftOption {
  id: string;
  content: string;
  style: ContentStyle;
  highlights: string[];
  suitableFor: string[];
}

export type ContentStyle =
  | 'professional'
  | 'warm_friendly'
  | 'energetic'
  | 'academic'
  | 'conversational'
  | 'inspiring';

export interface ProfileSelections {
  headline: string | null;
  shortBio: string | null;
  tagline: string | null;
  parentPitch: string | null;
  teachingPhilosophy: string | null;
  successStory: string | null;
}

// ============================================================================
// TUTOR PROFILE (Final Output)
// ============================================================================

export interface TutorProfile {
  id: string;
  tutorId: string;
  tenantId: string;
  status: 'draft' | 'active' | 'archived';
  publishedAt: Date | null;
  headline: string;
  shortBio: string;
  tagline: string | null;
  parentPitch: string | null;
  teachingPhilosophy: string | null;
  successStory: string | null;
  background: {
    yearsExperience: number;
    educationLevel: string;
    qualifications: string[];
    currentRole: string | null;
  };
  teaching: {
    primaryApproach: TeachingApproach;
    approaches: TeachingApproach[];
    learnerTypes: string[];
  };
  specializations: SubjectSpecialization[];
  yearLevels: string[];
  curricula: string[];
  specialNeeds: string[];
  personality: {
    communicationStyle: string;
    pacePreference: string;
    interests: string[];
    funFacts: string[];
  };
  availability: AvailabilityData;
  location: LocationData;
  pricing: PricingData;
  policies: PolicyData;
  aiContent: {
    generatedAt: Date;
    modelVersion: string;
    completenessScore: number;
  };
  seoMetadata: {
    title: string;
    description: string;
    keywords: string[];
  };
  analytics: {
    views: number;
    enquiries: number;
    bookings: number;
    conversionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROFILE QUESTIONS
// ============================================================================

export interface ProfileQuestion {
  id: string;
  stage: ProfileBuildStage;
  sequence: number;
  question: string;
  followUpPrompt: string | null;
  targetFields: string[];
  required: boolean;
  inputType: 'text' | 'multiline' | 'choice' | 'multi_choice' | 'number' | 'rating';
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  helpText?: string;
  examples?: string[];
}

// ============================================================================
// PROFILE COMPLETENESS
// ============================================================================

export interface ProfileCompleteness {
  overall: number;
  sections: {
    background: { score: number; missing: string[] };
    teaching: { score: number; missing: string[] };
    specializations: { score: number; missing: string[] };
    personality: { score: number; missing: string[] };
    practical: { score: number; missing: string[] };
    content: { score: number; missing: string[] };
  };
  suggestions: ProfileSuggestion[];
}

export interface ProfileSuggestion {
  type: 'missing' | 'improvement' | 'enhancement';
  field: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
}

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export interface StartProfileSessionInput {
  tenantId: string;
  tutorId: string;
}

export interface AnswerQuestionInput {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface AnswerQuestionOutput {
  aiResponse: string;
  nextQuestion: ProfileQuestion | null;
  extractedInsights: ExtractedInsight[];
  progress: number;
  stage: ProfileBuildStage;
}

export interface GenerateDraftsInput {
  sessionId: string;
  styles?: ContentStyle[];
  focusAreas?: string[];
}

export interface SelectDraftInput {
  sessionId: string;
  field: keyof ProfileSelections;
  selectedText: string;
  customEdit?: string;
}

export interface PublishProfileInput {
  sessionId: string;
  tutorId: string;
}
