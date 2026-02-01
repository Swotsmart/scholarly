/**
 * AI Tutor Profile Builder - Type Definitions
 * 
 * This module defines the type system for the intelligent profile creation system
 * that transforms basic tutor inputs into compelling, parent-friendly profiles
 * optimised for matching and discovery.
 * 
 * ## The Vision
 * 
 * Most tutors are experts in their subject but not in marketing themselves.
 * They struggle to write profiles that connect with parents. The AI Profile
 * Builder transforms simple Q&A responses into professional, compelling profiles.
 * 
 * Think of it as having a skilled copywriter interview each tutor, extract their
 * unique strengths, and craft a profile that speaks directly to parents' concerns:
 * - Is my child safe with this person?
 * - Will they actually improve?
 * - Will they enjoy the sessions?
 * - Is the tutor qualified?
 * 
 * @module ScholarlyPayment/ProfileBuilder/Types
 * @version 1.0.0
 */

import { Result, success, failure, PaymentError } from './index';

// ============================================================================
// PROFILE BUILDER ENUMS
// ============================================================================

/**
 * Stages in the profile building journey
 */
export type ProfileBuildStage =
  | 'welcome'           // Introduction and setup
  | 'basics'            // Basic information collection
  | 'qualifications'    // Credentials and experience
  | 'teaching_style'    // How they teach
  | 'subjects'          // What they teach
  | 'availability'      // When and where
  | 'story'             // Their personal teaching story
  | 'review'            // Review AI-generated content
  | 'polish'            // Final adjustments
  | 'complete';         // Profile published

/**
 * Question categories for the Q&A flow
 */
export type QuestionCategory =
  | 'background'        // Teaching background and experience
  | 'approach'          // Teaching methodology
  | 'specialization'    // Subject expertise
  | 'success'           // Success stories
  | 'differentiation'   // What makes them unique
  | 'values'            // Educational philosophy
  | 'logistics';        // Practical details

/**
 * Teaching approach indicators (extracted from responses)
 */
export type TeachingApproach =
  | 'patient'           // Takes time, doesn't rush
  | 'energetic'         // High energy, engaging
  | 'structured'        // Methodical, organized
  | 'flexible'          // Adapts to student needs
  | 'socratic'          // Questions to guide learning
  | 'hands_on'          // Practical, project-based
  | 'nurturing'         // Supportive, encouraging
  | 'challenging'       // Pushes students to excel
  | 'creative'          // Uses innovative methods
  | 'systematic';       // Step-by-step progression

/**
 * AI content generation styles
 */
export type ContentStyle =
  | 'professional'      // Formal, credentials-focused
  | 'friendly'          // Warm, approachable
  | 'results_focused'   // Outcomes-driven
  | 'story_driven'      // Narrative, personal
  | 'parent_reassuring'; // Trust and safety focused

/**
 * Profile completeness levels
 */
export type ProfileCompleteness =
  | 'minimal'           // Basic info only
  | 'partial'           // Some sections complete
  | 'substantial'       // Most sections complete
  | 'complete'          // All sections filled
  | 'optimized';        // Complete + AI optimized

/**
 * Profile status
 */
export type ProfileStatus =
  | 'draft'             // In progress
  | 'pending_review'    // Awaiting manual review
  | 'pending_verification' // Awaiting credential verification
  | 'published'         // Live and discoverable
  | 'suspended'         // Temporarily hidden
  | 'archived';         // No longer active

// ============================================================================
// TUTOR PROFILE
// ============================================================================

/**
 * The complete tutor profile, containing both tutor-provided information
 * and AI-generated content designed to appeal to parents.
 */
export interface TutorProfile {
  id: string;
  tutorId: string;
  tenantId: string;
  
  // Basic Information
  basics: ProfileBasics;
  
  // Professional Background
  professional: ProfessionalDetails;
  
  // Teaching Style (AI-analyzed)
  teachingStyle: TeachingStyleProfile;
  
  // AI-Generated Content
  aiContent: AIGeneratedContent;
  
  // Media
  media: ProfileMedia;
  
