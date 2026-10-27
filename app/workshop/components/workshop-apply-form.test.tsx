import { it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
vi.mock('../actions', () => ({ submitWorkshopApplication: vi.fn(async () => ({ ok: true })) }))
import { submitWorkshopApplication } from '../actions'
import { IntakeProvider } from './intake-context'
import { WorkshopApplyForm } from './workshop-apply-form'
import type { Tariff } from '../data'
it('submits the selected intake and shows confirmation', async () => {
  const tariffs = [{ key: 'full', days: 'Three days' }] as Tariff[]
  const view = render(
    <IntakeProvider>
      <WorkshopApplyForm tariffs={tariffs} />
    </IntakeProvider>,
  )
  fireEvent.change(view.container.querySelector('input[name=name]')!, {
    target: { value: 'Client' },
  })
  fireEvent.change(view.container.querySelector('input[name=email]')!, {
    target: { value: 'client@example.org' },
  })
  fireEvent.submit(view.container.querySelector('form')!)
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Thank you'))
  expect(vi.mocked(submitWorkshopApplication).mock.calls[0][0].get('intake')).toBe('full')
})
