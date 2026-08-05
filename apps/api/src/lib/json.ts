/** Helpers for the JSON-as-text columns SQLite forces us to use. */

export function parseArray(text: string | null | undefined): unknown[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function stringify(value: unknown): string {
  return JSON.stringify(value ?? []);
}
