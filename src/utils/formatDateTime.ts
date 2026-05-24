import { format, isValid } from 'date-fns'

/**
 * Returns { date: "May 20, 2026", time: "02:30 PM" | null }
 * For date-only strings, time falls back to a separately stored time if provided.
 */
export function parseFollowupParts(
  dateStr: string | null | undefined,
  fallbackTime?: string | null
): { date: string; time: string | null } {
  if (!dateStr) return { date: '-', time: null }
  try {
    const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
    if (!isValid(d)) return { date: '-', time: null }

    let time: string | null = null
    if (dateStr.length > 10) {
      time = format(d, 'hh:mm a')
    } else if (fallbackTime) {
      const fallbackDate = new Date(`1970-01-01T${fallbackTime}`)
      if (isValid(fallbackDate)) {
        time = format(fallbackDate, 'hh:mm a')
      }
    }

    return {
      date: format(d, 'MMM d, yyyy'),
      time,
    }
  } catch {
    return { date: '-', time: null }
  }
}

/**
 * Single-line format: "May 20, 2026 · 02:30 PM" or "May 20, 2026" if no time
 */
export function formatFollowupDateTime(
  dateStr: string | null | undefined,
  fallbackTime?: string | null
): string {
  const { date, time } = parseFollowupParts(dateStr, fallbackTime)
  if (date === '-') return '-'
  return time ? `${date} | ${time}` : date
}

/**
 * Formats a created_at ISO timestamp as "May 20, 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (!isValid(d)) return '-'
    return format(d, 'MMM d, yyyy')
  } catch {
    return '-'
  }
}

/**
 * Formats a created_at ISO timestamp as "02:30 PM"
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (!isValid(d)) return '-'
    return format(d, 'hh:mm a')
  } catch {
    return '-'
  }
}
