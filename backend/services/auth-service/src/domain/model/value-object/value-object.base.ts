/**
 * Base for every single-value Value Object.
 */
export abstract class ValueObject<T> {
  readonly val: T;

  protected constructor(value: T) {
    this.val = value;
  }

  get value(): T {
    return this.val;
  }

  equals(other: ValueObject<T> | null | undefined): boolean {
    return other != null && other.constructor === this.constructor && other.val === this.val;
  }

  toString(): string {
    return String(this.val);
  }

  toJSON(): T {
    return this.value;
  }
}
