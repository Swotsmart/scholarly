// =============================================================================
// SCHOLARLY PLATFORM — Sprint 23: Shared Base
// Deployment + Content SDK
// =============================================================================

import { PrismaClient } from '@prisma/client';

// Result<T> — The universal error-handling contract across all Scholarly services
interface Success<T> { success: true; data: T; }
interface Failure { success: false; error: string; code: string; details?: Record<string, unknown>; }
type Result<T> = Success<T> | Failure;

function ok<T>(data: T): Result<T> { return { success: true, data }; }
function fail<T>(error: string, code: string, details?: Record<string, unknown>): Result<T> {
  return { success: false, error, code, details };
}

// ScholarlyBaseService — Every Sprint 23 service inherits this foundation
abstract class ScholarlyBaseService {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly serviceName: string
  ) {}

  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    const entry = { timestamp: new Date().toISOString(), service: this.serviceName, level, message, ...meta };
    if (level === 'error') console.error(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }

  protected emit(event: string, payload: Record<string, unknown>): void {
    this.log('info', `Event emitted: ${event}`, { event, payload });
  }
}

export { Result, Success, Failure, ok, fail, ScholarlyBaseService };