  // Trust & Safety
  trustSignals: TrustSignals;
  
  // Availability & Pricing
  availability: TutorAvailability;
  pricing: TutorPricing;
  
  // Status & Discovery
  status: ProfileStatus;
  publishedAt: Date | null;
  lastUpdatedAt: Date;
  
  // Performance Analytics
  analytics: ProfileAnalytics;
  
  // Search & Matching
  searchOptimization: SearchOptimization;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface ProfileBasics {
  firstName: string;
  lastName: string;
  displayName: string;                // How they want to be known
  pronouns: string | null;
  
  // Location
  location: {
    suburb: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    coordinates: { latitude: number; longitude: number } | null;
    travelRadius: number;             // km willing to travel
    serviceArea: string[];            // List of serviced areas
  };
  
  // Languages
  languages: {
    language: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
    canTeachIn: boolean;
  }[];
  
  timezone: string;
  
  // Contact preferences
  contactPreferences: {
    email: boolean;
    phone: boolean;
    inApp: boolean;
    preferredMethod: 'email' | 'phone' | 'inApp';
  };
}

export interface ProfessionalDetails {
  // AI-generated headline (tutor-approved)
  headline: string;
  
  // Bios
  shortBio: string;                   // 150-200 words
  fullBio: string;                    // 400-600 words
  
  // Qualifications
  qualifications: Qualification[];
  
  // Experience
  experience: TeachingExperience;
  
  // Subjects
  subjects: SubjectExpertise[];
}

export interface Qualification {
  id: string;
  type: 'degree' | 'diploma' | 'certificate' | 'registration' | 'wwcc' | 'other';
  title: string;
  institution: string;
  year: number;
  
  // Verification
  verified: boolean;
  verificationMethod: 'document' | 'api' | 'manual' | null;
  verifiedAt: Date | null;
  documentUrl: string | null;
  
  // Display
  displayOnProfile: boolean;
  isHighlighted: boolean;
}

export interface TeachingExperience {
  totalYears: number;
  
  // AI-extracted highlights
  highlights: string[];
  
  // Teaching history
  history: {
    role: string;
    organisation: string | null;
    yearsFrom: number;
    yearsTo: number | null;           // null = current
    description: string | null;
    isCurrentRole: boolean;
  }[];
  
  // Statistics
  stats: {
    totalStudentsTaught: number | null;
    totalSessionsCompleted: number;
    averageSessionsPerStudent: number | null;
  };
}

export interface SubjectExpertise {
  subject: string;                    // e.g., "Mathematics"
  subSubjects: string[];              // e.g., ["Algebra", "Calculus", "Statistics"]
  
  // Year levels
  yearLevelMin: string;               // e.g., "year_7"
  yearLevelMax: string;               // e.g., "year_12"
  
  // Curriculum alignments
  curriculumAlignments: {
    curriculum: string;               // e.g., "VCE", "HSC", "IB"
    subjects: string[];               // Specific subjects within curriculum
    examPreparation: boolean;
  }[];
  
  // Expertise level
  expertiseLevel: 'specialist' | 'proficient' | 'competent';
  yearsTeachingSubject: number;
  
  // AI-generated description
  subjectDescription: string | null;
}

export interface TeachingStyleProfile {
  // AI-identified approaches
  approaches: TeachingApproach[];
  
  // Strengths (AI-identified from responses)
  strengths: string[];
  
  // Methodology description
  methodology: string;
  
  // What makes them different
  differentiators: string[];
  
  // Parent-friendly explanations
  parentPitch: string;                // "Here's why I'm right for your child..."
  studentPitch: string;               // "Here's what learning with me is like..."
  
  // Specializations
  specializations: {
    area: string;                     // e.g., "VCE exam prep", "learning differences"
    description: string;
    evidence: string | null;
  }[];
  
  // Learning needs they're equipped for
  learningNeeds: {
    need: string;                     // e.g., "ADHD", "dyslexia", "gifted"
    experienceLevel: 'experienced' | 'some_experience' | 'willing_to_learn';
    description: string | null;
  }[];
}

export interface AIGeneratedContent {
  generatedAt: Date;
  modelVersion: string;
  
