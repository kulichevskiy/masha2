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

const NO_PREVIEWS = {
  hero: [null],
  people: [null, null, null],
  session: [null],
  work: [],
  video: [],
  behind: ['/photos/maria.jpg'],
  workshops: [null],
  invitation: [null],
}

function renderTab() {
  return render(
    <HomeTab
      content={structuredClone(DEFAULT_CONTENT)}
      previews={NO_PREVIEWS}
      supabaseUrl="http://localhost:54321"
    />
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

  it('gives every photo slot two sliders for the point the crop keeps', () => {
    const { container } = renderTab()
    // hero 1 + people 3 + session 1 + behind 1 + workshops 1 + invitation 1 = 8 slots
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(16)
    const heroX = container.querySelector<HTMLInputElement>('#hero-0-x')!
    expect(Number(heroX.value)).toBe(DEFAULT_CONTENT.hero.photos[0].focus.x)
  })

  it('redraws the preview as the focus moves and saves the new point', async () => {
    const { container, getAllByText } = renderTab()
    const preview = container.querySelector<HTMLImageElement>('img[src="/photos/maria.jpg"]')!
    expect(preview.style.objectPosition).toBe('50% 20%')

    fireEvent.change(container.querySelector('#behind-0-x')!, { target: { value: '70' } })
    expect(preview.style.objectPosition).toBe('70% 20%')

    fireEvent.click(getAllByText('Сохранить')[0])
    await waitFor(() => expect(updateHomeStory).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(updateHomeStory).mock.calls[0][0]
    expect(sent.behind.photos[0].focus).toEqual({ x: 70, y: 20 })
    // Other slots keep the crop they shipped with.
    expect(sent.hero.photos[0].focus).toEqual(DEFAULT_CONTENT.hero.photos[0].focus)
  })

  it('sends a pinned frame for the slot it was set on', async () => {
    const { container, getAllByText } = renderTab()
    // The last text input on the page is the invitation frame's alt.
    const alt = [...container.querySelectorAll('input:not([type="range"])')].at(-1)!
    fireEvent.change(alt, { target: { value: 'A pinned frame' } })
    fireEvent.click(getAllByText('Сохранить')[0])

    await waitFor(() => expect(updateHomeStory).toHaveBeenCalledTimes(1))
    const sent = vi.mocked(updateHomeStory).mock.calls[0][0]
    expect(sent.invitation.photos[0].alt).toBe('A pinned frame')
  })
})
