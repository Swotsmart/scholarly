#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { runIngestion, IngestionOptions } from './ingester';

const program = new Command();

program
  .name('mrac-processor')
  .description('Machine Readable Australian Curriculum (MRAC) processor')
  .version('1.0.0');

program
  .command('ingest')
  .description('Ingest MRAC JSON-LD files into the database')
  .option('-s, --source <path>', 'Source directory containing MRAC files', './scholarly-project-files/Australian Curriculum')
  .option('-t, --tenant <id>', 'Tenant ID to associate with imported standards')
  .option('-d, --dry-run', 'Parse files without inserting into database')
  .option('-v, --verbose', 'Show detailed progress')
  .option('-b, --batch-size <number>', 'Batch size for database inserts', '100')
  .action(async (opts) => {
    const spinner = ora('Starting MRAC ingestion...').start();

    const options: IngestionOptions = {
      sourcePath: path.resolve(opts.source),
      tenantId: opts.tenant,
      dryRun: opts.dryRun || false,
      verbose: opts.verbose || false,
      batchSize: parseInt(opts.batchSize, 10),
    };

    try {
      if (options.verbose) {
        spinner.info(`Source: ${options.sourcePath}`);
        spinner.info(`Dry run: ${options.dryRun}`);
        spinner.start();
      }

      const result = await runIngestion(options);

      spinner.succeed('Ingestion complete!');

      console.log('\n' + chalk.bold('Results:'));
      console.log(`  Files processed: ${chalk.cyan(result.totalFiles)}`);
      console.log(`  Standards parsed: ${chalk.cyan(result.totalStandards)}`);

      if (!options.dryRun) {
        console.log(`  Inserted: ${chalk.green(result.inserted)}`);
        console.log(`  Updated: ${chalk.yellow(result.updated)}`);
        console.log(`  Skipped: ${chalk.gray(result.skipped)}`);
      }

      console.log(`  Duration: ${chalk.cyan(Math.round(result.duration / 1000))}s`);

      if (result.errors.length > 0) {
        console.log('\n' + chalk.bold.red('Errors:'));
        for (const error of result.errors) {
          console.log(`  ${chalk.red('•')} ${error}`);
        }
      }
    } catch (error) {
      spinner.fail('Ingestion failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate MRAC JSON-LD files without importing')
  .option('-s, --source <path>', 'Source directory containing MRAC files', './scholarly-project-files/Australian Curriculum')
  .action(async (opts) => {
    const spinner = ora('Validating MRAC files...').start();

    try {
      const result = await runIngestion({
        sourcePath: path.resolve(opts.source),
        dryRun: true,
        verbose: true,
      });

      if (result.errors.length === 0) {
        spinner.succeed(`Validation passed! Found ${result.totalStandards} standards in ${result.totalFiles} files.`);
      } else {
        spinner.warn(`Validation completed with ${result.errors.length} warnings`);
        for (const error of result.errors) {
          console.log(`  ${chalk.yellow('⚠')} ${error}`);
        }
      }
    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show statistics about ingested curriculum data')
  .action(async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const totalStandards = await prisma.curriculumStandard.count();
      const byLearningArea = await prisma.curriculumStandard.groupBy({
        by: ['learningArea'],
        _count: true,
      });
      const byType = await prisma.curriculumStandard.groupBy({
        by: ['type'],
        _count: true,
      });

      console.log(chalk.bold('\nCurriculum Database Statistics:\n'));
      console.log(`Total Standards: ${chalk.cyan(totalStandards)}\n`);

      console.log(chalk.bold('By Learning Area:'));
      for (const item of byLearningArea) {
        console.log(`  ${item.learningArea}: ${chalk.cyan(item._count)}`);
      }

      console.log('\n' + chalk.bold('By Type:'));
      for (const item of byType) {
        console.log(`  ${item.type}: ${chalk.cyan(item._count)}`);
      }
    } catch (error) {
      console.error(chalk.red('Failed to fetch statistics'));
      console.error(error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();
