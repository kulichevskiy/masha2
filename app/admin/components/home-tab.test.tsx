/**
 * Admin «Главная» tab — the editor behind the home story page. It renders one
 * card per section with only the fields that section actually shows, and Save
 * hands the whole shape to updateHomeStory; a cleared field travels as an empty
 * string and the page turns it back into the shipped copy when it reads it.
 *
 * HomeTab pulls in the supabase upload hook, which calls createClient() at
 * module load and needs env — so the component is imported dynamically after
 * stubbing env, the same trick workshop-tab.test.tsx uses.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { DEFAULT_CONTENT } from '@/lib/home-story-content'
import { updateHomeStory } from '../actions'

vi.mock('../actions', () => ({
  updateHomeStory: vi.fn(async () => {}),
}))

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HomeTab: (props: any) => React.ReactNode

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||= 'test-anon-key'
  ;({ HomeTab } = await import('./home-tab'))
})

function renderTab() {
  return render(
    <HomeTab content={structuredClone(DEFAULT_CONTENT)} supabaseUrl="http://localhost:54321" />
  )
}

describe('HomeTab', () => {
  it('shows every section of the page', () => {
    const { getByText } = renderTab()
    for (const title of [
      '1 · Первый экран',
      '2 · Люди',
      '3 · Съёмка',
      '4 · Работы',
      '5 · Видео',
      '6 · За камерой',
      '7 · Воркшопы',
      '8 · Приглашение',
    ]) {
      expect(getByText(title)).toBeTruthy()
    }
  })

  it('loads the current copy into the fields', () => {
    const { container } = renderTab()
    const values = [...container.querySelectorAll('textarea')].map((t) => t.value)
    expect(values).toContain(DEFAULT_CONTENT.hero.heading)
    expect(values).toContain(DEFAULT_CONTENT.session.body)
  })

  it('offers one photo slot per frame the layout holds', () => {
    const { getAllByText, queryByText } = renderTab()
    // The people triptych has three slots; the two bleed frames have one each.
    expect(getAllByText('Левый кадр')).toHaveLength(1)
    expect(getAllByText('Средний кадр')).toHaveLength(1)
    expect(getAllByText('Правый кадр')).toHaveLength(1)
    expect(getAllByText('Кадр на весь экран')).toHaveLength(2)
    // The work rows and the video frame come from the feeds, so the sections
    // that own them say so instead of offering an upload.
    expect(queryByText(/берутся из начала лент «Портреты»/)).toBeTruthy()
    expect(queryByText(/из первого ролика/)).toBeTruthy()
  })

  it('saves an edited heading', async () => {
    const { container, getAllByText } = renderTab()
    const heading = [...container.querySelectorAll('textarea')].find(
      (t) => t.value === DEFAULT_CONTENT.hero.heading
    )!
    fireEvent.change(heading, { target: { value: 'new\nheading' } })
    fireEvent.click(getAllByText('Сохранить')[0])

    await waitFor(() => expect(updateHomeStory).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(updateHomeStory).mock.calls[0][0]
    expect(sent.hero.heading).toBe('new\nheading')
    // Untouched sections travel unchanged.
    expect(sent.people.body).toBe(DEFAULT_CONTENT.people.body)
  })

  it('sends a pinned frame for the slot it was set on', async () => {
    const { container, getAllByText } = renderTab()
    const alt = [...container.querySelectorAll('input')].at(-1)!
    fireEvent.change(alt, { target: { value: 'A pinned frame' } })
    fireEvent.click(getAllByText('Сохранить')[0])

    await waitFor(() => expect(updateHomeStory).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(updateHomeStory).mock.calls[0][0]
    expect(sent.invitation.photos[0].alt).toBe('A pinned frame')
  })
})
