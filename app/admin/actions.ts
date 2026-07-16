'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PhotoPage } from '@/lib/photo-pages'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

async function requireAdmin(supabase: ServerSupabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) throw new Error('Forbidden')
}

export async function reorderPhotos(orderedIds: string[]) {
  const supabase = await createClient()

  await requireAdmin(supabase)

  // Update positions based on the new order
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index + 1,
  }))

  // Batch update positions
  for (const update of updates) {
    const { error } = await supabase
      .from('photos')
      .update({ position: update.position })
      .eq('id', update.id)

    if (error) {
      throw new Error(`Failed to update position: ${error.message}`)
    }
  }

  revalidatePath('/admin')
}

export async function updatePhoto(
  id: string,
  data: {
    title?: string | null
    description?: string | null
    alt_text?: string | null
    pages?: PhotoPage[]
  }
) {
  const supabase = await createClient()

  await requireAdmin(supabase)

  const { error } = await supabase
    .from('photos')
    .update(data)
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to update photo: ${error.message}`)
  }

  revalidatePath('/admin')
}

export async function deletePhoto(id: string) {
  const supabase = await createClient()

  await requireAdmin(supabase)

  // Get photo to find storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !photo) {
    throw new Error(`Failed to fetch photo: ${fetchError?.message}`)
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('photos')
    .remove([photo.storage_path])

  if (storageError) {
    // Log but don't fail - the file might already be deleted
    console.error('Storage deletion error:', storageError)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)

  if (dbError) {
    throw new Error(`Failed to delete photo: ${dbError.message}`)
  }

  revalidatePath('/admin')
}

export async function createPhotosFromUploads(storagePaths: string[]) {
  const supabase = await createClient()

  await requireAdmin(supabase)

  // Get the minimum position to place new photos at the top
  const { data: minPositionData, error: minPositionError } = await supabase
    .from('photos')
    .select('position')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Start from position 0 if no photos exist, otherwise use minPosition - 1
  const startPosition =
    minPositionData?.position !== undefined && minPositionData.position !== null
      ? minPositionData.position - 1
      : 0

  // Create photo records for each uploaded file
  const photosToInsert = storagePaths.map((storagePath, index) => ({
    storage_path: storagePath,
    title: null,
    description: null,
    alt_text: storagePath.replace(/\.[^/.]+$/, ''), // Use filename without extension as default alt_text
    position: startPosition - index, // Decrement to keep order (newest first)
    pages: [] as string[], // New photos are hidden until assigned to a section
  }))

  const { error } = await supabase.from('photos').insert(photosToInsert)

  if (error) {
    throw new Error(`Failed to create photo records: ${error.message}`)
  }

  revalidatePath('/admin')
}

// --- booking tiers ---------------------------------------------------------

export async function createTier() {
  const supabase = await createClient()
  await requireAdmin(supabase)

  // Place new tier above existing ones, mirroring createPhotosFromUploads:
  // newest at the top until admin reorders.
  const { data: minRow } = await supabase
    .from('booking_tiers')
    .select('position')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  const startPosition = minRow?.position != null ? minRow.position - 1 : 0

  const { error } = await supabase.from('booking_tiers').insert({
    name: 'New tier',
    description: null,
    price_text: 'upon request',
    position: startPosition,
    is_active: false,
  })

  if (error) {
    throw new Error(`Failed to create tier: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function updateTier(
  id: string,
  data: {
    name?: string
    subtitle?: string | null
    description?: string | null
    price_text?: string
    is_active?: boolean
    is_accent?: boolean
  }
) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.from('booking_tiers').update(data).eq('id', id)

  if (error) {
    throw new Error(`Failed to update tier: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function deleteTier(id: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.from('booking_tiers').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete tier: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function reorderTiers(orderedIds: string[]) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from('booking_tiers')
      .update({ position: index + 1 })
      .eq('id', id)
    if (error) {
      throw new Error(`Failed to update tier position: ${error.message}`)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

// --- booking faq -----------------------------------------------------------

export async function createFaq() {
  const supabase = await createClient()
  await requireAdmin(supabase)

  // Place new entry above existing ones so it's easy to find right after creation.
  const { data: minRow } = await supabase
    .from('booking_faq')
    .select('position')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  const startPosition = minRow?.position != null ? minRow.position - 1 : 0

  const { error } = await supabase.from('booking_faq').insert({
    question: 'New question',
    answer: '',
    position: startPosition,
    is_visible: false,
  })

  if (error) {
    throw new Error(`Failed to create faq entry: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function updateFaq(
  id: string,
  data: {
    question?: string
    answer?: string
    is_visible?: boolean
  }
) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.from('booking_faq').update(data).eq('id', id)

  if (error) {
    throw new Error(`Failed to update faq entry: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function deleteFaq(id: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.from('booking_faq').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete faq entry: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

export async function reorderFaq(orderedIds: string[]) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from('booking_faq')
      .update({ position: index + 1 })
      .eq('id', id)
    if (error) {
      throw new Error(`Failed to update faq position: ${error.message}`)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/book')
}

// --- booking requests ------------------------------------------------------

export async function deleteBookingRequest(id: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase.from('booking_requests').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete booking request: ${error.message}`)
  }

  revalidatePath('/admin')
}

// --- app settings ----------------------------------------------------------

export async function updateSetting(key: string, value: string) {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) {
    throw new Error(`Failed to update setting: ${error.message}`)
  }

  revalidatePath('/admin')
}
