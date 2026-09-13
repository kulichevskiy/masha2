/**
 * Admin Workshop tab — the Подписчики (announcement-list) section that lands
 * with the closed-sales flow. Subscribers are captured by the public Subscribe
 * band; here the admin sees email + date and can delete a row, mirroring the
 * Заявки (applications) table. An empty state shows when nobody has subscribed.
 *
 * WorkshopTab pulls in the supabase upload hook, which calls createClient() at
 * module load and needs env — so the component is imported dynamically after
 * stubbing env, the same trick gift-tab.test.tsx uses.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { Workshop } from '@/app/workshop/data'
import { updateWorkshop } from '@/app/workshop/actions'

vi.mock('@/app/workshop/actions', () => ({
  updateWorkshop: vi.fn(async () => {}),
  deleteWorkshopApplication: vi.fn(),
  deleteWorkshopSubscriber: vi.fn(),
}))

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WorkshopTab: (props: any) => React.ReactNode

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||= 'test-anon-key'
  ;({ WorkshopTab } = await import('./workshop-tab'))
})

const WORKSHOP: Workshop = {
  id: 'w1',
  banner_visible: true,
  sales_open: false,
  workshop_number: null,
  title: null,
  tagline: null,
  dates: null,
  location: null,
  price: null,
  seats: null,
  hero_photo_path: null,
  intro: null,
  the_idea_heading: null,
  the_idea_quote: null,
  apply_heading: null,
  apply_intro: null,
  closed_heading: "The next workshop isn't open yet",
  closed_intro: '<p>Leave your email.</p>',
  tariffs_intro: null,
  program: [],
  days: [],
  tariffs: [],
  gallery: [],
  faq: [],
}

const COMMON = { workshop: WORKSHOP, applications: [], supabaseUrl: 'http://localhost:54321' }

describe('<WorkshopTab /> subscribers section', () => {
  it('lists each subscriber with email + date', () => {
    const { container } = render(
      <WorkshopTab
        {...COMMON}
        subscribers={[
          { id: 's1', email: 'first@example.com', seasons: ['winter', 'summer'], cities: ['berlin', 'paris'], created_at: '2026-07-01T10:00:00Z' },
          { id: 's2', email: 'second@example.com', seasons: [], cities: [], created_at: '2026-07-02T10:00:00Z' },
        ]}
      />
    )

    const rows = container.querySelectorAll('[data-testid="subscriber-row"]')
    expect(rows).toHaveLength(2)

    const text = container.textContent ?? ''
    expect(text).toContain('first@example.com')
    expect(text).toContain('second@example.com')
    expect(rows[0].textContent).toContain('Зима, Лето')
    expect(rows[0].textContent).toContain('Берлин, Париж')
    expect(rows[1].textContent?.match(/Не указано/g)).toHaveLength(2)

    // No empty state while there are subscribers.
    expect(container.querySelector('[data-testid="subscribers-empty"]')).toBeNull()
  })

  it('shows an empty state when nobody has subscribed', () => {
    const { container } = render(<WorkshopTab {...COMMON} subscribers={[]} />)

    expect(container.querySelector('[data-testid="subscriber-row"]')).toBeNull()
    const empty = container.querySelector('[data-testid="subscribers-empty"]')
    expect(empty).not.toBeNull()
  })

  it('saves banner visibility and sales independently', async () => {
    const view = render(<WorkshopTab {...COMMON} subscribers={[]} />)
    const banner = view.getByRole('switch', { name: 'Баннер виден' })
    const sales = view.getByRole('switch', { name: 'Продажи закрыты' })

    fireEvent.click(banner)
    await waitFor(() => expect(updateWorkshop).toHaveBeenLastCalledWith({ banner_visible: false }))
    await waitFor(() => expect(sales.hasAttribute('disabled')).toBe(false))
    expect(sales.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(sales)
    await waitFor(() => expect(updateWorkshop).toHaveBeenLastCalledWith({ sales_open: true }))
    await waitFor(() => expect(banner.hasAttribute('disabled')).toBe(false))
    expect(banner.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(view.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(updateWorkshop).toHaveBeenLastCalledWith(expect.objectContaining({
      banner_visible: false, sales_open: true,
    })))
  })

  it('restores the previous switch value after a failed save', async () => {
    vi.mocked(updateWorkshop).mockRejectedValueOnce(new Error('Не удалось сохранить'))
    const view = render(<WorkshopTab {...COMMON} subscribers={[]} />)
    const banner = view.getByRole('switch', { name: 'Баннер виден' })
    fireEvent.click(banner)
    await waitFor(() => expect(view.getByText('Не удалось сохранить')).toBeTruthy())
    await waitFor(() => expect(banner.hasAttribute('disabled')).toBe(false))
    expect(banner.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(banner)
    await waitFor(() => expect(banner.hasAttribute('disabled')).toBe(false))
    expect(banner.getAttribute('aria-checked')).toBe('false')
    expect(view.queryByText('Не удалось сохранить')).toBeNull()
  })
})
