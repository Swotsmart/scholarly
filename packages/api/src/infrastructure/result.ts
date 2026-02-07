// =============================================================================
// SCHOLARLY PLATFORM — Shared Result<T> Pattern
// =============================================================================

export class Result<T> {
  public readonly success: boolean;
  public readonly value: T | null;
  public readonly error: string | null;

  private constructor(success: boolean, value: T | null, error: string | null) {
    this.success = success;
    this.value = value;
    this.error = error;
  }

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value, null);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, null, error);
  }
}
