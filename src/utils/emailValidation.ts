/**
 * Allowed company email domain prefixes.
 * Emails must be @beyondsure.* or @insurance4life.* (any TLD like .com, .in, etc.)
 */
const ALLOWED_DOMAIN_PREFIXES = ['beyondsure', 'insurance4life']

/**
 * Check if an email address belongs to an allowed company domain.
 *
 * Valid examples:  john@beyondsure.com, jane@insurance4life.in
 * Invalid examples: user@gmail.com, test@random.org
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return ALLOWED_DOMAIN_PREFIXES.some((prefix) => domain.startsWith(prefix + '.'))
}

/**
 * Human-readable string of allowed domains for error messages.
 */
export const ALLOWED_DOMAINS_DISPLAY = ALLOWED_DOMAIN_PREFIXES.map((d) => `@${d}.*`).join(' or ')
