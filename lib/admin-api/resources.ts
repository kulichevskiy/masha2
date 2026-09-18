import type { Database } from '@/lib/supabase/database.types'

type Table = keyof Database['public']['Tables']
export type Resource = { table: Table; columns: string; singleton?: boolean; create?: boolean; update?: boolean; delete?: boolean; reorder?: boolean; ordered?: boolean }
export const resources: Record<string, Resource> = {
  media: { table: 'photos', columns: '*', update: true, delete: true, reorder: true, ordered: true },
  tiers: { table: 'booking_tiers', columns: '*', create: true, update: true, delete: true, reorder: true, ordered: true },
  faq: { table: 'booking_faq', columns: '*', create: true, update: true, delete: true, reorder: true, ordered: true },
  workshop: { table: 'workshop', columns: '*', singleton: true, update: true },
  'gift-certificate': { table: 'gift_certificate', columns: '*', singleton: true, update: true },
  settings: { table: 'app_settings', columns: '*', singleton: true, update: true },
  'booking-requests': { table: 'booking_requests', columns: 'id,email,message,tier_id,created_at,version', delete: true },
  'workshop-applications': { table: 'workshop_applications', columns: 'id,name,email,instagram,message,intake,created_at,version', delete: true },
  'workshop-subscribers': { table: 'workshop_subscribers', columns: 'id,email,seasons,cities,created_at,version', delete: true },
  'gift-orders': { table: 'gift_certificate_requests', columns: 'id,email,amount,created_at,version', delete: true },
  'audit-log': { table: 'api_audit_log', columns: 'id,token_id,token_name,operation,resource,resource_id,status,error_code,created_at,completed_at' },
}
