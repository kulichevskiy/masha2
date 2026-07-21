/*
 * One-off backfill: populate photos.width / photos.height for rows uploaded
 * before dimension capture existed. Downloads each un-measured photo from the
 * public storage bucket, reads its intrinsic size from the file header, and
 * writes it back with the service-role client (bypasses RLS).
 *
 * Idempotent: only touches rows where width or height is null, so it is safe to
 * re-run (e.g. after fixing a file the first pass could not decode).
 *
 * Run once:  pnpm backfill-photo-dimensions
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from
 * .env.local below).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { imageSize } from 'image-size'
import type { Database } from '../lib/supabase/database.types'

// Minimal .env.local loader so the standalone script sees the same env as the
// Next.js app without pulling in a dotenv dependency. Existing process.env wins.
function loadEnvLocal() {
  let contents: string
  try {
    contents = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  } catch {
    return // no .env.local — rely on the ambient environment
  }
  for (const line of contents.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    // Strip a single layer of surrounding quotes if present.
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2')
  }
}

// EXIF orientations 5–8 rotate the image 90°, so its displayed width/height are
// the header's swapped. Match what the browser (and next/image) actually render.
function displayDimensions(width: number, height: number, orientation?: number) {
  if (orientation && orientation >= 5 && orientation <= 8) {
    return { width: height, height: width }
  }
  return { width, height }
}

async function main() {
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in .env.local)'
    )
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_path, width, height')
    .or('width.is.null,height.is.null')

  if (error) throw new Error(`Failed to fetch photos: ${error.message}`)

  if (!photos || photos.length === 0) {
    console.log('Nothing to backfill — every photo already has dimensions.')
    return
  }

  console.log(`Backfilling dimensions for ${photos.length} photo(s)…`)

  let updated = 0
  const failures: string[] = []

  for (const photo of photos) {
    try {
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(photo.storage_path)

      const res = await fetch(urlData.publicUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${photo.storage_path}`)

      const bytes = new Uint8Array(await res.arrayBuffer())
      const size = imageSize(bytes)
      if (!size.width || !size.height) {
        throw new Error(`Could not read dimensions for ${photo.storage_path}`)
      }

      const { width, height } = displayDimensions(size.width, size.height, size.orientation)

      const { error: updateError } = await supabase
        .from('photos')
        .update({ width, height })
        .eq('id', photo.id)

      if (updateError) throw new Error(updateError.message)

      updated += 1
      console.log(`  ✓ ${photo.storage_path} → ${width}×${height}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`${photo.storage_path}: ${message}`)
      console.error(`  ✗ ${photo.storage_path}: ${message}`)
    }
  }

  console.log(`\nDone. Updated ${updated}/${photos.length}.`)
  if (failures.length > 0) {
    console.log(`${failures.length} failed (still null, re-run after fixing):`)
    failures.forEach((f) => console.log(`  - ${f}`))
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