  // Tagline options
  taglines: {
    text: string;
    style: ContentStyle;
    selected: boolean;
    score: number;                    // AI confidence 0-1
  }[];
  
  // Search keywords
  searchKeywords: string[];
  
  // Q&A highlights for profile display
  highlights: {
    question: string;
    answerSummary: string;
    sentiment: 'positive' | 'neutral';
  }[];
  
  // Quality scores
  authenticityScore: number;          // How genuine the profile feels (0-100)
  completenessScore: number;          // How complete the profile is (0-100)
  parentAppealScore: number;          // How well it addresses parent concerns (0-100)
  searchOptimizationScore: number;    // How discoverable (0-100)
  
  // Improvement suggestions
  suggestions: {
    section: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    priority: number;
  }[];
  
  // Generated variations for A/B testing
  variations: {
    field: 'headline' | 'shortBio' | 'tagline';
    options: { text: string; style: ContentStyle }[];
  }[];
}

export interface ProfileMedia {
  // Profile photo
  profilePhoto: {
    url: string;
    thumbnailUrl: string | null;
    altText: string;
    uploadedAt: Date;
    
    // AI analysis
    aiAnalysis: {
      professional: boolean;
      friendly: boolean;
      suggestions: string[];
    } | null;
  } | null;
  
  // Introduction video
  introVideo: {
    url: string;
    thumbnailUrl: string | null;
    duration: number;                 // seconds
    uploadedAt: Date;
    
    // AI analysis
    transcript: string | null;
    aiAnalysis: {
      speakingStyle: string;
      keyMessages: string[];
      improvements: string[];
      engagementScore: number;
    } | null;
  } | null;
  
  // Gallery
  gallery: {
    id: string;
    url: string;
    caption: string | null;
    type: 'image' | 'document';
    uploadedAt: Date;
  }[];
}

export interface TrustSignals {
  // Identity verification
  identityVerified: boolean;
  identityVerifiedAt: Date | null;
  
  // Qualifications verification
  qualificationsVerified: boolean;
  qualificationsVerifiedAt: Date | null;
  
  // Safeguarding checks
  wwccVerified: boolean;
  wwccNumber: string | null;          // Masked
  wwccExpiry: Date | null;
  wwccJurisdiction: string | null;
  
  backgroundCheckCompleted: boolean;
  backgroundCheckDate: Date | null;
  backgroundCheckProvider: string | null;
  
  // Teaching history on platform
  totalSessions: number;
  totalStudents: number;
  averageRating: number | null;       // 1-5 stars
  ratingCount: number;
  repeatBookingRate: number | null;   // Percentage
  
  // Reviews and testimonials
  testimonialCount: number;
  featuredTestimonials: {
    id: string;
    authorType: 'parent' | 'student';
    authorName: string | null;        // May be anonymous
    content: string;
    rating: number;
    subject: string | null;
    date: Date;
    verified: boolean;
  }[];
  
  // Endorsements from colleagues/institutions
  endorsements: {
    id: string;
    endorserId: string | null;
    endorserName: string;
    endorserRole: string;
    relationship: string;             // e.g., "Former colleague", "Supervisor"
    message: string;
    verified: boolean;
    date: Date;
  }[];
  
  // Response metrics
  averageResponseTime: number | null; // Minutes
  responseRate: number | null;        // Percentage
  
  // Badge/achievement system
  badges: {
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
    icon: string;
  }[];
}

export interface TutorAvailability {
  // General availability status
  status: 'available' | 'limited' | 'fully_booked' | 'on_break';
  statusMessage: string | null;       // Custom message
  
  // Delivery modes
  deliveryModes: {
    mode: 'online' | 'in_person' | 'home_visit';
    available: boolean;
    notes: string | null;
  }[];
  
  // Weekly schedule
  weeklySchedule: {
    dayOfWeek: number;                // 0 = Sunday
    available: boolean;
    timeSlots: {
      start: string;                  // "09:00"
      end: string;                    // "17:00"
    }[];
  }[];
  
