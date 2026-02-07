// =============================================================================
// @scholarly/storybook-cli — Command-Line Storybook Tool
// =============================================================================
// The Storybook CLI is the power user's gateway to the Scholarly Storybook
// Engine. If the Content SDK is the engine and the Storybook Studio is the
// automatic transmission, the CLI is the manual gearbox — it gives educators
// and developers who are comfortable with a terminal direct, scriptable
// control over the entire content lifecycle.
//
// Commands:
//   scholarly init          — Initialise a new storybook project
//   scholarly generate      — Generate a story from a spec file
//   scholarly validate      — Validate a storybook against phonics constraints
//   scholarly illustrate    — Generate illustrations for a story
//   scholarly narrate       — Generate audio narration
//   scholarly publish       — Submit to the review pipeline
//   scholarly search        — Search the storybook library
//   scholarly analytics     — View reading analytics for a published book
//   scholarly config        — Manage API credentials and defaults
//
// File: sdk/storybook-cli.ts
// Sprint: 8 (Developer Ecosystem & Platform Activation)
// Backlog: DE-003
// Lines: ~620
// =============================================================================

import { Result } from '../shared/result';
import {
  ScholarlyContentSDK,
  ScholarlySDKConfig,
  StoryGenerationRequest,
  IllustrationRequest,
  NarrationRequest,
  LibrarySearchParams,
  StorybookStatus,
  PhonicsPhase,
  ArtStyle,
  GenerationStreamEvent,
} from './content-sdk';
import { ContentValidator, StorybookInput } from './content-validator';

// =============================================================================
// Section 1: CLI Configuration & Credential Management
// =============================================================================

interface CLIConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  defaultPhase: PhonicsPhase;
  defaultArtStyle: ArtStyle;
  defaultLanguage: string;
  outputFormat: 'json' | 'table' | 'pretty';
  verbose: boolean;
}

interface StorybookSpec {
  title: string;
  phase: PhonicsPhase;
  targetGpcs: string[];
  taughtGpcSet: string[];
  theme: string;
  pageCount?: number;
  ageRange?: { min: number; max: number };
  narrativeTemplate?: string;
  artStyle?: ArtStyle;
  seriesId?: string;
  vocabularyTier?: string;
  decodabilityThreshold?: number;
  comprehensionStrand?: string;
  morphemeFocus?: string[];
  culturalContext?: string[];
  creatorNotes?: string;
  voiceId?: string;
  narrationSpeed?: 'slow' | 'normal' | 'fast';
}

const DEFAULT_CONFIG: CLIConfig = {
  apiBaseUrl: 'https://api.scholarly.app/v1',
  clientId: '',
  clientSecret: '',
  tenantId: '',
  defaultPhase: 2,
  defaultArtStyle: 'watercolour',
  defaultLanguage: 'en-AU',
  outputFormat: 'pretty',
  verbose: false,
};

// =============================================================================
// Section 2: Output Formatters
// =============================================================================

interface OutputFormatter {
  success(message: string): string;
  error(message: string): string;
  warning(message: string): string;
  info(message: string): string;
  header(text: string): string;
  progress(current: number, total: number, label: string): string;
  table(headers: string[], rows: string[][]): string;
  json(data: unknown): string;
}

class PrettyFormatter implements OutputFormatter {
  success(message: string): string { return `✅ ${message}`; }
  error(message: string): string { return `❌ ${message}`; }
  warning(message: string): string { return `⚠️  ${message}`; }
  info(message: string): string { return `ℹ️  ${message}`; }
  header(text: string): string { return `\n${'═'.repeat(60)}\n  ${text}\n${'═'.repeat(60)}`; }

  progress(current: number, total: number, label: string): string {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filled = Math.round(barLength * (current / total));
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    return `  ${bar} ${percentage}% — ${label}`;
  }

  table(headers: string[], rows: string[][]): string {
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    );
    const separator = widths.map(w => '─'.repeat(w + 2)).join('┼');
    const headerRow = headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join('│');
    const dataRows = rows.map(row =>
      row.map((cell, i) => ` ${(cell || '').padEnd(widths[i])} `).join('│')
    );
    return [headerRow, separator, ...dataRows].join('\n');
  }

  json(data: unknown): string { return JSON.stringify(data, null, 2); }
}

