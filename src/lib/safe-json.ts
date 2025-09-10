/**
 * Safely parses a JSON string, returning a fallback value if parsing fails
 * or if the input is null, undefined, or an empty string.
 *
 * @template T The expected type of the parsed object.
 * @param raw The raw string to parse.
 * @param fallback The value to return if parsing is unsuccessful.
 * @returns The parsed object of type T, or the fallback value.
 */
export function safeParse<T = unknown>(
  raw: string | null | undefined,
  fallback: T
): T {
  if (raw == null || raw === "") {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
