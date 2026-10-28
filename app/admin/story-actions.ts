'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, type ServerSupabase } from './require-admin'
import { CREDIT_ROLE_ERROR, SLUG_ERROR, SLUG_TAKEN_ERROR, TITLE_ERROR, type ActionResult } from './story-messages'
import { reassignSlots } from '@/lib/photo-filter'
import {
  DEFAULT_CREDITS,
  isValidSlug,
  slugify,
  uniqueSlug,
  type StoryCredit,
} from '@/lib/editorial-stories'

// Server actions behind the admin «Истории» tab. Each one gates on the admin
// whitelist, validates, writes, and revalidates the public pages the change
// can appear on. Failures come back as `{ error }` in Russian so the editor
// can show them inline; thrown errors are reserved for the admin gate.


export async function createStory(input: { title: string }): Promise<ActionResult & { id?: string; slug?: string }> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const title = input.title.trim()
  if (!title) return { error: TITLE_ERROR }

  const { data: existing, error: slugError } = await supabase.from('editorial_stories').select('slug, position')
  if (slugError) return { error: `Не удалось прочитать истории: ${slugError.message}` }
  const slug = uniqueSlug(slugify(title), (existing ?? []).map((row) => row.slug))
  const position = Math.min(0, ...(existing ?? []).map((row) => row.position)) - 1

  const { data, error } = await supabase
    .from('editorial_stories')
    .insert({ title, slug, position, credits: DEFAULT_CREDITS })
    .select('id, slug')
    .single()
  if (error) return { error: `Не удалось создать историю: ${error.message}` }

  revalidateStory()
  return { id: data.id, slug: data.slug }
}

export async function updateStory(input: {
  id: string
  title: string
  slug: string
  subtitle: string
  credits: StoryCredit[]
}): Promise<ActionResult & { slug?: string }> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const title = input.title.trim()
  const slug = input.slug.trim()
  if (!title) return { error: TITLE_ERROR }
  if (!isValidSlug(slug)) return { error: SLUG_ERROR }
  const credits = input.credits.map((credit) => ({ role: credit.role.trim(), name: credit.name.trim() }))
  if (credits.some((credit) => !credit.role)) return { error: CREDIT_ROLE_ERROR }

  const { data: current, error: readError } = await supabase
    .from('editorial_stories')
    .select('slug')
    .eq('id', input.id)
    .single()
  if (readError) return { error: `История не найдена: ${readError.message}` }

  if (slug !== current.slug) {
    const { data: clash } = await supabase.from('editorial_stories').select('id').eq('slug', slug).maybeSingle()
    if (clash) return { error: SLUG_TAKEN_ERROR }
  }

  const { error } = await supabase
    .from('editorial_stories')
    .update({ title, slug, subtitle: input.subtitle.trim(), credits: credits.filter((credit) => credit.name) })
    .eq('id', input.id)
  if (error) return { error: `Не удалось сохранить: ${error.message}` }

  revalidateStory(current.slug, slug)
  return { slug }
}

export async function setStoryVisible(input: { id: string; visible: boolean }): Promise<ActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { data, error } = await supabase
    .from('editorial_stories')
    .update({ visible: input.visible })
    .eq('id', input.id)
    .select('slug')
    .single()
  if (error) return { error: `Не удалось изменить видимость: ${error.message}` }

  revalidateStory(data.slug)
  return {}
}

export async function deleteStory(input: { id: string }): Promise<ActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { data, error } = await supabase
    .from('editorial_stories')
    .delete()
    .eq('id', input.id)
    .select('slug')
    .single()
  if (error) return { error: `Не удалось удалить: ${error.message}` }

  revalidateStory(data.slug)
  return {}
}

// New visual order of all stories; existing position slots are reused the
// way the photos table does it, so the stored numbers stay compact.
export async function reorderStories(orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { data: rows, error: readError } = await supabase.from('editorial_stories').select('id, position').in('id', orderedIds)
  if (readError) return { error: `Не удалось прочитать порядок: ${readError.message}` }

  const current = new Map((rows ?? []).map((row) => [row.id, row.position]))
  for (const update of reassignSlots(orderedIds, current)) {
    const { error } = await supabase.from('editorial_stories').update({ position: update.position }).eq('id', update.id)
    if (error) return { error: `Не удалось сохранить порядок: ${error.message}` }
  }

  revalidateStory()
  return {}
}

// Replace the story's photo sequence and cover. New rows are upserted first
// and only then are the rows missing from the new list removed, so a failure
// midway leaves the story with its photos rather than empty; the cover is
// kept only when it is part of the new sequence.
export async function setStoryPhotos(input: {
  storyId: string
  photoIds: string[]
  coverPhotoId: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const photoIds = [...new Set(input.photoIds)]
  const cover = input.coverPhotoId && photoIds.includes(input.coverPhotoId) ? input.coverPhotoId : null

  const error = await replaceStoryPhotos(supabase, input.storyId, photoIds, cover)
  if (error) return { error }

  const { data } = await supabase.from('editorial_stories').select('slug').eq('id', input.storyId).single()
  revalidateStory(data?.slug)
  return {}
}

async function replaceStoryPhotos(
  supabase: ServerSupabase,
  storyId: string,
  photoIds: string[],
  cover: string | null
): Promise<string | null> {
  if (photoIds.length > 0) {
    const rows = photoIds.map((photo_id, position) => ({ story_id: storyId, photo_id, position }))
    const upserted = await supabase.from('editorial_story_photos').upsert(rows, { onConflict: 'story_id,photo_id' })
    if (upserted.error) return `Не удалось обновить фотографии: ${upserted.error.message}`
  }

  let removal = supabase.from('editorial_story_photos').delete().eq('story_id', storyId)
  if (photoIds.length > 0) removal = removal.not('photo_id', 'in', `(${photoIds.join(',')})`)
  const removed = await removal
  if (removed.error) return `Не удалось обновить фотографии: ${removed.error.message}`

  const covered = await supabase.from('editorial_stories').update({ cover_photo_id: cover }).eq('id', storyId)
  if (covered.error) return `Не удалось сохранить обложку: ${covered.error.message}`
  return null
}

function revalidateStory(...slugs: (string | null | undefined)[]) {
  revalidatePath('/admin')
  revalidatePath('/editorial')
  for (const slug of new Set(slugs.filter((slug): slug is string => Boolean(slug)))) {
    revalidatePath(`/editorial/${slug}`)
  }
}
