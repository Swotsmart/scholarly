// ============================================================================
// SCHOLARLY PLATFORM — Sprint 18 Shared Base
// ============================================================================
import { EventEmitter } from 'events';

export type Result<T> = { success: true; data: T } | { success: false; error: string };
export function ok<T>(data: T): Result<T> { return { success: true, data }; }
export function fail<T = never>(error: string): Result<T> { return { success: false, error }; }

export class ScholarlyBaseService extends EventEmitter {
  constructor(protected readonly serviceName: string) { super(); }
  protected log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>): void {
    const entry = { timestamp: new Date().toISOString(), service: this.serviceName, level, message, ...meta };
    if (level === 'error') console.error(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }
}
