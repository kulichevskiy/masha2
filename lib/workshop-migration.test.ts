// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(),
  'supabase/migrations/20260913165114_workshop_banner_and_waitlist_preferences.sql'), 'utf8')

describe('workshop banner and waitlist migration', () => {
  it('cleans original seeded copy on a rebuilt database without changing assets or history', async () => {
    const db = new PGlite()
    const readMigration = (name: string) => readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8')
    try {
      const original = readMigration('20260525172429_create_workshop.sql')
      await db.exec(original.match(/create table public\.workshop \([\s\S]*?\n\);/)![0])
      await db.exec(original.slice(original.indexOf('insert into public.workshop (')))
      for (const name of ['20260607120000_workshop_tariffs.sql', '20260609120000_workshop_days.sql', '20260609130000_workshop_tariffs_intro.sql']) {
        await db.exec(readMigration(name))
      }
      await db.exec(`
        alter table public.workshop add column closed_heading text, add column closed_intro text;
        update public.workshop set closed_intro = '<p>News &mdash; soon &#8212; spring &#x2014; summer.</p>',
          hero_photo_path = 'workshop/hero—photo.jpg',
          program = jsonb_set(program, '{0,photo_path}', '"workshop/program—photo.jpg"');
        create table public.workshop_applications (intake_label text);
        insert into public.workshop_applications values ('Full intake — 600 €');
      `)
      const cleanup = readMigration('20260913173725_workshop_copy_punctuation.sql')
      await db.exec(cleanup)
      const rows = (await db.query('select * from public.workshop')).rows
      const row = rows[0] as Record<string, unknown>
      expect(row.dates).toBe('21 - 23 March 2026')
      expect(row.closed_intro).toBe('<p>News, soon, spring, summer.</p>')
      expect(row.hero_photo_path).toBe('workshop/hero—photo.jpg')
      const program = row.program as Array<Record<string, unknown>>
      expect(program[0].photo_path).toBe('workshop/program—photo.jpg')
      const copy = { ...row, hero_photo_path: null, program: program.map(item => ({ ...item, photo_path: null })) }
      expect(JSON.stringify(copy)).not.toMatch(/—|&mdash;|&#8212;|&#x2014;/i)
      expect((await db.query('select * from public.workshop_applications')).rows)
        .toEqual([{ intake_label: 'Full intake — 600 €' }])
      await db.exec(cleanup)
      expect((await db.query('select * from public.workshop')).rows).toEqual(rows)
    } finally {
      await db.close()
    }
  }, 15_000)

  it('preserves current visibility and legacy subscriptions while allowing independent switches', async () => {
    const db = new PGlite()
    try {
      await db.exec(`
        create table public.workshop (id integer primary key, sales_open boolean not null default false, closed_intro text);
        create table public.workshop_subscribers (email text not null);
        insert into public.workshop values
          (1, true, '<p>Applications for the next intake aren''t open right now. Leave your email and you''ll be the first to hear when the next workshop is announced — no list, no spam, just one note when a seat opens.</p>'),
          (2, false, '<p>Custom intro.</p>');
        insert into public.workshop_subscribers values ('legacy@example.com');
      `)
      await db.exec(migration)
      expect((await db.query('select * from public.workshop order by id')).rows).toEqual([
        { id: 1, sales_open: true, banner_visible: true, closed_intro: null },
        { id: 2, sales_open: false, banner_visible: false, closed_intro: '<p>Custom intro.</p>' },
      ])
      expect((await db.query('select * from public.workshop_subscribers')).rows).toEqual([
        { email: 'legacy@example.com', seasons: [], cities: [] },
      ])

      await db.exec('update public.workshop set banner_visible = not banner_visible')
      expect((await db.query('select * from public.workshop order by id')).rows).toEqual([
        { id: 1, sales_open: true, banner_visible: false, closed_intro: null },
        { id: 2, sales_open: false, banner_visible: true, closed_intro: '<p>Custom intro.</p>' },
      ])
      await db.exec(`insert into public.workshop_subscribers (email, seasons, cities)
        values ('new@example.com', array['winter', 'summer'], array['berlin', 'hamburg', 'paris'])`)
      expect((await db.query("select seasons, cities from public.workshop_subscribers where email = 'new@example.com'")).rows).toEqual([
        { seasons: ['winter', 'summer'], cities: ['berlin', 'hamburg', 'paris'] },
      ])
      await expect(db.exec("update public.workshop_subscribers set seasons = array['spring']"))
        .rejects.toThrow(/workshop_subscribers_seasons_valid/)
      await expect(db.exec("update public.workshop_subscribers set cities = array['london']"))
        .rejects.toThrow(/workshop_subscribers_cities_valid/)

      await db.exec(readFileSync(join(process.cwd(),
        'supabase/migrations/20260913171825_workshop_spring_waitlist.sql'), 'utf8'))
      await db.exec(`insert into public.workshop_subscribers (email, seasons, cities)
        values ('spring@example.com', array['spring', 'summer'], array['paris'])`)
      expect((await db.query("select seasons from public.workshop_subscribers where email = 'spring@example.com'")).rows)
        .toEqual([{ seasons: ['spring', 'summer'] }])
      expect((await db.query("select seasons from public.workshop_subscribers where email = 'new@example.com'")).rows)
        .toEqual([{ seasons: ['winter', 'summer'] }])
      await expect(db.exec("update public.workshop_subscribers set seasons = array['autumn']"))
        .rejects.toThrow(/workshop_subscribers_seasons_valid/)
    } finally {
      await db.close()
    }
  }, 15_000)
})
