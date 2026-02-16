export type Result<T> = { success: true; data: T } | { success: false; error: string };
export function ok<T>(data: T): Result<T> { return { success: true, data }; }
export function fail<T>(error: string): Result<T> { return { success: false, error }; }
export class ScholarlyBaseService {
  protected context: Record<string, unknown>;
  protected serviceName: string;
  constructor(ctx: Record<string, unknown> = {}, name: string = 'BaseService') { this.context = ctx; this.serviceName = name; }
  protected log(level: string, msg: string, data?: unknown): void { /* structured logging */ }
}