class JsonFormatter implements OutputFormatter {
  success(message: string): string { return JSON.stringify({ status: 'success', message }); }
  error(message: string): string { return JSON.stringify({ status: 'error', message }); }
  warning(message: string): string { return JSON.stringify({ status: 'warning', message }); }
  info(message: string): string { return JSON.stringify({ status: 'info', message }); }
  header(_text: string): string { return ''; }
  progress(current: number, total: number, label: string): string {
    return JSON.stringify({ progress: Math.round((current / total) * 100), label });
  }
  table(headers: string[], rows: string[][]): string {
    return JSON.stringify(rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]]))));
  }
  json(data: unknown): string { return JSON.stringify(data, null, 2); }
}

// =============================================================================
// Section 3: File System Abstraction
// =============================================================================

interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  readDir(path: string): Promise<string[]>;
  homeDir(): string;
}

class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(path, 'utf-8');
  }
  async writeFile(path: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    const pathMod = await import('path');
    await fs.mkdir(pathMod.dirname(path), { recursive: true });
    await fs.writeFile(path, content, 'utf-8');
  }
  async exists(path: string): Promise<boolean> {
    const fs = await import('fs/promises');
    try { await fs.access(path); return true; } catch { return false; }
  }
  async mkdir(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path, { recursive: true });
  }
  async readDir(path: string): Promise<string[]> {
    const fs = await import('fs/promises');
    return fs.readdir(path);
  }
  homeDir(): string {
    return process.env.HOME || process.env.USERPROFILE || '/tmp';
  }
}

// =============================================================================
// Section 4: CLI Command Implementations
// =============================================================================

export class StorybookCLI {
  private readonly fs: FileSystem;
  private readonly validator: ContentValidator;
  private config: CLIConfig;
  private sdk: ScholarlyContentSDK | null = null;
  private formatter: OutputFormatter;

  constructor(fs?: FileSystem) {
    this.fs = fs || new NodeFileSystem();
    this.validator = new ContentValidator();
    this.config = { ...DEFAULT_CONFIG };
    this.formatter = new PrettyFormatter();
  }

