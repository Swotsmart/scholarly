/**
 * Configuration Types and Defaults
 */

import { Jurisdiction } from '../types/jurisdiction';

export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  defaultJurisdiction: Jurisdiction;
  commissionRate: number;
  tokenRewardRate: number;

  sessionDefaults: {
    duration: number; // minutes
    reminderMinutes: number;
    cancellationWindowHours: number;
  };

  safeguarding: {
    requireChecksForAllTutors: boolean;
    checkExpiryWarningDays: number;
  };

  marketplace: {
    minContentPrice: number;
    maxContentPrice: number;
    creatorCommissionRate: number;
    reviewModerationEnabled: boolean;
  };

  scheduling: {
    maxIterations: number;
    timeout: number;
    defaultAlgorithm: 'genetic' | 'simulated_annealing' | 'constraint' | 'hybrid';
  };

  relief: {
    predictionEnabled: boolean;
    predictionDaysAhead: number;
    autonomousActionsEnabled: boolean;
    notificationBatchSize: number;
  };

  ai: {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | 'local';
    modelName: string;
    maxTokens: number;
  };

  limits: {
    maxTutorsPerSearch: number;
    maxContentPerPage: number;
    maxCoopSize: number;
    maxMicroSchoolStudents: number;
  };
}

export const defaultConfig: ScholarlyConfig = {
  environment: 'development',
  defaultJurisdiction: Jurisdiction.AU_NSW,
  commissionRate: 0.15, // 15%
  tokenRewardRate: 0.01, // 1%

  sessionDefaults: {
    duration: 60,
    reminderMinutes: 60,
    cancellationWindowHours: 24,
  },

  safeguarding: {
    requireChecksForAllTutors: true,
    checkExpiryWarningDays: 30,
  },

  marketplace: {
    minContentPrice: 0,
    maxContentPrice: 500,
    creatorCommissionRate: 0.7, // 70% to creator
    reviewModerationEnabled: true,
  },

  scheduling: {
    maxIterations: 10000,
    timeout: 300,
    defaultAlgorithm: 'hybrid',
  },

  relief: {
    predictionEnabled: true,
    predictionDaysAhead: 14,
    autonomousActionsEnabled: false,
    notificationBatchSize: 10,
  },

  ai: {
    enabled: true,
    provider: 'anthropic',
    modelName: 'claude-3-sonnet',
    maxTokens: 4096,
  },

  limits: {
    maxTutorsPerSearch: 50,
    maxContentPerPage: 24,
    maxCoopSize: 15,
    maxMicroSchoolStudents: 30,
  },
};

export function createConfig(overrides: Partial<ScholarlyConfig> = {}): ScholarlyConfig {
  return {
    ...defaultConfig,
    ...overrides,
    sessionDefaults: {
      ...defaultConfig.sessionDefaults,
      ...overrides.sessionDefaults,
    },
    safeguarding: {
      ...defaultConfig.safeguarding,
      ...overrides.safeguarding,
    },
    marketplace: {
      ...defaultConfig.marketplace,
      ...overrides.marketplace,
    },
    scheduling: {
      ...defaultConfig.scheduling,
      ...overrides.scheduling,
    },
    relief: {
      ...defaultConfig.relief,
      ...overrides.relief,
    },
    ai: {
      ...defaultConfig.ai,
      ...overrides.ai,
    },
    limits: {
      ...defaultConfig.limits,
      ...overrides.limits,
    },
  };
}
