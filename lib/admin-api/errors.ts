export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export function databaseError(error: { message?: string; code?: string } | null): void {
  if (!error) return
  const known: Record<string, [number, string]> = {
    not_found: [404, 'Resource not found'], conflict: [409, 'Resource changed; read it again before retrying'],
    unauthorized: [401, 'Invalid or revoked token'], invalid_request: [400, 'Invalid request'],
  }
  const match = known[error.message ?? '']
  if (match) throw new ApiError(match[0], error.message!, match[1])
  throw new ApiError(500, 'internal_error', 'The operation could not be completed')
}
