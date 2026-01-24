// MRAC (Machine Readable Australian Curriculum) Processor
// Exports for programmatic usage

export * from './types';
export { MRACParser } from './parser';
export { CurriculumIngester, runIngestion, type IngestionOptions, type IngestionResult } from './ingester';
