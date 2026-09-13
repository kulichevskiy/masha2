import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { SubscribeBand } from './subscribe-band'
import { submitWorkshopSubscription } from '../actions'

vi.mock('../actions', () => ({
  submitWorkshopSubscription: vi.fn(async () => ({ ok: true })),
}))
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }))

afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

function renderForm() {
  const view = render(<SubscribeBand n={6} workshop={{ closed_heading: 'Join the waitlist', closed_intro: null }} />)
  fireEvent.change(view.getByLabelText('Email'), { target: { value: 'fan@example.com' } })
  return { ...view, submit: () => fireEvent.submit(view.container.querySelector('form')!) }
}

describe('workshop waitlist form', () => {
  it('requires a season and a city without requiring every checkbox', async () => {
    const view = renderForm()
    view.submit()
    expect(view.getByRole('alert').textContent).toBe('Please choose at least one season.')
    expect(submitWorkshopSubscription).not.toHaveBeenCalled()

    fireEvent.click(view.getByLabelText('Summer'))
    view.submit()
    expect(view.getByRole('alert').textContent).toBe('Please choose at least one city.')
    expect(submitWorkshopSubscription).not.toHaveBeenCalled()

    fireEvent.click(view.getByLabelText('Hamburg'))
    view.submit()
    await waitFor(() => expect(view.getByRole('status').textContent).toContain('Thank you'))
    const sent = vi.mocked(submitWorkshopSubscription).mock.calls[0][0]
    expect(sent.get('email')).toBe('fan@example.com')
    expect(sent.getAll('seasons')).toEqual(['summer'])
    expect(sent.getAll('cities')).toEqual(['hamburg'])
  })

  it('submits multiple preferences and retains them when the server asks to retry', async () => {
    vi.mocked(submitWorkshopSubscription).mockResolvedValueOnce({ ok: false, error: 'Please try again.' })
    const view = renderForm()
    for (const label of ['Winter', 'Summer', 'Berlin', 'Hamburg', 'Paris']) {
      fireEvent.click(view.getByLabelText(label))
    }
    view.submit()
    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('Please try again.'))
    for (const input of view.container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      expect(input.checked).toBe(true)
    }

    view.submit()
    await waitFor(() => expect(view.getByRole('status').textContent).toContain('Thank you'))
    const sent = vi.mocked(submitWorkshopSubscription).mock.calls[1][0]
    expect(sent.getAll('seasons')).toEqual(['winter', 'summer'])
    expect(sent.getAll('cities')).toEqual(['berlin', 'hamburg', 'paris'])
  })
})
