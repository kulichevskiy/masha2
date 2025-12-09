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
