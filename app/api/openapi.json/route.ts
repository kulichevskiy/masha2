import { makeOpenApi } from '@/lib/admin-api/openapi'

export function GET() {
  return Response.json(makeOpenApi(), { headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } })
}
