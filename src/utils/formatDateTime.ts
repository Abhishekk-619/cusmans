import { format, isValid } from 'date-fns'

/**
 * Parses a followup_date string (datetime-local format "YYYY-MM-DDTHH:mm" or date-only "YYYY-MM-DD")
 * and returns a consistently formatted display string: "May 20, 2026 · 02:30 PM"
 * Returns "—" if null or invalid.
 */
export function formatFollowupDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isValid(d)) return '—'
    // If date-only (no time component), show date only
    if (dateStr.length === 10) {
      return format(d, 'MMM d, yyyy')
    }
    return format(d, 'MMM d, yyyy · hh:mm a')
  } catch {
    return '—'
  }
}

/**
 * Formats a created_at ISO timestamp as "May 20, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isValid(d)) return '—'
    return format(d, 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

/**
 * Formats a created_at ISO timestamp as "02:30 PM"
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (!isValid(d)) return '—'
    return format(d, 'hh:mm a')
  } catch {
    return '—'
  }
}
