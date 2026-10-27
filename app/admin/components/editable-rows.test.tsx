import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { TierRow } from './tier-row'
import { FaqRow } from './faq-row'
import { RequestsTable } from './requests-table'
import { updateTier } from '../actions'
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}))
vi.mock('@/components/rich-text-editor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="Editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))
vi.mock('../actions', () => ({
  updateTier: vi.fn(),
  deleteTier: vi.fn(),
  updateFaq: vi.fn(),
  deleteFaq: vi.fn(),
  deleteBookingRequest: vi.fn(),
}))
afterEach(cleanup)
describe('admin row editing', () => {
  it('saves and cancels editable tier fields', async () => {
    render(
      <table>
        <tbody>
          <TierRow
            tier={{
              id: 'tier',
              name: 'Portrait',
              subtitle: null,
              price_text: '450',
              description: null,
              is_active: true,
              is_accent: false,
              position: 0,
              created_at: '',
              updated_at: '',
            }}
          />
        </tbody>
      </table>,
    )
    for (const [label, field] of [
      ['Portrait', 'name'],
      ['Подзаголовок', 'subtitle'],
      ['450', 'price_text'],
    ]) {
      fireEvent.click(screen.getByText(label, { exact: true }))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: `new ${field}` } })
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
      await waitFor(() =>
        expect(updateTier).toHaveBeenCalledWith('tier', { [field]: `new ${field}` }),
      )
      await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
      fireEvent.click(screen.getByText(`new ${field}`, { exact: true }))
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    }
    fireEvent.click(screen.getByText('Описание', { exact: true }))
    fireEvent.change(screen.getByLabelText('Editor'), { target: { value: 'Studio portrait' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() =>
      expect(updateTier).toHaveBeenCalledWith('tier', { description: 'Studio portrait' }),
    )
  })
  it('renders FAQ answer editing and visibility controls', () => {
    render(
      <table>
        <tbody>
          <FaqRow
            entry={{
              id: 'faq',
              question: 'Where?',
              answer: 'Berlin',
              is_visible: true,
              position: 0,
              created_at: '',
              updated_at: '',
            }}
          />
        </tbody>
      </table>,
    )
    fireEvent.click(screen.getByText('Where?'))
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'Where?')
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    fireEvent.click(screen.getByText('Berlin'))
    expect(screen.getByLabelText('Editor')).toHaveProperty('value', 'Berlin')
  })
  it('expands long enquiries and handles missing tier/message', () => {
    const message = 'A'.repeat(100)
    render(
      <RequestsTable
        requests={[
          {
            id: 'r',
            email: 'client@test.invalid',
            message,
            created_at: '2026-10-27',
            booking_tiers: { name: 'Portrait' },
          },
          {
            id: 'empty',
            email: 'empty@test.invalid',
            message: null,
            created_at: '2026-10-27',
            booking_tiers: null,
          },
        ]}
      />,
    )
    const button = screen.getByRole('button', { name: 'A'.repeat(80) + '…' })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: message })).toBeTruthy()
  })
})
