'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function reorderPhotos(orderedIds: string[]) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

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
    is_visible?: boolean
  }
) {
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

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

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

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

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

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
    is_visible: false, // New photos are hidden by default
  }))

  const { error } = await supabase.from('photos').insert(photosToInsert)

  if (error) {
    throw new Error(`Failed to create photo records: ${error.message}`)
  }

  revalidatePath('/admin')
}
