/**
 * Feature Flag Service
 *
 * Manages feature flags for gradual rollouts, A/B testing,
 * and tenant-specific feature control.
 */

import { prisma, Prisma } from '@scholarly/database';
import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { log } from '../lib/logger';
import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  rules: FeatureFlagRule[];
  rolloutPercentage: number;
  category?: string;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagRule {
  type: 'user' | 'tenant' | 'role' | 'jurisdiction' | 'percentage' | 'date';
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'before' | 'after';
  value: string | string[] | number | Date;
}

export interface EvaluationContext {
  userId?: string;
  tenantId?: string;
  roles?: string[];
  jurisdiction?: string;
  email?: string;
  customAttributes?: Record<string, unknown>;
}

export interface TenantConfiguration {
  id: string;
  tenantId: string;
  branding: BrandingConfig;
  enabledFeatures: string[];
  disabledFeatures: string[];
  limits: TenantLimits;
  integrations: Record<string, IntegrationConfig>;
  dataRetentionDays: number;
  gdprEnabled: boolean;
  billingPlan: string;
  billingCycle: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  faviconUrl?: string;
  customCss?: string;
}

export interface TenantLimits {
  maxUsers?: number;
  maxStorage?: number;
  maxApiCalls?: number;
  maxContentItems?: number;
}

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  settings?: Record<string, unknown>;
}

// ============================================================================
// Feature Flag Service
// ============================================================================

let featureFlagServiceInstance: FeatureFlagService | null = null;

