// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-002 (continued)
// Seed Library Generator — Orchestration, Reporting & Validation
// =============================================================================

import { Result } from '../shared/result';
import {
  SeedBookSpec, SEED_LIBRARY_SPECS, BookGenerationResult, StageResult,
  SeedLibraryConfig, GenerationProgress, PhonicsPhase,
} from './seed-library-specs';

// =============================================================================
// Section 1: Seed Library Report
// =============================================================================

export interface SeedLibraryReport {
  totalSpecs: number;
  generated: number;
  failed: number;
  skippedBudget: number;
  totalCostUsd: number;
  totalDurationMs: number;
  averageCostPerBook: number;
  averageDurationPerBook: number;
  phaseBreakdown: PhaseBreakdown[];
  seriesBreakdown: SeriesBreakdown[];
  results: BookGenerationResult[];
  budgetRemaining: number;
  warnings: string[];
}

export interface PhaseBreakdown {
  phase: PhonicsPhase;
  total: number;
  generated: number;
  failed: number;
  avgDecodabilityScore: number;
  totalCostUsd: number;
}

export interface SeriesBreakdown {
  seriesName: string;
  total: number;
  generated: number;
  failed: number;
  totalCostUsd: number;
}

// =============================================================================
// Section 2: Spec Validator
// =============================================================================
// Before we spend a single cent on API calls, validate that every spec is
// internally consistent. It's the pre-flight checklist before takeoff —
// check fuel, check instruments, check weather. Catch the typo in a GPC
// set now rather than after we've generated 12 pages of a story that
// references a grapheme the learner hasn't been taught yet.
// =============================================================================

export class SeedSpecValidator {
  private readonly knownGpcs = new Set([
    's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck',
    'e', 'u', 'r', 'h', 'b', 'f', 'l', 'ff', 'll', 'ss', 'j', 'v', 'w',
    'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh',
    'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er',
    'ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew',
    'oe', 'au', 'ey', 'a_e', 'i_e', 'o_e', 'u_e',
  ]);

  validate(specs: SeedBookSpec[]): Result<void> {
    const errors: string[] = [];
    const ids = new Set<string>();
    const titles = new Set<string>();

    for (const spec of specs) {
      // Unique ID
      if (ids.has(spec.id)) {
        errors.push(`Duplicate spec ID: ${spec.id}`);
      }
      ids.add(spec.id);

      // Unique title
      if (titles.has(spec.title)) {
        errors.push(`Duplicate title: ${spec.title}`);
      }
      titles.add(spec.title);

      // Target GPCs must be subset of taught GPC set
      for (const gpc of spec.targetGpcs) {
        if (!spec.taughtGpcSet.includes(gpc)) {
          errors.push(`${spec.id}: Target GPC '${gpc}' not in taught set`);
        }
      }

      // All GPCs must be known
      for (const gpc of spec.taughtGpcSet) {
        if (!this.knownGpcs.has(gpc)) {
          errors.push(`${spec.id}: Unknown GPC '${gpc}'`);
        }
      }

      // Page count bounds
      if (spec.pageCount < 4 || spec.pageCount > 24) {
        errors.push(`${spec.id}: Page count ${spec.pageCount} outside 4-24 range`);
      }

      // Age range
      if (spec.ageMin >= spec.ageMax) {
        errors.push(`${spec.id}: ageMin (${spec.ageMin}) >= ageMax (${spec.ageMax})`);
      }
      if (spec.ageMin < 3 || spec.ageMax > 12) {
        errors.push(`${spec.id}: Age range ${spec.ageMin}-${spec.ageMax} outside 3-12`);
      }

      // WCPM bands
      if (spec.wcpmBandMin >= spec.wcpmBandMax) {
        errors.push(`${spec.id}: wcpmBandMin (${spec.wcpmBandMin}) >= wcpmBandMax (${spec.wcpmBandMax})`);
      }

      // Phase-GPC alignment
      const phaseValidation = this.validatePhaseAlignment(spec);
      if (phaseValidation) {
        errors.push(`${spec.id}: ${phaseValidation}`);
      }
    }

    // Coverage check: ensure we have at least one book per phase
    const phases = new Set(specs.map(s => s.phase));
    for (const required of ['PHASE_2', 'PHASE_3'] as PhonicsPhase[]) {
      if (!phases.has(required)) {
        errors.push(`No seed books for ${required}`);
      }
    }

    // Series coverage
    const seriesNames = new Set(specs.map(s => s.seriesName));
    if (seriesNames.size < 3) {
      errors.push(`Only ${seriesNames.size} series covered — aim for at least 3`);
    }

    if (errors.length > 0) {
      return Result.fail(`Spec validation failed:\n${errors.join('\n')}`);
    }

    return Result.ok(undefined);
  }

