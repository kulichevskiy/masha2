import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260919074043_add_editorial_page.sql'),
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
        check (pages <@ array['portraits', 'kids', 'video']::text[])
    );
  `)

  return db
}

describe('editorial page migration', () => {
  it('applies to the current schema', async () => {
    const db = await currentSchema()

    await expect(db.exec(migration)).resolves.toBeDefined()
    await db.close()
  }, 15_000)

  it('leaves existing pages untouched — nobody is tagged editorial by default', async () => {
    const db = await currentSchema()
    await db.exec(`
      insert into public.photos (id, kind, pages) values
        (1, 'photo', array['portraits']),
        (2, 'photo', array['portraits', 'kids']),
        (3, 'video', array['video']);
    `)

    await db.exec(migration)

    const result = await db.query<{ id: number; pages: string[] }>(
      'select id, pages from public.photos order by id'
    )
    expect(result.rows).toEqual([
      { id: 1, pages: ['portraits'] },
      { id: 2, pages: ['portraits', 'kids'] },
      { id: 3, pages: ['video'] },
    ])

    await db.close()
  }, 15_000)

  it('accepts editorial as a page and still rejects unknown values', async () => {
    const db = await currentSchema()
    await db.exec(migration)

    await expect(
      db.exec("insert into public.photos (id, kind, pages) values (1, 'photo', array['editorial'])")
    ).resolves.toBeDefined()
    await expect(
      db.exec("insert into public.photos (id, kind, pages) values (2, 'photo', array['portraits', 'editorial'])")
    ).resolves.toBeDefined()
    await expect(
      db.exec("insert into public.photos (id, kind, pages) values (3, 'photo', array['fashion'])")
    ).rejects.toThrow()

    await db.close()
  }, 15_000)
})
