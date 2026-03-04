// onboarding-integration.ts
// Onboarding flow integration module used by phase-6-e2e-tests.ts

export interface OnboardingProfile {
  role: string;
  interests: string[];
  yearLevels: string[];
  selectedFeatures: string[];
  techComfort: 'beginner' | 'intermediate' | 'advanced';
  hasTeam: boolean;
  isInstitutional: boolean;
  stepCompletions: Record<string, string>;
}

export const DEFAULT_STEP_MAPPINGS: Array<{ stepId: string; taskRef: string; role: string }> = [
  // Teacher steps
  { stepId: 'tour_dashboard', taskRef: 'T0', role: 'teacher' },
  { stepId: 'tour_classes', taskRef: 'T2', role: 'teacher' },
  { stepId: 'tour_gradebook', taskRef: 'T3', role: 'teacher' },
  { stepId: 'tour_attendance', taskRef: 'T5', role: 'teacher' },
  // Parent steps
  { stepId: 'tour_parent_dashboard', taskRef: 'P0', role: 'parent' },
  { stepId: 'tour_children', taskRef: 'P1', role: 'parent' },
  // Learner steps
  { stepId: 'tour_learner_dashboard', taskRef: 'L0', role: 'learner' },
  { stepId: 'tour_quests', taskRef: 'L1', role: 'learner' },
  { stepId: 'tour_arena', taskRef: 'L3', role: 'learner' },
];

export const INTEREST_TASK_BOOSTS: Record<string, string[]> = {
  'Assessment & Reporting': ['T8', 'T9'],
  'Lesson Planning': ['T4', 'T6'],
  'Student Analytics': ['T7', 'T10'],
};

export class OnboardingProcessor {
  getMappingsForRole(role: string): Array<{ stepId: string; taskRef: string; role: string }> {
    return DEFAULT_STEP_MAPPINGS.filter(m => m.role === role);
  }

  getInitialActiveItems(role: string, techComfort: string): string[] {
    const mappings = this.getMappingsForRole(role);
    const count = mappings.length;

    let limit: number;
    if (techComfort === 'beginner') {
      // For roles with 2 or fewer mappings, include all of them.
      // For roles with more than 2, take half (rounded down).
      limit = count <= 2 ? count : Math.floor(count / 2);
    } else if (techComfort === 'intermediate') {
      // For roles with 2 or fewer mappings, include all.
      // Otherwise take roughly 75% (rounded up).
      limit = count <= 2 ? count : Math.ceil(count * 0.75);
    } else {
      // advanced: all mappings
      limit = count;
    }

    return mappings.slice(0, limit).map(m => m.taskRef);
  }

  async processOnboardingComplete(
    profile: OnboardingProfile,
    callbacks: {
      recordUse: () => void;
      addSeeds: (seeds: Array<{ ref: string; score: number }>) => void;
      runSeedEngine: () => Promise<Array<{ ref: string; score: number }>>;
      saveToServer: () => Promise<void>;
    }
  ): Promise<{ success: boolean; tasksUsed: number; seedsGenerated: number; errors: string[] }> {
    const errors: string[] = [];
    let tasksUsed = 0;
    let seedsGenerated = 0;

    // Record uses for completed steps
    const completedSteps = Object.keys(profile.stepCompletions);
    for (const _step of completedSteps) {
      callbacks.recordUse();
      tasksUsed++;
    }

    // Run seed engine
    try {
      const seeds = await callbacks.runSeedEngine();
      callbacks.addSeeds(seeds);
      seedsGenerated = seeds.length;
    } catch (e: any) {
      errors.push(e.message);
    }

    // Save to server
    try {
      await callbacks.saveToServer();
    } catch (e: any) {
      errors.push('Server save failed: ' + e.message);
    }

    return {
      success: errors.length === 0,
      tasksUsed,
      seedsGenerated,
      errors,
    };
  }
}
