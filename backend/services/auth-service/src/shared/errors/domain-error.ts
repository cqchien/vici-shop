/**
 * Base class for every typed domain error.
 *
 * The domain and application layers throw `DomainError` subclasses — never `new Error('bad')`.
 */
export abstract class DomainError extends Error {
  /** Stable SCREAMING_SNAKE_CASE code. */
  abstract readonly code: string;

  /** HTTP status the edge returns. 400 validation/business, 409 state conflict, 422 invariant. */
  abstract readonly httpStatus: number;

  /** Set when the error is tied to one request field (validation). */
  readonly field?: string;

  protected constructor(message: string, field?: string) {
    super(message);
    this.name = new.target.name;
    if (field !== undefined) {
      this.field = field;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}
