import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { BookingDialogProvider, BookTierLink, useBookingDialog } from './booking-dialog'
import { submitBookingRequest } from './actions'
import posthog from 'posthog-js'

vi.mock('./actions', () => ({ submitBookingRequest: vi.fn() }))
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }))

// jsdom has no modal dialogs; the page only needs open/close and the close event.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  vi.mocked(submitBookingRequest).mockReset()
  vi.mocked(posthog.capture).mockClear()
})

const mini = { id: 't1', name: 'mini', price_text: '300 €' }

function Page() {
  return (
    <BookingDialogProvider>
      <BookTierLink tier={mini} label="book mini" />
    </BookingDialogProvider>
  )
}

describe('booking dialog', () => {
  it('opens with the chosen tier, closes from the cross and from the backdrop', async () => {
    render(<Page />)
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /book mini/ }))
    await waitFor(() => expect(dialog.open).toBe(true))
    expect(screen.getByRole('heading', { name: 'mini — 300 €' })).toBeTruthy()
    expect(posthog.capture).toHaveBeenCalledWith('booking_dialog_opened', { tier: 'mini', price: '300 €' })

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(dialog.open).toBe(false))
    expect(screen.queryByRole('heading', { name: 'mini — 300 €' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /book mini/ }))
    await waitFor(() => expect(dialog.open).toBe(true))
    // a click inside the sheet stays open; a click on the backdrop closes
    fireEvent.click(screen.getByLabelText('your email'))
    expect(dialog.open).toBe(true)
    fireEvent.click(dialog)
    await waitFor(() => expect(dialog.open).toBe(false))
  })

  it('sends the chosen tier with the request and shows the confirmation', async () => {
    vi.mocked(submitBookingRequest).mockResolvedValue({ ok: true })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /book mini/ }))
    await waitFor(() => screen.getByLabelText('your email'))

    fireEvent.change(screen.getByLabelText('your email'), { target: { value: 'me@example.com' } })
    fireEvent.change(screen.getByLabelText(/a few words/), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    const sent = vi.mocked(submitBookingRequest).mock.calls[0][0]
    expect(sent.get('tier_id')).toBe('t1')
    expect(sent.get('email')).toBe('me@example.com')
    expect(sent.get('message')).toBe('hello')
    expect(posthog.capture).toHaveBeenCalledWith('booking_request_submitted', { tier: 'mini', price: '300 €' })

    fireEvent.click(screen.getByRole('button', { name: 'Send another request' }))
    expect((screen.getByLabelText('your email') as HTMLInputElement).value).toBe('')
  })

  it('shows the server error and keeps the form', async () => {
    vi.mocked(submitBookingRequest).mockResolvedValue({ ok: false, error: 'Too many requests' })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /book mini/ }))
    await waitFor(() => screen.getByLabelText('your email'))
    fireEvent.change(screen.getByLabelText('your email'), { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Too many requests'))
    expect(posthog.capture).not.toHaveBeenCalledWith('booking_request_submitted', expect.anything())
  })

  it('does not count a honeypot submission', async () => {
    vi.mocked(submitBookingRequest).mockResolvedValue({ ok: true })
    const { container } = render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /book mini/ }))
    await waitFor(() => screen.getByLabelText('your email'))
    fireEvent.change(screen.getByLabelText('your email'), { target: { value: 'bot@example.com' } })
    const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement
    fireEvent.change(honeypot, { target: { value: 'http://spam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(posthog.capture).not.toHaveBeenCalledWith('booking_request_submitted', expect.anything())
  })

  it('refuses the link outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Lone() {
      useBookingDialog()
      return null
    }
    expect(() => render(<Lone />)).toThrow('BookingDialogProvider')
    spy.mockRestore()
  })
})
