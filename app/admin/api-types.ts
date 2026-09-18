export type ApiToken = {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export type ApiAuditEntry = {
  id: string
  token_name: string
  operation: string
  resource: string
  resource_id: string | null
  status: 'started' | 'succeeded' | 'failed'
  error_code: string | null
  created_at: string
}

export type ApiAdminData = {
  tokens: ApiToken[]
  entries: ApiAuditEntry[]
  offset: number
  hasNext: boolean
}

export type ApiActionResult<T> = { data: T; error?: never } | { error: string; data?: never }
