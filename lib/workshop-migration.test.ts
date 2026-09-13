// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(),
  'supabase/migrations/20260913165114_workshop_banner_and_waitlist_preferences.sql'), 'utf8')

describe('workshop banner and waitlist migration', () => {
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
