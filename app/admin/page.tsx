import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PhotosTable } from './components/photos-table'
import { PhotoUploadDropzone } from './components/photo-upload-dropzone'
import { LogoutButton } from '@/components/logout-button'
import { AdminTabs, type AdminTab } from './components/admin-tabs'
import { TiersTable } from './components/tiers-table'
import { FaqTable } from './components/faq-table'
import { RequestsTable, type BookingRequestRow } from './components/requests-table'
import { SettingsForm } from './components/settings-form'
import { WorkshopTab } from './components/workshop-tab'
import { getAdminWorkshop } from '@/app/workshop/data'
import { GiftTab } from './components/gift-tab'
import { getAdminGiftCertificate } from '@/app/gift/data'

const VALID_TABS: AdminTab[] = ['photos', 'tiers', 'faq', 'workshop', 'gift', 'requests', 'settings']

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function AdminPage({ searchParams }: Props) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Defense-in-depth admin gate. Other tabs are RLS-protected by their
  // user-scoped queries, but the workshop tab reads via the service role to
  // see hidden draft content — so a signed-in non-admin reaching this page
  // would otherwise see admin-only data. Require is_admin() up front and
  // redirect non-admins to the public home.
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    redirect('/')
  }

  const params = await searchParams
  const tab: AdminTab = VALID_TABS.includes(params.tab as AdminTab)
    ? (params.tab as AdminTab)
    : 'photos'

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Личный кабинет фотографа</h1>
          <p className="text-muted-foreground mt-1">
            Управление портфолио и заявками
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
            {data.claims.email}
          </span>
          <LogoutButton />
        </div>
      </div>

      <AdminTabs active={tab} />

      {tab === 'photos' && <PhotosTab />}
      {tab === 'tiers' && <TiersTab />}
      {tab === 'faq' && <FaqTab />}
      {tab === 'workshop' && <WorkshopTabSection />}
      {tab === 'gift' && <GiftTabSection />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

async function PhotosTab() {
  const supabase = await createClient()
  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch photos: ${error.message}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <>
      <PhotoUploadDropzone />
      {photos && photos.length > 0 ? (
        <PhotosTable photos={photos} supabaseUrl={supabaseUrl} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Нет загруженных фотографий</p>
        </div>
      )}
    </>
  )
}

async function TiersTab() {
  const supabase = await createClient()
  const { data: tiers, error } = await supabase
    .from('booking_tiers')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tiers: ${error.message}`)
  }

  return <TiersTable tiers={tiers ?? []} />
}

async function WorkshopTabSection() {
  const supabase = await createClient()
  const workshop = await getAdminWorkshop()
  if (!workshop) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Не найдена запись воркшопа. Примените миграцию `create_workshop`.</p>
      </div>
    )
  }

  const { data: applications, error } = await supabase
    .from('workshop_applications')
    .select('id, name, email, instagram, message, intake, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Failed to fetch workshop applications: ${error.message}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <WorkshopTab
      workshop={workshop}
      applications={applications ?? []}
      supabaseUrl={supabaseUrl}
    />
  )
}

async function GiftTabSection() {
  const supabase = await createClient()
  const giftCertificate = await getAdminGiftCertificate()
  if (!giftCertificate) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Не найдена запись сертификата. Примените миграцию `create_gift_certificate`.</p>
      </div>
    )
  }

  const { data: orders, error } = await supabase
    .from('gift_certificate_requests')
    .select('id, email, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Failed to fetch gift certificate requests: ${error.message}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <GiftTab
      giftCertificate={giftCertificate}
      orders={orders ?? []}
      supabaseUrl={supabaseUrl}
    />
  )
}

async function FaqTab() {
  const supabase = await createClient()
  const { data: entries, error } = await supabase
    .from('booking_faq')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch faq entries: ${error.message}`)
  }

  return <FaqTable entries={entries ?? []} />
}

async function RequestsTab() {
  const supabase = await createClient()
  const { data: requests, error } = await supabase
    .from('booking_requests')
    .select('id, email, message, created_at, booking_tiers(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Failed to fetch booking requests: ${error.message}`)
  }

  // Normalise the embed: supabase-js types the FK join as an array even though
  // booking_requests.tier_id is many-to-one on booking_tiers.
  const rows: BookingRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    message: r.message,
    created_at: r.created_at,
    booking_tiers: Array.isArray(r.booking_tiers)
      ? (r.booking_tiers[0] ?? null)
      : (r.booking_tiers ?? null),
  }))

  return <RequestsTable requests={rows} />
}

async function SettingsTab() {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_recipient_email')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`)
  }

  return <SettingsForm recipientEmail={row?.value ?? ''} />
}
