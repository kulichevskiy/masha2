import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PhotosTable } from './components/photos-table'
import { LogoutButton } from '@/components/logout-button'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  // Fetch all photos ordered by position
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .order('position', { ascending: true })

  if (photosError) {
    throw new Error(`Failed to fetch photos: ${photosError.message}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Личный кабинет фотографа</h1>
          <p className="text-muted-foreground mt-1">
            Управление фотографиями портфолио
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{data.claims.email}</span>
          <LogoutButton />
        </div>
      </div>

      {photos && photos.length > 0 ? (
        <PhotosTable photos={photos} supabaseUrl={supabaseUrl} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Нет загруженных фотографий</p>
        </div>
      )}
    </div>
  )
}
