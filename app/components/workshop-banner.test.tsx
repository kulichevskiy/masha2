import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { WorkshopBanner } from './workshop-banner'

const { readWorkshop } = vi.hoisted(() => ({ readWorkshop: vi.fn() }))
vi.mock('../workshop/data', () => ({
  getPublicWorkshop: readWorkshop,
  workshopPhotoUrl: () => null,
}))

afterEach(cleanup)

describe('workshop banner', () => {
  it.each([true, false])('stays hidden with sales_open=%s when visibility is off', async (salesOpen) => {
    readWorkshop.mockResolvedValue({ title: 'Portrait Workshop', sales_open: salesOpen, banner_visible: false })
    expect(await WorkshopBanner()).toBeNull()
  })

  it.each([true, false])('shows the correct CTA and dates with sales_open=%s when visible', async (salesOpen) => {
    readWorkshop.mockResolvedValue({
      title: 'Portrait Workshop', sales_open: salesOpen, banner_visible: true,
      dates: '21 — 23 March 2026', seats: '6 seats',
    })
    const view = render(await WorkshopBanner())
    const link = view.getByRole('link')
    expect(link.getAttribute('href')).toBe(salesOpen ? '/workshop' : '/workshop#subscribe')
    expect(link.textContent).toContain(salesOpen ? 'Apply →' : 'Join the waitlist →')
    expect(link.textContent?.includes('21 — 23 March 2026')).toBe(salesOpen)
  })
})
