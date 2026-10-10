function trimLower(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function normaliseEmail(value: string | null | undefined): string {
  return trimLower(value);
}

export function normaliseUuid(value: string | null | undefined): string {
  return trimLower(value);
}
