export const formatAppError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    const message = typeof candidate.message === 'string' ? candidate.message : ''
    const details = typeof candidate.details === 'string' ? candidate.details : ''
    const hint = typeof candidate.hint === 'string' ? candidate.hint : ''
    const code = typeof candidate.code === 'string' ? candidate.code : ''
    const parts = [message, details, hint, code].filter(Boolean)

    if (parts.length > 0) return parts.join(' | ')
  }

  if (typeof error === 'string' && error.trim()) return error

  return fallback
}
