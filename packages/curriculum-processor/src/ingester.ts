import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { MRACParser } from './parser';
import { ParsedCurriculumStandard } from './types';

export interface IngestionOptions {
  sourcePath: string;
  tenantId?: string;
  dryRun?: boolean;
  verbose?: boolean;
  batchSize?: number;
}

export interface IngestionResult {
  totalFiles: number;
  totalStandards: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  duration: number;
}

export class CurriculumIngester {
  private prisma: PrismaClient;
  private parser: MRACParser;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.parser = new MRACParser();
  }

  async ingest(options: IngestionOptions): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      totalFiles: 0,
      totalStandards: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Find all JSON-LD files
      const pattern = path.join(options.sourcePath, '**/*.jsonld');
      const files = await glob(pattern, { nodir: true });

      if (files.length === 0) {
        result.errors.push(`No JSON-LD files found in ${options.sourcePath}`);
        return result;
      }

      result.totalFiles = files.length;

      if (options.verbose) {
        console.log(`Found ${files.length} curriculum files to process`);
      }

      // Process each file
      for (const file of files) {
        try {
          if (options.verbose) {
            console.log(`Processing: ${path.basename(file)}`);
          }

          const standards = await this.parser.parseFile(file);
          result.totalStandards += standards.length;

          if (options.verbose) {
            console.log(`  Parsed ${standards.length} standards`);
          }

          if (!options.dryRun) {
            const batchResult = await this.insertBatch(
              standards,
              options.tenantId,
              options.batchSize || 100
            );
            result.inserted += batchResult.inserted;
            result.updated += batchResult.updated;
            result.skipped += batchResult.skipped;
          }
        } catch (error) {
          const errorMsg = `Error processing ${file}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          if (options.verbose) {
            console.error(errorMsg);
          }
        }
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.errors.push(`Ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  private async insertBatch(
    standards: ParsedCurriculumStandard[],
    tenantId?: string,
    batchSize: number = 100
  ): Promise<{ inserted: number; updated: number; skipped: number }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches
    for (let i = 0; i < standards.length; i += batchSize) {
      const batch = standards.slice(i, i + batchSize);

      for (const standard of batch) {
        try {
          // Check if standard already exists
          const existing = await this.prisma.curriculumStandard.findFirst({
            where: {
              code: standard.code,
              framework: standard.framework,
            },
          });

          if (existing) {
            // Update existing
            await this.prisma.curriculumStandard.update({
              where: { id: existing.id },
              data: this.mapToDbRecord(standard, tenantId),
            });
            updated++;
          } else {
            // Insert new
            await this.prisma.curriculumStandard.create({
              data: {
                ...this.mapToDbRecord(standard, tenantId),
                tenantId: tenantId || 'default',
              },
            });
            inserted++;
          }
        } catch (error) {
          // Skip duplicates or other errors
          skipped++;
        }
      }
    }

    return { inserted, updated, skipped };
  }

  private mapToDbRecord(standard: ParsedCurriculumStandard, tenantId?: string) {
    return {
      framework: standard.framework,
      code: standard.code,
      type: standard.type,
      learningArea: standard.learningArea,
      subject: standard.subject,
      strand: standard.strand,
      substrand: standard.substrand,
      yearLevels: standard.yearLevels,
      title: standard.title,
      description: standard.description,
      generalCapabilities: standard.generalCapabilities,
      crossCurriculumPriorities: standard.crossCurriculumPriorities,
      metadata: {
        originalId: standard.id,
        parentId: standard.parentId,
        childIds: standard.childIds,
        sequenceNumber: standard.sequenceNumber,
      },
    };
  }

  async close() {
    await this.prisma.$disconnect();
  }
}

// Export for CLI usage
export async function runIngestion(options: IngestionOptions): Promise<IngestionResult> {
  const ingester = new CurriculumIngester();
  try {
    return await ingester.ingest(options);
  } finally {
    await ingester.close();
  }
}
