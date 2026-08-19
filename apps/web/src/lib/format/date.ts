export const TIMEZONE_WIB = 'Asia/Jakarta';

/**
 * Parses a date string safely as UTC, specifically handling bare ClickHouse
 * timestamps like "2026-08-19 09:10:00" without the 'Z' suffix.
 */
export function parseUtcDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;

  const trimmed = dateInput.trim();
  if (trimmed.endsWith('Z') || trimmed.includes('+') || trimmed.includes('T')) {
    // If it has 'T' without timezone, check if it ends with Z
    if (trimmed.includes('T') && !trimmed.endsWith('Z') && !trimmed.includes('+')) {
      return new Date(`${trimmed}Z`);
    }
    return new Date(trimmed);
  }

  // Handle "YYYY-MM-DD HH:mm:ss" ClickHouse timestamp format
  const isoFormatted = trimmed.replace(' ', 'T') + 'Z';
  return new Date(isoFormatted);
}

/**
 * Formats a UTC timestamp into Indonesian date and time string in Asia/Jakarta (WIB).
 * Example output: "19 Agu 2026, 16.10"
 */
export function formatDateTimeWib(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;

  try {
    const date = parseUtcDate(dateInput);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: TIMEZONE_WIB,
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Formats a UTC timestamp into Indonesian date only in Asia/Jakarta (WIB).
 * Example output: "19 Agu 2026"
 */
export function formatDateWib(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;

  try {
    const date = parseUtcDate(dateInput);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeZone: TIMEZONE_WIB,
    }).format(date);
  } catch {
    return null;
  }
}
