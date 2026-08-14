import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260814145218_add_video_media.sql'),
  'utf8'
)

describe('video media migration', () => {
  it('adds constrained video metadata columns while defaulting existing rows to photos', () => {
    expect(migration).toMatch(/add column kind text not null default 'photo'/i)
    expect(migration).toMatch(/check \(kind in \('photo', 'video'\)\)/i)
    expect(migration).toMatch(/add column poster_path text/i)
    expect(migration).toMatch(/add column duration_seconds/i)
  })

  it('creates a public 25 MB videos bucket for mp4 and jpg objects', () => {
    expect(migration).toMatch(/values\s*\(\s*'videos',\s*'videos',\s*true,\s*26214400/i)
    expect(migration).toContain("array['video/mp4', 'image/jpeg']")
  })

  it('allows public reads and gates every videos write policy on is_admin()', () => {
    expect(migration).toMatch(/for select[\s\S]*bucket_id = 'videos'/i)
    expect(migration.match(/public\.is_admin\(\)/g)).toHaveLength(4)
  })
})