// In-memory cache for feature flags
const flagCache = new Map<string, { flag: FeatureFlag; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export class FeatureFlagService extends ScholarlyBaseService {
  constructor() {
    super('FeatureFlagService');
  }

  // ============ Feature Flag Evaluation ============

  /**
   * Check if a feature is enabled for a given context
   */
  async isEnabled(key: string, context: EvaluationContext): Promise<boolean> {
    const flag = await this.getFlag(key);

    if (!flag) {
      log.debug('Feature flag not found, defaulting to disabled', { key });
      return false;
    }

    if (!flag.isEnabled) {
      return false;
    }

    // Check tenant overrides first
    if (context.tenantId) {
      const tenantConfig = await this.getTenantConfiguration(context.tenantId);
      if (tenantConfig) {
        if (tenantConfig.disabledFeatures.includes(key)) {
          return false;
        }
        if (tenantConfig.enabledFeatures.includes(key)) {
          return true;
        }
      }
    }

    // Evaluate rules
    const rulesPass = this.evaluateRules(flag.rules, context);
    if (!rulesPass) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const isInRollout = this.isInRolloutPercentage(
        key,
        context.userId || context.tenantId || 'anonymous',
        flag.rolloutPercentage
      );
      if (!isInRollout) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all enabled features for a context
   */
  async getEnabledFeatures(context: EvaluationContext): Promise<string[]> {
    const flags = await this.getAllFlags();
    const enabled: string[] = [];

    for (const flag of flags) {
      const isEnabled = await this.isEnabled(flag.key, context);
      if (isEnabled) {
        enabled.push(flag.key);
      }
    }

    return enabled;
  }

  /**
   * Get feature flag value with variant support
   */
  async getVariant<T = string>(
    key: string,
    context: EvaluationContext,
    defaultValue: T
  ): Promise<T> {
    const flag = await this.getFlag(key);

    if (!flag || !flag.isEnabled) {
      return defaultValue;
    }

    const isEnabled = await this.isEnabled(key, context);
    if (!isEnabled) {
      return defaultValue;
    }

    // Check rules for variant values
    for (const rule of flag.rules) {
      if (rule.type === 'user' && rule.operator === 'equals' && rule.value === context.userId) {
        // User-specific variant
        const metadata = (flag as any).metadata;
        if (metadata?.variants?.[context.userId as string]) {
          return metadata.variants[context.userId as string] as T;
        }
      }
    }

    return defaultValue;
  }

  // ============ Flag Management ============

  /**
   * Get a feature flag by key
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = flagCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.flag;
    }

    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      return null;
    }

    const featureFlag: FeatureFlag = {
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      isEnabled: flag.isEnabled,
      rules: flag.rules as unknown as FeatureFlagRule[],
      rolloutPercentage: flag.rolloutPercentage,
      category: flag.category || undefined,
      owner: flag.owner || undefined,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    };

    // Update cache
    flagCache.set(key, { flag: featureFlag, cachedAt: Date.now() });

    return featureFlag;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });

    return flags.map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      description: flag.description || undefined,
      isEnabled: flag.isEnabled,
      rules: flag.rules as unknown as FeatureFlagRule[],
      rolloutPercentage: flag.rolloutPercentage,
      category: flag.category || undefined,
      owner: flag.owner || undefined,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    }));
  }

  /**
   * Create a new feature flag
   */
  async createFlag(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
    rules?: FeatureFlagRule[];
    rolloutPercentage?: number;
    category?: string;
    owner?: string;
  }): Promise<Result<FeatureFlag>> {
    return this.withTiming('createFlag', async () => {
      // Validate key format
      if (!/^[a-z][a-z0-9_]*$/.test(data.key)) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'Invalid flag key format. Use lowercase letters, numbers, and underscores.',
        });
      }

      const flag = await prisma.featureFlag.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description,
          isEnabled: data.isEnabled ?? false,
          rules: data.rules || [],
          rolloutPercentage: data.rolloutPercentage ?? 0,
          category: data.category,
          owner: data.owner,
        },
      });

      // Clear cache
      flagCache.delete(data.key);

      return success({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description || undefined,
        isEnabled: flag.isEnabled,
        rules: flag.rules as unknown as FeatureFlagRule[],
        rolloutPercentage: flag.rolloutPercentage,
        category: flag.category || undefined,
        owner: flag.owner || undefined,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      });
    });
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    key: string,
    updates: Partial<{
      name: string;
      description: string;
      isEnabled: boolean;
      rules: FeatureFlagRule[];
      rolloutPercentage: number;
      category: string;
      owner: string;
    }>
  ): Promise<Result<FeatureFlag>> {
    return this.withTiming('updateFlag', async () => {
      const flag = await prisma.featureFlag.update({
        where: { key },
        data: updates,
      });

      // Clear cache
      flagCache.delete(key);

      return success({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        description: flag.description || undefined,
        isEnabled: flag.isEnabled,
        rules: flag.rules as unknown as FeatureFlagRule[],
        rolloutPercentage: flag.rolloutPercentage,
        category: flag.category || undefined,
        owner: flag.owner || undefined,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      });
    });
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<Result<void>> {
    return this.withTiming('deleteFlag', async () => {
      await prisma.featureFlag.delete({
        where: { key },
      });

      flagCache.delete(key);

      return success(undefined);
    });
  }

  // ============ Tenant Configuration ============

  /**
   * Get tenant configuration
   */
  async getTenantConfiguration(tenantId: string): Promise<TenantConfiguration | null> {
    const config = await prisma.tenantConfiguration.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return null;
    }

    return {
      id: config.id,
      tenantId: config.tenantId,
      branding: config.branding as unknown as BrandingConfig,
      enabledFeatures: config.enabledFeatures,
      disabledFeatures: config.disabledFeatures,
      limits: config.limits as unknown as TenantLimits,
      integrations: config.integrations as unknown as Record<string, IntegrationConfig>,
      dataRetentionDays: config.dataRetentionDays,
      gdprEnabled: config.gdprEnabled,
      billingPlan: config.billingPlan,
      billingCycle: config.billingCycle,
    };
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfiguration(
    tenantId: string,
    updates: Partial<Omit<TenantConfiguration, 'id' | 'tenantId'>>
  ): Promise<Result<TenantConfiguration>> {
    return this.withTiming('updateTenantConfiguration', async () => {
      const config = await prisma.tenantConfiguration.upsert({
        where: { tenantId },
        create: {
          tenantId,
          branding: updates.branding || {},
          enabledFeatures: updates.enabledFeatures || [],
          disabledFeatures: updates.disabledFeatures || [],
          limits: updates.limits || {},
          integrations: updates.integrations || {},
          dataRetentionDays: updates.dataRetentionDays ?? 2555,
          gdprEnabled: updates.gdprEnabled ?? true,
          billingPlan: updates.billingPlan ?? 'free',
          billingCycle: updates.billingCycle ?? 'monthly',
        },
        update: updates,
      });

      return success({
        id: config.id,
        tenantId: config.tenantId,
        branding: config.branding as unknown as BrandingConfig,
        enabledFeatures: config.enabledFeatures,
        disabledFeatures: config.disabledFeatures,
        limits: config.limits as unknown as TenantLimits,
        integrations: config.integrations as unknown as Record<string, IntegrationConfig>,
        dataRetentionDays: config.dataRetentionDays,
        gdprEnabled: config.gdprEnabled,
        billingPlan: config.billingPlan,
        billingCycle: config.billingCycle,
      });
    });
  }

  /**
   * Enable a feature for a tenant
   */
  async enableFeatureForTenant(tenantId: string, featureKey: string): Promise<Result<void>> {
    return this.withTiming('enableFeatureForTenant', async () => {
      const config = await this.getTenantConfiguration(tenantId);

      const enabledFeatures = config?.enabledFeatures || [];
      const disabledFeatures = (config?.disabledFeatures || []).filter((f) => f !== featureKey);

      if (!enabledFeatures.includes(featureKey)) {
        enabledFeatures.push(featureKey);
      }

      await this.updateTenantConfiguration(tenantId, {
        enabledFeatures,
        disabledFeatures,
      });

      return success(undefined);
    });
  }

  /**
   * Disable a feature for a tenant
   */
  async disableFeatureForTenant(tenantId: string, featureKey: string): Promise<Result<void>> {
    return this.withTiming('disableFeatureForTenant', async () => {
      const config = await this.getTenantConfiguration(tenantId);

      const disabledFeatures = config?.disabledFeatures || [];
      const enabledFeatures = (config?.enabledFeatures || []).filter((f) => f !== featureKey);

      if (!disabledFeatures.includes(featureKey)) {
        disabledFeatures.push(featureKey);
      }

      await this.updateTenantConfiguration(tenantId, {
        enabledFeatures,
        disabledFeatures,
      });

      return success(undefined);
    });
  }

  // ============ Private Methods ============

  /**
   * Evaluate feature flag rules
   */
  private evaluateRules(rules: FeatureFlagRule[], context: EvaluationContext): boolean {
    if (rules.length === 0) {
      return true;
    }

    // All rules must pass (AND logic)
    for (const rule of rules) {
      if (!this.evaluateRule(rule, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: FeatureFlagRule, context: EvaluationContext): boolean {
    let contextValue: unknown;

    switch (rule.type) {
      case 'user':
        contextValue = context.userId;
        break;
      case 'tenant':
        contextValue = context.tenantId;
        break;
      case 'role':
        contextValue = context.roles;
        break;
      case 'jurisdiction':
        contextValue = context.jurisdiction;
        break;
      case 'percentage':
        // Handled separately in isInRolloutPercentage
        return true;
      case 'date':
        contextValue = new Date();
        break;
      default:
        return true;
    }

    switch (rule.operator) {
      case 'equals':
        return contextValue === rule.value;
      case 'not_equals':
        return contextValue !== rule.value;
      case 'contains':
        if (Array.isArray(contextValue)) {
          return contextValue.includes(rule.value as string);
        }
        return false;
      case 'in':
        if (Array.isArray(rule.value)) {
          return rule.value.includes(contextValue as string);
        }
        return false;
      case 'before':
        return contextValue instanceof Date && contextValue < new Date(rule.value as string);
      case 'after':
        return contextValue instanceof Date && contextValue > new Date(rule.value as string);
      default:
        return true;
    }
  }

  /**
   * Determine if identifier falls within rollout percentage
   * Uses consistent hashing to ensure same result for same identifier
   */
  private isInRolloutPercentage(
    flagKey: string,
    identifier: string,
    percentage: number
  ): boolean {
    const hash = crypto
      .createHash('md5')
      .update(`${flagKey}:${identifier}`)
      .digest('hex');

    // Convert first 8 hex chars to number and normalize to 0-100
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const normalizedValue = (hashInt / 0xffffffff) * 100;

    return normalizedValue < percentage;
  }

  /**
   * Clear the flag cache
   */
  clearCache(): void {
    flagCache.clear();
  }
}

// ============================================================================
// Service Initialization
// ============================================================================

export function initializeFeatureFlagService(): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    featureFlagServiceInstance = new FeatureFlagService();
  }
  return featureFlagServiceInstance;
}

export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    throw new Error('FeatureFlagService not initialized. Call initializeFeatureFlagService() first.');
  }
  return featureFlagServiceInstance;
}