  async loadConfig(): Promise<Result<void>> {
    try {
      const configPath = `${this.fs.homeDir()}/.scholarly/config.json`;
      if (await this.fs.exists(configPath)) {
        const raw = await this.fs.readFile(configPath);
        const loaded = JSON.parse(raw) as Partial<CLIConfig>;
        this.config = { ...DEFAULT_CONFIG, ...loaded };
      }
      this.formatter = this.config.outputFormat === 'json' ? new JsonFormatter() : new PrettyFormatter();
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to load config: ${error}` };
    }
  }

  async saveConfig(updates: Partial<CLIConfig>): Promise<Result<void>> {
    try {
      this.config = { ...this.config, ...updates };
      const configPath = `${this.fs.homeDir()}/.scholarly/config.json`;
      await this.fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to save config: ${error}` };
    }
  }

  private ensureSDK(): ScholarlyContentSDK {
    if (!this.sdk) {
      if (!this.config.clientId || !this.config.clientSecret) {
        throw new Error('Not authenticated. Run "scholarly config" to set up API credentials.');
      }
      this.sdk = new ScholarlyContentSDK({
        baseUrl: this.config.apiBaseUrl,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        tenantId: this.config.tenantId,
      });
    }
    return this.sdk;
  }

  // -------------------------------------------------------------------------
  // Command: init
  // -------------------------------------------------------------------------

  async commandInit(projectName: string, options: { phase?: number; theme?: string }): Promise<string[]> {
    const output: string[] = [];
    const phase = (options.phase || this.config.defaultPhase) as PhonicsPhase;
    const gpcs = this.validator.getGpcsForPhase(phase);
    const trickyWords = this.validator.getTrickyWordsForPhase(phase);

    const spec: StorybookSpec = {
      title: `${projectName} — A Phase ${phase} Adventure`,
      phase,
      targetGpcs: gpcs.slice(0, 5),
      taughtGpcSet: gpcs,
      theme: options.theme || 'adventure',
      pageCount: phase <= 2 ? 8 : 12,
      ageRange: phase <= 2 ? { min: 4, max: 5 } : phase <= 4 ? { min: 5, max: 7 } : { min: 7, max: 9 },
      artStyle: this.config.defaultArtStyle,
      decodabilityThreshold: 85,
      narrativeTemplate: 'heros_journey',
      narrationSpeed: 'slow',
    };

    const projectDir = `./${projectName}`;
    await this.fs.mkdir(projectDir);
    await this.fs.writeFile(`${projectDir}/storybook.spec.json`, JSON.stringify(spec, null, 2));

    const readme = [
      `# ${projectName}`,
      '', `A Scholarly Storybook targeting Phase ${phase} phonics.`,
      '', '## Quick Start',
      '', '1. Edit `storybook.spec.json` to customise your story parameters',
      '2. Run `scholarly validate storybook.spec.json` to check constraints',
      '3. Run `scholarly generate storybook.spec.json` to generate the story',
      '4. Run `scholarly illustrate <story-id>` to add illustrations',
      '5. Run `scholarly narrate <story-id>` to add audio narration',
      '6. Run `scholarly publish <story-id>` to submit for review',
      '', `## Phase ${phase} GPCs Available`, '', `\`${gpcs.join(', ')}\``,
      '', `## Tricky Words (up to Phase ${phase})`, '', `\`${trickyWords.join(', ')}\``,
    ].join('\n');

    await this.fs.writeFile(`${projectDir}/README.md`, readme);

    output.push(this.formatter.header(`Project "${projectName}" Initialised`));
    output.push(this.formatter.success(`Created ${projectDir}/storybook.spec.json`));
    output.push(this.formatter.success(`Created ${projectDir}/README.md`));
    output.push(this.formatter.info(`Phase ${phase}: ${gpcs.length} GPCs available, ${trickyWords.length} tricky words`));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: validate
  // -------------------------------------------------------------------------

  async commandValidate(specPath: string): Promise<string[]> {
    const output: string[] = [];
    const raw = await this.fs.readFile(specPath);
    const spec = JSON.parse(raw) as StorybookSpec | StorybookInput;

    if (!('pages' in spec) || !spec.pages) {
      output.push(this.formatter.header('Spec Validation'));
      output.push(this.formatter.info('No page content found — validating metadata only.'));
      const gpcs = this.validator.getGpcsForPhase(spec.phase);
      const taughtSet = new Set((spec.taughtGpcSet || []).map((g: string) => g.toLowerCase()));
      const missingGpcs = gpcs.filter(g => !taughtSet.has(g.toLowerCase()));
      if (missingGpcs.length > 0) {
        output.push(this.formatter.warning(`Taught GPC set missing ${missingGpcs.length} Phase ${spec.phase} GPCs`));
      }
      for (const gpc of spec.targetGpcs) {
        if (!taughtSet.has(gpc.toLowerCase())) {
          output.push(this.formatter.error(`Target GPC "${gpc}" not in taught set`));
        }
      }
      output.push(this.formatter.success('Spec metadata validation complete'));
      return output;
    }

    const result = this.validator.validate(spec as StorybookInput);
    if (!result.success) {
      output.push(this.formatter.error(`Validation failed: ${result.error}`));
      return output;
    }

    const report = result.data!;
    output.push(this.formatter.header('Comprehensive Validation Report'));
    output.push(`\n📖 Decodability: ${report.decodability.score}% (${report.decodability.decodableWords}/${report.decodability.totalWords} words)`);
    if (report.decodability.undecodableWords.length > 0) {
      output.push(`   Undecodable: ${report.decodability.undecodableWords.slice(0, 10).map(w => w.word).join(', ')}`);
    }
    output.push(`\n🛡️  Safety: ${report.safety.safe ? 'PASS' : 'FAIL'} (${report.safety.flaggedContent.length} flags)`);
    output.push(`\n📝 Vocabulary: ${report.vocabulary.totalUniqueWords} unique words, avg sentence ${report.vocabulary.averageSentenceLength} words`);
    output.push(`\n🎯 Curriculum Alignment: ${report.curriculumAlignmentScore}%`);

    const errors = report.issues.filter(i => i.severity === 'error');
    const warnings = report.issues.filter(i => i.severity === 'warning');
    if (errors.length > 0) {
      output.push('\n❌ Errors:');
      for (const issue of errors) output.push(`   [${issue.code}] ${issue.message}`);
    }
    if (warnings.length > 0) {
      output.push('\n⚠️  Warnings:');
      for (const w of warnings) output.push(`   [${w.code}] ${w.message}`);
    }
    if (report.suggestions.length > 0) {
      output.push('\n💡 Suggestions:');
      for (const s of report.suggestions) output.push(`   ${s}`);
    }

    output.push('');
    output.push(report.valid
      ? this.formatter.success('VALIDATION PASSED — Ready for submission')
      : this.formatter.error(`VALIDATION FAILED — ${errors.length} error(s) must be resolved`));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: generate
  // -------------------------------------------------------------------------

  async commandGenerate(specPath: string, options: { stream?: boolean }): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();
    const raw = await this.fs.readFile(specPath);
    const spec = JSON.parse(raw) as StorybookSpec;

    output.push(this.formatter.header(`Generating: ${spec.title}`));
    output.push(this.formatter.info(`Phase ${spec.phase} | Theme: ${spec.theme} | Pages: ${spec.pageCount || 12}`));

    const request: StoryGenerationRequest = {
      phase: spec.phase,
      targetGpcs: spec.targetGpcs,
      taughtGpcSet: spec.taughtGpcSet,
      theme: spec.theme,
      pageCount: spec.pageCount,
      ageRange: spec.ageRange,
      narrativeTemplate: spec.narrativeTemplate,
      artStyle: spec.artStyle,
      decodabilityThreshold: spec.decodabilityThreshold,
      comprehensionStrand: spec.comprehensionStrand as any,
      morphemeFocus: spec.morphemeFocus,
      culturalContext: spec.culturalContext,
      creatorNotes: spec.creatorNotes,
    };

    if (options.stream) {
      let lastProgress = 0;
      for await (const event of sdk.generateStoryStream(request)) {
        if (event.type === 'progress' && event.progress !== undefined) {
          if (event.progress - lastProgress >= 10) {
            output.push(this.formatter.progress(event.progress, 100, event.message));
            lastProgress = event.progress;
          }
        } else if (event.type === 'page_complete') {
          output.push(this.formatter.success(`Page ${event.pageNumber} generated`));
        } else if (event.type === 'complete' && event.data) {
          const storyId = (event.data as any).id;
          output.push(this.formatter.success(`Generation complete! Story ID: ${storyId}`));
          const outputPath = specPath.replace('.spec.json', '.story.json');
          await this.fs.writeFile(outputPath, JSON.stringify(event.data, null, 2));
          output.push(this.formatter.success(`Saved to ${outputPath}`));
        } else if (event.type === 'error') {
          output.push(this.formatter.error(event.message));
        }
      }
    } else {
      output.push(this.formatter.info('Generating story (this may take up to 2 minutes)...'));
      const result = await sdk.generateStory(request);
      if (!result.success) {
        output.push(this.formatter.error(`Generation failed: ${result.error}`));
        return output;
      }
      const story = result.data!;
      output.push(this.formatter.success(`"${story.title}" generated successfully`));
      output.push(this.formatter.info(`Story ID: ${story.id} | Pages: ${story.pages.length} | Decodability: ${story.decodabilityScore}%`));
      const outputPath = specPath.replace('.spec.json', '.story.json');
      await this.fs.writeFile(outputPath, JSON.stringify(story, null, 2));
      output.push(this.formatter.success(`Saved to ${outputPath}`));
    }
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: illustrate
  // -------------------------------------------------------------------------

  async commandIllustrate(storyId: string, options: { style?: string; decompose?: boolean }): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();
    output.push(this.formatter.header(`Illustrating Story: ${storyId}`));

    const request: IllustrationRequest = {
      artStyle: (options.style as ArtStyle) || this.config.defaultArtStyle,
      sceneDecomposition: options.decompose ?? true,
    };

    output.push(this.formatter.info(`Style: ${request.artStyle} | Scene decomposition: ${request.sceneDecomposition}`));
    output.push(this.formatter.info('Generating illustrations (this may take up to 3 minutes)...'));

    const result = await sdk.illustrateStory(storyId, request);
    if (!result.success) {
      output.push(this.formatter.error(`Illustration failed: ${result.error}`));
      return output;
    }

    const story = result.data!;
    const illustratedPages = story.pages.filter(p => p.illustrationUrl);
    output.push(this.formatter.success(`${illustratedPages.length}/${story.pages.length} pages illustrated`));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: narrate
  // -------------------------------------------------------------------------

  async commandNarrate(storyId: string, options: { voice?: string; speed?: string }): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();
    output.push(this.formatter.header(`Narrating Story: ${storyId}`));

    const request: NarrationRequest = {
      voiceId: options.voice,
      speed: (options.speed as 'slow' | 'normal' | 'fast') || 'normal',
      wordLevelTimestamps: true,
    };

    output.push(this.formatter.info('Generating narration with word-level timestamps...'));
    const result = await sdk.narrateStory(storyId, request);
    if (!result.success) {
      output.push(this.formatter.error(`Narration failed: ${result.error}`));
      return output;
    }

    const story = result.data!;
    const narratedPages = story.pages.filter(p => p.audioUrl);
    const timestampedPages = story.pages.filter(p => p.wordTimestamps && p.wordTimestamps.length > 0);
    output.push(this.formatter.success(`${narratedPages.length} pages narrated, ${timestampedPages.length} with word timestamps`));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: publish
  // -------------------------------------------------------------------------

  async commandPublish(storyId: string): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();
    output.push(this.formatter.header(`Publishing Story: ${storyId}`));
    output.push(this.formatter.info('Submitting to the five-stage review pipeline...'));

    const result = await sdk.submitStory(storyId);
    if (!result.success) {
      output.push(this.formatter.error(`Submission failed: ${result.error}`));
      return output;
    }

    const submission = result.data!;
    output.push(this.formatter.success(`Submitted! Submission ID: ${submission.submissionId}`));
    output.push(this.formatter.info(`Current stage: ${submission.stage}`));
    output.push(this.formatter.info('Track progress with: scholarly status <submission-id>'));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: search
  // -------------------------------------------------------------------------

  async commandSearch(query: string, options: { phase?: number; limit?: number }): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();

    const params: LibrarySearchParams = {
      theme: query,
      phase: options.phase as PhonicsPhase,
      limit: options.limit || 10,
      status: 'published' as StorybookStatus,
      sortBy: 'relevance',
    };

    const result = await sdk.searchLibrary(params);
    if (!result.success) {
      output.push(this.formatter.error(`Search failed: ${result.error}`));
      return output;
    }

    const searchResult = result.data!;
    output.push(this.formatter.header(`Search Results: "${query}" (${searchResult.total} found)`));

    if (searchResult.books.length === 0) {
      output.push(this.formatter.info('No storybooks found matching your criteria.'));
      return output;
    }

    const rows = searchResult.books.map(book => [
      book.id.substring(0, 8),
      book.title.substring(0, 30),
      `Phase ${book.phase}`,
      `${book.decodabilityScore}%`,
      book.analytics?.averageRating?.toFixed(1) || 'N/A',
      `${book.analytics?.readCount || 0} reads`,
    ]);

    output.push(this.formatter.table(['ID', 'Title', 'Phase', 'Decodability', 'Rating', 'Reads'], rows));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: analytics
  // -------------------------------------------------------------------------

  async commandAnalytics(storyId: string): Promise<string[]> {
    const output: string[] = [];
    const sdk = this.ensureSDK();

    const result = await sdk.getAnalytics(storyId);
    if (!result.success) {
      output.push(this.formatter.error(`Failed to fetch analytics: ${result.error}`));
      return output;
    }

    const analytics = result.data!;
    output.push(this.formatter.header(`Analytics: ${storyId}`));
    output.push(this.formatter.table(['Metric', 'Value'], [
      ['Total Reads', String(analytics.readCount)],
      ['Completion Rate', `${(analytics.completionRate * 100).toFixed(1)}%`],
      ['Average Accuracy', `${(analytics.averageAccuracy * 100).toFixed(1)}%`],
      ['Average Time', `${Math.round(analytics.averageTimeSeconds)}s`],
      ['Re-Read Rate', `${(analytics.reReadRate * 100).toFixed(1)}%`],
      ['Average Rating', analytics.averageRating?.toFixed(1) || 'N/A'],
      ['Total Ratings', String(analytics.ratingCount)],
    ]));
    return output;
  }

  // -------------------------------------------------------------------------
  // Command: config
  // -------------------------------------------------------------------------

  async commandConfig(action: string, key?: string, value?: string): Promise<string[]> {
    const output: string[] = [];

    if (action === 'set' && key && value) {
      const updates: Partial<CLIConfig> = {};
      (updates as any)[key] = value;
      const result = await this.saveConfig(updates);
      if (!result.success) {
        output.push(this.formatter.error(result.error!));
      } else {
        output.push(this.formatter.success(`Set ${key} = ${key === 'clientSecret' ? '****' : value}`));
      }
    } else if (action === 'get' && key) {
      const val = (this.config as any)[key];
      output.push(key === 'clientSecret' ? '****' : String(val ?? 'not set'));
    } else if (action === 'list') {
      output.push(this.formatter.header('Current Configuration'));
      output.push(this.formatter.table(['Key', 'Value'], [
        ['apiBaseUrl', this.config.apiBaseUrl],
        ['clientId', this.config.clientId || '(not set)'],
        ['clientSecret', this.config.clientSecret ? '****' : '(not set)'],
        ['tenantId', this.config.tenantId || '(not set)'],
        ['defaultPhase', String(this.config.defaultPhase)],
        ['defaultArtStyle', this.config.defaultArtStyle],
        ['defaultLanguage', this.config.defaultLanguage],
        ['outputFormat', this.config.outputFormat],
        ['verbose', String(this.config.verbose)],
      ]));
    } else {
      output.push(this.formatter.info('Usage: scholarly config <list|set|get> [key] [value]'));
    }
    return output;
  }

  // -------------------------------------------------------------------------
  // Command Router
  // -------------------------------------------------------------------------

  private parseOption(args: string[], flag: string, parser?: (v: string) => any): unknown {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return undefined;
    const value = args[idx + 1];
    return parser ? parser(value) : value;
  }

  async execute(args: string[]): Promise<string[]> {
    await this.loadConfig();
    const command = args[0];
    const restArgs = args.slice(1);

    switch (command) {
      case 'init':
        return this.commandInit(restArgs[0] || 'my-storybook', {
          phase: this.parseOption(restArgs, '--phase', parseInt) as number | undefined,
          theme: this.parseOption(restArgs, '--theme') as string | undefined,
        });

      case 'validate':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly validate <spec-file>')];
        return this.commandValidate(restArgs[0]);

      case 'generate':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly generate <spec-file>')];
        return this.commandGenerate(restArgs[0], { stream: restArgs.includes('--stream') });

      case 'illustrate':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly illustrate <story-id>')];
        return this.commandIllustrate(restArgs[0], {
          style: this.parseOption(restArgs, '--style') as string | undefined,
          decompose: !restArgs.includes('--no-decompose'),
        });

      case 'narrate':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly narrate <story-id>')];
        return this.commandNarrate(restArgs[0], {
          voice: this.parseOption(restArgs, '--voice') as string | undefined,
          speed: this.parseOption(restArgs, '--speed') as string | undefined,
        });

      case 'publish':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly publish <story-id>')];
        return this.commandPublish(restArgs[0]);

      case 'search':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly search <query>')];
        return this.commandSearch(restArgs[0], {
          phase: this.parseOption(restArgs, '--phase', parseInt) as number | undefined,
          limit: this.parseOption(restArgs, '--limit', parseInt) as number | undefined,
        });

      case 'analytics':
        if (!restArgs[0]) return [this.formatter.error('Usage: scholarly analytics <story-id>')];
        return this.commandAnalytics(restArgs[0]);

      case 'config':
        return this.commandConfig(restArgs[0] || 'list', restArgs[1], restArgs[2]);

      case 'help':
      default:
        return this.commandHelp();
    }
  }

  private commandHelp(): string[] {
    return [
      this.formatter.header('Scholarly Storybook CLI'),
      '',
      '  scholarly init <name>              Initialise a new storybook project',
      '  scholarly generate <spec>           Generate a story from a spec file',
      '    --stream                          Show real-time generation progress',
      '  scholarly validate <spec|story>     Validate against phonics constraints',
      '  scholarly illustrate <id>           Generate illustrations',
      '    --style <style>                   Art style (watercolour, flat_vector, etc.)',
      '    --no-decompose                    Skip scene decomposition',
      '  scholarly narrate <id>              Generate audio narration',
      '    --voice <voice-id>                ElevenLabs voice ID',
      '    --speed <slow|normal|fast>        Narration speed',
      '  scholarly publish <id>              Submit to review pipeline',
      '  scholarly search <query>            Search the storybook library',
      '    --phase <1-6>                     Filter by phonics phase',
      '    --limit <n>                       Number of results (default 10)',
      '  scholarly analytics <id>            View reading analytics',
      '  scholarly config list               Show current configuration',
      '  scholarly config set <key> <value>  Update a config value',
      '',
      '  Configuration is stored in ~/.scholarly/config.json',
      '',
    ];
  }
}

// =============================================================================
// Section 5: CLI Entry Point
// =============================================================================

export async function main(): Promise<void> {
  const cli = new StorybookCLI();
  const args = process.argv.slice(2);

  try {
    const output = await cli.execute(args);
    for (const line of output) {
      if (line) console.log(line);
    }
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export default StorybookCLI;
