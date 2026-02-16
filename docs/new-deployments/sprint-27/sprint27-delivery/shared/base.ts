export interface Result<T> { success: boolean; data?: T; error?: string; code?: string; details?: unknown; }
export function ok<T>(data: T): Result<T> { return { success: true, data }; }
export function fail<T>(error: string, code?: string, details?: unknown): Result<T> { return { success: false, error, code, details }; }
export class ScholarlyBaseService {
  protected serviceName: string;
  constructor(deps: any, name: string) { this.serviceName = name; }
  protected log(level: string, message: string, meta?: Record<string, unknown>): void {
    const entry = { timestamp: new Date().toISOString(), level, service: this.serviceName, message, ...meta };
    if (level === 'error') console.error(JSON.stringify(entry));
  }
}
