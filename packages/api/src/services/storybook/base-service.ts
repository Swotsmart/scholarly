// ============================================================================
// SCHOLARLY PLATFORM — Sprint 12: Shared Base
// Production Launch Preparation, Content Seeding, Security & Public Beta
// ============================================================================

export abstract class ScholarlyBaseService {
  protected tenantId: string;
  protected userId: string;

  constructor(tenantId: string, userId: string) {
    this.tenantId = tenantId;
    this.userId = userId;
  }

  protected emit(event: string, payload: Record<string, unknown>): void {
    // NATS JetStream event publishing
  }

  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>): void {
    // Structured logging with OpenTelemetry context
  }
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}
