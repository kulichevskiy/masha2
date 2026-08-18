import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260818204256_add_video_page.sql'),
  'utf8'
)

async function currentSchema() {
  const db = new PGlite()

  await db.exec(`
    create table public.photos (
      id integer primary key,
      kind text not null check (kind in ('photo', 'video')),
      pages text[] not null default '{}',
      constraint photos_pages_valid
        check (pages <@ array['portraits', 'kids']::text[])
    );
  `)

  return db
}

describe('video page migration', () => {
  it('applies to an empty current schema', async () => {
    const db = await currentSchema()

    await expect(db.exec(migration)).resolves.toBeDefined()
    await db.close()
  }, 15_000)

  it('backfills every video without losing existing pages', async () => {
    const db = await currentSchema()
    await db.exec(`
      insert into public.photos (id, kind, pages) values
        (1, 'video', '{}'),
        (2, 'video', array['portraits', 'kids']),
        (3, 'photo', array['kids']);
    `)

    await db.exec(migration)

    const result = await db.query<{ id: number; pages: string[] }>(
      'select id, pages from public.photos order by id'
    )
    expect(result.rows).toEqual([
      { id: 1, pages: ['video'] },
      { id: 2, pages: ['portraits', 'kids', 'video'] },
      { id: 3, pages: ['kids'] },
    ])

    await db.close()
  }, 15_000)

  it('accepts video as a page and rejects unknown page values', async () => {
    const db = await currentSchema()
    await db.exec(migration)

    await expect(
      db.exec("insert into public.photos (id, kind, pages) values (1, 'photo', array['video'])")
    ).resolves.toBeDefined()
    await expect(
      db.exec("insert into public.photos (id, kind, pages) values (2, 'photo', array['unknown'])")
    ).rejects.toThrow(/photos_pages_valid/)

    await db.close()
  }, 15_000)

  it('documents video as an allowed public section', () => {
    expect(migration).toMatch(
      /comment on column public\.photos\.pages is '[^']*\{portraits, kids, video\}[^']*'/i
    )
  })
})