  private validatePhaseAlignment(spec: SeedBookSpec): string | null {
    const phase2Gpcs = new Set(['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss']);
    const phase3Gpcs = new Set(['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er']);
    const phase5Gpcs = new Set(['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'ey', 'a_e', 'i_e', 'o_e', 'u_e']);

    // Target GPCs should include at least some from the declared phase
    if (spec.phase === 'PHASE_2') {
      const hasPhase2 = spec.targetGpcs.some(g => phase2Gpcs.has(g));
      if (!hasPhase2) return 'Phase 2 book has no Phase 2 target GPCs';
    }

    if (spec.phase === 'PHASE_3') {
      const hasPhase3 = spec.targetGpcs.some(g => phase3Gpcs.has(g));
      if (!hasPhase3) return 'Phase 3 book has no Phase 3 target GPCs';
    }

    if (spec.phase === 'PHASE_5') {
      const hasPhase5 = spec.targetGpcs.some(g => phase5Gpcs.has(g));
      if (!hasPhase5) return 'Phase 5 book has no Phase 5 target GPCs';
    }

    return null;
  }
}

// =============================================================================
// Section 3: Cost Estimator
// =============================================================================

export class SeedCostEstimator {
  // Based on Sprint 6 cost table (Strategy doc Section 4.2)
  private readonly costPerPage = {
    narrative: 0.02,      // ~$0.15-0.30 / 12 pages
    illustration: 0.06,   // ~$0.48-0.96 / 12 pages
    narration: 0.015,     // ~$0.10-0.25 / 12 pages
    safety: 0.002,        // ~$0.02 flat
  };

  estimateTotal(specs: SeedBookSpec[], config: Partial<SeedLibraryConfig>): CostEstimate {
    let totalNarrative = 0;
    let totalIllustration = 0;
    let totalNarration = 0;
    let totalSafety = 0;

    for (const spec of specs) {
      totalNarrative += spec.pageCount * this.costPerPage.narrative;
      if (!config.skipIllustration) {
        totalIllustration += spec.pageCount * this.costPerPage.illustration;
      }
      if (!config.skipNarration) {
        totalNarration += spec.pageCount * this.costPerPage.narration;
      }
      totalSafety += this.costPerPage.safety;
    }

    const subtotal = totalNarrative + totalIllustration + totalNarration + totalSafety;
    // Add 20% buffer for retries
    const withRetryBuffer = subtotal * 1.2;

    return {
      narrativeCost: totalNarrative,
      illustrationCost: totalIllustration,
      narrationCost: totalNarration,
      safetyCost: totalSafety,
      subtotal,
      retryBuffer: withRetryBuffer - subtotal,
      estimatedTotal: withRetryBuffer,
      perBookAverage: withRetryBuffer / specs.length,
    };
  }
}

export interface CostEstimate {
  narrativeCost: number;
  illustrationCost: number;
  narrationCost: number;
  safetyCost: number;
  subtotal: number;
  retryBuffer: number;
  estimatedTotal: number;
  perBookAverage: number;
}

// =============================================================================
// Section 4: Generation Progress Tracker
// =============================================================================

export class GenerationProgressTracker {
  private readonly results: Map<string, BookGenerationResult> = new Map();
  private readonly inProgress: Set<string> = new Set();
  private totalCostUsd: number = 0;
  private startTime: number = Date.now();

  constructor(
    private readonly totalBooks: number,
    private readonly budgetLimit: number,
    private readonly onProgress?: (progress: GenerationProgress) => void
  ) {}

  startBook(specId: string): void {
    this.inProgress.add(specId);
    this.emitProgress();
  }

  completeBook(result: BookGenerationResult): void {
    this.inProgress.delete(result.specId);
    this.results.set(result.specId, result);
    if (result.success) {
      this.totalCostUsd += result.totalCostUsd;
    }
    this.emitProgress();
  }

  get completed(): number {
    return [...this.results.values()].filter(r => r.success).length;
  }

  get failed(): number {
    return [...this.results.values()].filter(r => !r.success).length;
  }

  get isOverBudget(): boolean {
    return this.totalCostUsd >= this.budgetLimit;
  }

  private emitProgress(): void {
    if (!this.onProgress) return;

    const elapsed = Date.now() - this.startTime;
    const completedCount = this.completed;
    const avgTimePerBook = completedCount > 0 ? elapsed / completedCount : 0;
    const remaining = this.totalBooks - completedCount - this.failed;
    const avgCostPerBook = completedCount > 0 ? this.totalCostUsd / completedCount : 0;

    this.onProgress({
      totalBooks: this.totalBooks,
      completed: completedCount,
      inProgress: this.inProgress.size,
      failed: this.failed,
      retrying: 0,
      totalCostUsd: this.totalCostUsd,
      estimatedRemainingCostUsd: remaining * avgCostPerBook,
      elapsedMs: elapsed,
      estimatedRemainingMs: remaining * avgTimePerBook,
      currentBooks: [...this.inProgress],
    });
  }
}

// =============================================================================
// Section 5: Report Builder
// =============================================================================

export class SeedReportBuilder {
  static build(
    specs: SeedBookSpec[],
    results: Map<string, BookGenerationResult>,
    config: SeedLibraryConfig,
    durationMs: number
  ): SeedLibraryReport {
    const allResults = [...results.values()];
    const generated = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    const totalCost = generated.reduce((sum, r) => sum + r.totalCostUsd, 0);

    // Phase breakdown
    const phaseGroups = new Map<PhonicsPhase, BookGenerationResult[]>();
    for (const r of allResults) {
      const spec = specs.find(s => s.id === r.specId);
      if (spec) {
        const group = phaseGroups.get(spec.phase) || [];
        group.push(r);
        phaseGroups.set(spec.phase, group);
      }
    }

    const phaseBreakdown: PhaseBreakdown[] = [...phaseGroups.entries()].map(([phase, books]) => {
      const successBooks = books.filter(b => b.success);
      return {
        phase,
        total: books.length,
        generated: successBooks.length,
        failed: books.length - successBooks.length,
        avgDecodabilityScore: successBooks.length > 0
          ? successBooks.reduce((sum, b) => sum + b.decodabilityScore, 0) / successBooks.length
          : 0,
        totalCostUsd: successBooks.reduce((sum, b) => sum + b.totalCostUsd, 0),
      };
    });

    // Series breakdown
    const seriesGroups = new Map<string, BookGenerationResult[]>();
    for (const r of allResults) {
      const spec = specs.find(s => s.id === r.specId);
      if (spec) {
        const group = seriesGroups.get(spec.seriesName) || [];
        group.push(r);
        seriesGroups.set(spec.seriesName, group);
      }
    }

    const seriesBreakdown: SeriesBreakdown[] = [...seriesGroups.entries()].map(([name, books]) => {
      const successBooks = books.filter(b => b.success);
      return {
        seriesName: name,
        total: books.length,
        generated: successBooks.length,
        failed: books.length - successBooks.length,
        totalCostUsd: successBooks.reduce((sum, b) => sum + b.totalCostUsd, 0),
      };
    });

    // Warnings
    const warnings: string[] = [];
    if (generated.length < specs.length) {
      warnings.push(`${specs.length - generated.length} books failed generation`);
    }
    if (totalCost > config.budgetLimitUsd * 0.9) {
      warnings.push('Approaching budget limit');
    }
    const lowDecodability = generated.filter(r => r.decodabilityScore < 0.90);
    if (lowDecodability.length > 0) {
      warnings.push(`${lowDecodability.length} books have decodability below 90%`);
    }

    return {
      totalSpecs: specs.length,
      generated: generated.length,
      failed: failed.length,
      skippedBudget: specs.length - allResults.length,
      totalCostUsd: totalCost,
      totalDurationMs: durationMs,
      averageCostPerBook: generated.length > 0 ? totalCost / generated.length : 0,
      averageDurationPerBook: generated.length > 0 ? durationMs / generated.length : 0,
      phaseBreakdown,
      seriesBreakdown,
      results: allResults,
      budgetRemaining: config.budgetLimitUsd - totalCost,
      warnings,
    };
  }
}

// =============================================================================
// Section 6: Orchestrator & Repository Interfaces
// =============================================================================

export interface StorybookOrchestrator {
  generateNarrative(params: NarrativeParams): Promise<Result<NarrativeResult>>;
  checkSafety(params: SafetyParams): Promise<Result<SafetyResult>>;
  generateIllustrations(params: IllustrationParams): Promise<Result<IllustrationResult>>;
  generateNarration(params: NarrationParams): Promise<Result<NarrationResult>>;
}

export interface NarrativeParams {
  tenantId: string;
  phase: PhonicsPhase;
  targetGpcs: string[];
  taughtGpcSet: string[];
  trickyWords: string[];
  theme: string;
  characterNames: string[];
  ageMin: number;
  ageMax: number;
  pageCount: number;
  vocabularyTier: string;
  narrativeTemplate: string;
  model: string;
  temperature: number;
}

export interface NarrativeResult {
  pages: Array<{ pageNumber: number; text: string; }>;
  wordCount: number;
  decodabilityScore: number;
  costUsd: number;
}

export interface SafetyParams {
  text: string;
  ageMin: number;
  ageMax: number;
}

export interface SafetyResult {
  isSafe: boolean;
  flags: string[];
  costUsd: number;
}

export interface IllustrationParams {
  storybookId: string;
  pages: Array<{ pageNumber: number; text: string; }>;
  artStyle: string;
  characterDescriptions: Record<string, string>;
  model: string;
}

export interface IllustrationResult {
  illustrations: Array<{ pageNumber: number; url: string; cost: number; }>;
  totalCostUsd: number;
}

export interface NarrationParams {
  storybookId: string;
  pages: Array<{ pageNumber: number; text: string; }>;
  voiceId: string;
}

export interface NarrationResult {
  narrations: Array<{ pageNumber: number; audioUrl: string; timestamps: unknown[]; cost: number; }>;
  totalCostUsd: number;
}

export interface StorybookRepository {
  create(data: Record<string, unknown>): Promise<Result<{ id: string }>>;
  createPages(storybookId: string, pages: unknown[]): Promise<Result<void>>;
}

export interface EventPublisher {
  publish(subject: string, data: Record<string, unknown>): Promise<void>;
}

// Line count: ~420
