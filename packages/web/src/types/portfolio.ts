/**
 * Digital Portfolio Type Definitions
 * Artifacts, learning goals, and journey tracking
 */

// =============================================================================
// ARTIFACT TYPES
// =============================================================================

export interface Artifact {
  id: string;
  title: string;
  type: 'document' | 'image' | 'video' | 'code' | 'presentation' | 'design';
  description: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  fileSize: string;
  thumbnail?: string;
}

// =============================================================================
// LEARNING GOAL TYPES
// =============================================================================

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'completed' | 'overdue';
  milestones: { name: string; completed: boolean }[];
}

// =============================================================================
// LEARNING JOURNEY TYPES
// =============================================================================

export interface LearningJourney {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  milestones: JourneyMilestone[];
  status: 'active' | 'completed' | 'paused';
}

export interface JourneyMilestone {
  id: string;
  title: string;
  date: string;
  description: string;
  type: 'achievement' | 'artifact' | 'assessment' | 'reflection';
  artifactId?: string;
}