  // Session preferences
  sessionPreferences: {
    minDuration: number;              // Minutes
    maxDuration: number;
    preferredDuration: number;
    breakBetweenSessions: number;
  };
  
  // Booking settings
  bookingSettings: {
    minAdvanceNotice: number;         // Hours
    maxAdvanceBooking: number;        // Days
    allowInstantBooking: boolean;
    requireApproval: boolean;
    cancellationPolicy: string;
  };
  
  // Capacity
  capacity: {
    maxWeeklyHours: number | null;
    currentWeeklyHours: number;
    maxActiveStudents: number | null;
    currentActiveStudents: number;
    acceptingNewStudents: boolean;
  };
  
  // Blackout dates
  blackoutDates: {
    startDate: Date;
    endDate: Date;
    reason: string | null;
  }[];
}

export interface TutorPricing {
  currency: string;
  
  // Base rates
  baseRates: {
    duration: number;                 // Minutes
    rate: number;                     // Cents
    deliveryMode: 'online' | 'in_person' | 'home_visit';
  }[];
  
  // Packages
  packages: {
    id: string;
    name: string;
    description: string;
    sessions: number;
    validityDays: number;
    totalPrice: number;               // Cents
    savingsPercentage: number;
    popular: boolean;
  }[];
  
  // Special rates
  specialRates: {
    type: 'sibling' | 'group' | 'trial' | 'scholarship';
    description: string;
    discountPercentage: number;
    conditions: string | null;
  }[];
  
  // Trial session
  trialSession: {
    available: boolean;
    duration: number | null;
    price: number | null;             // Cents (0 = free)
    conditions: string | null;
  };
  
  // Free consultation
  freeConsultation: {
    available: boolean;
    duration: number | null;
    description: string | null;
  };
}

export interface ProfileAnalytics {
  // Visibility metrics
  profileViews: number;
  profileViewsLast30Days: number;
  uniqueViewers: number;
  
  // Search performance
  searchAppearances: number;
  searchAppearancesLast30Days: number;
  averageSearchPosition: number | null;
  clickThroughRate: number | null;
  
  // Engagement metrics
  contactRequests: number;
  contactRequestsLast30Days: number;
  trialBookings: number;
  bookingConversions: number;
  conversionRate: number | null;
  
  // Comparison to peers
  peerComparison: {
    metric: string;
    tutorValue: number;
    peerAverage: number;
    percentile: number;
  }[];
  
  // Top search terms
  topSearchTerms: {
    term: string;
    count: number;
    conversionRate: number;
  }[];
}

export interface SearchOptimization {
  // Primary keywords
  primaryKeywords: string[];
  
  // Secondary keywords
  secondaryKeywords: string[];
  
  // Subject aliases (for search matching)
  subjectAliases: Record<string, string[]>;
  
  // Location aliases
  locationAliases: string[];
  
  // Semantic embeddings (for AI matching)
  embeddings: {
    model: string;
    vector: number[];
    generatedAt: Date;
  } | null;
  
  // Schema.org structured data
  structuredData: Record<string, unknown>;
}

// ============================================================================
// PROFILE BUILDER SESSION
// ============================================================================

/**
 * A profile builder session tracks the conversational Q&A process
 * as a tutor builds their profile with AI assistance.
 */
export interface ProfileBuilderSession {
  id: string;
  tutorId: string;
  tenantId: string;
  
  // Progress tracking
  stage: ProfileBuildStage;
  stagesCompleted: ProfileBuildStage[];
  questionsCompleted: number;
  totalQuestions: number;
  progressPercentage: number;
  
  // Collected responses
  responses: QuestionResponse[];
  
  // AI-extracted insights
  extractedInsights: ExtractedInsights;
  
  // Generated drafts
  drafts: ProfileDrafts;
  
  // Tutor selections from drafts
  selections: ProfileSelections;
  
  // Session state
  startedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
  
  // Expiry (sessions expire after inactivity)
  expiresAt: Date;
  
  // Conversation history (for context)
  conversationHistory: ConversationMessage[];
}

export interface QuestionResponse {
  questionId: string;
  question: string;
  category: QuestionCategory;
  answer: string;
  answeredAt: Date;
  
