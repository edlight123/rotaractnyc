export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWLIST || ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string | null | undefined) {
  if (!email) return false
  const allowlist = getAdminAllowlist()
  if (allowlist.length === 0) return false
  return allowlist.includes(email.toLowerCase())
}
