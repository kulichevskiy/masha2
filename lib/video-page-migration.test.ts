import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260818204256_add_video_page.sql'),
  'utf8'
)

describe('video page migration', () => {
  it('replaces the pages constraint with all three allowed sections', () => {
    expect(migration).toMatch(/drop constraint photos_pages_valid/i)
    expect(migration).toContain("array['portraits', 'kids', 'video']::text[]")
  })

  it('adds video to every video row without removing existing sections or duplicating it', () => {
    expect(migration).toMatch(/update public\.photos[\s\S]*pages\s*=\s*array_append\(pages,\s*'video'\)/i)
    expect(migration).toMatch(/where kind\s*=\s*'video'/i)
    expect(migration).toMatch(/not\s*\(\s*'video'\s*=\s*any\s*\(pages\)\s*\)/i)
  })

  it('documents video as an allowed public section', () => {
    expect(migration).toMatch(
      /comment on column public\.photos\.pages is '[^']*\{portraits, kids, video\}[^']*'/i
    )
  })
})