  // Follow-up questions and answers
  followUps: {
    question: string;
    answer: string;
    answeredAt: Date;
  }[];
  
  // AI extraction from this response
  extraction: {
    themes: string[];
    sentiments: string[];
    keywords: string[];
    qualities: TeachingApproach[];
    facts: string[];
  };
  
  // Response quality indicators
  quality: {
    length: 'short' | 'medium' | 'long';
    specificity: 'vague' | 'moderate' | 'specific';
    usefulness: number;               // 0-1
  };
}

export interface ExtractedInsights {
  // Overall analysis
  uniqueSellingPoints: string[];
  keyStrengths: string[];
  teachingPhilosophy: string | null;
  
  // Teaching style analysis
  dominantApproaches: TeachingApproach[];
  approachEvidence: Record<TeachingApproach, string[]>;
  
  // Experience indicators
  experienceIndicators: string[];
  expertiseAreas: string[];
  
  // Parent appeal factors
  trustIndicators: string[];
  warmthIndicators: string[];
  competenceIndicators: string[];
  
  // Potential concerns to address
  gapsToAddress: string[];
  suggestedAdditions: string[];
}

export interface ProfileDrafts {
  // Multiple options for each field
  headlines: { text: string; style: ContentStyle; score: number }[];
  shortBios: { text: string; style: ContentStyle; score: number }[];
  fullBios: { text: string; style: ContentStyle; score: number }[];
  taglines: { text: string; style: ContentStyle; score: number }[];
  parentPitches: { text: string; style: ContentStyle; score: number }[];
  studentPitches: { text: string; style: ContentStyle; score: number }[];
  methodologies: { text: string; style: ContentStyle; score: number }[];
  
  // Subject descriptions
  subjectDescriptions: Record<string, { text: string; score: number }[]>;
  
  // Generated at
  generatedAt: Date;
}

export interface ProfileSelections {
  headline: string | null;
  shortBio: string | null;
  fullBio: string | null;
  tagline: string | null;
  parentPitch: string | null;
  studentPitch: string | null;
  methodology: string | null;
  
  // Custom edits (tutor modifications)
  customEdits: Record<string, string>;
}

export interface ConversationMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: Date;
  metadata?: {
    questionId?: string;
    stage?: ProfileBuildStage;
  };
}

// ============================================================================
// PROFILE BUILDER QUESTIONS
// ============================================================================

export interface ProfileQuestion {
  id: string;
  question: string;
  helpText: string | null;
  category: QuestionCategory;
  stage: ProfileBuildStage;
  
  // Extraction configuration
  extractionTargets: string[];
  
  // Validation
  minLength: number | null;
  maxLength: number | null;
  required: boolean;
  
  // Conditional display
  showIf: {
    questionId: string;
    hasAnswer: boolean;
    answerContains?: string[];
  } | null;
  
  // Follow-up generation
  generateFollowUps: boolean;
  maxFollowUps: number;
  
  // Order
  order: number;
}

// ============================================================================
// AI GENERATION CONFIGURATION
// ============================================================================

export interface AIGenerationConfig {
  // Model settings
  model: string;
  temperature: number;
  maxTokens: number;
  
  // Generation parameters
  numberOfVariations: number;
  styles: ContentStyle[];
  
  // Quality thresholds
  minAuthenticityScore: number;
  minCompleteness: number;
  
  // Content guidelines
  avoidPhrases: string[];
  requiredElements: string[];
  toneGuidelines: string[];
}

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export interface StartProfileSessionInput {
  tenantId: string;
  tutorId: string;
  resumeFromSession?: string;         // Session ID to resume
}

export interface AnswerQuestionInput {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface AnswerQuestionOutput {
  aiResponse: string;                 // Acknowledgment or follow-up
  nextQuestion: ProfileQuestion | null;
  extractedInsights: string[];
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
  skipReview?: boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  TutorProfile,
  ProfileBuilderSession,
  ProfileQuestion,
  AIGenerationConfig
};
