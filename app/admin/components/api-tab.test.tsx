import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { ApiTab } from './api-tab'
import { createApiToken, getApiAdminData, revokeApiToken } from '../api-actions'
import type { ApiAdminData, ApiToken } from '../api-types'
vi.mock('../api-actions', () => ({ createApiToken: vi.fn(), getApiAdminData: vi.fn(), revokeApiToken: vi.fn() }))
afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())
const token: ApiToken = { id: 'token-1', name: 'Script', prefix: 'mcp_12345678', created_at: '2026-09-18T10:00:00Z', last_used_at: null, revoked_at: null }
const data: ApiAdminData = { tokens: [token], entries: [], offset: 0, hasNext: false }
const secret = 'mcp_' + 'a'.repeat(64)

describe('API tab', () => {
  it('shows the secret only after creation, masks replay, supports copy/hide, and never restores it on reload', async () => {
    vi.mocked(createApiToken).mockResolvedValue({ data: { token: { ...token, id: 'token-2', name: 'Agent' }, secret } })
    const copy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } })
    const view = render(<ApiTab initial={{ data }} />)
    expect(view.queryByLabelText('Секрет токена')).toBeNull()
    fireEvent.change(view.getByLabelText('Название токена'), { target: { value: 'Agent' } })
    fireEvent.click(view.getByRole('button', { name: 'Создать токен' }))
    const input = await view.findByLabelText('Секрет токена')
    expect((input as HTMLTextAreaElement).value).toBe(secret)
    expect(input.closest('.ph-no-capture.ph-mask')).not.toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Скопировать' }))
    await waitFor(() => expect(copy).toHaveBeenCalledWith(secret))
    fireEvent.click(view.getByRole('button', { name: 'Скрыть токен' }))
    expect(view.queryByLabelText('Секрет токена')).toBeNull()
    view.unmount()
    expect(render(<ApiTab initial={{ data }} />).queryByLabelText('Секрет токена')).toBeNull()
  })

  it('revokes a selected token without affecting others', async () => {
    vi.mocked(revokeApiToken).mockResolvedValue({ data: { revokedAt: '2026-09-18T11:00:00Z' } })
    const view = render(<ApiTab initial={{ data: { ...data, tokens: [token, { ...token, id: 'token-2', name: 'Agent' }] } }} />)
    fireEvent.click(view.getByRole('button', { name: 'Отозвать токен Script' }))
    await waitFor(() => expect(view.queryByRole('button', { name: 'Отозвать токен Script' })).toBeNull())
    expect(revokeApiToken).toHaveBeenCalledWith('token-1')
    expect(view.getByRole('button', { name: 'Отозвать токен Agent' })).toBeTruthy()
    expect(view.getByText(/Отозван:/)).toBeTruthy()
  })

  it('keeps an active token when revocation fails and shows a recoverable error', async () => {
    vi.mocked(revokeApiToken).mockResolvedValue({ error: 'Не удалось отозвать токен.' })
    const view = render(<ApiTab initial={{ data }} />)
    fireEvent.click(view.getByRole('button', { name: 'Отозвать токен Script' }))
    expect((await view.findByRole('alert')).textContent).toBe('Не удалось отозвать токен.')
    expect(view.getByText('Активен')).toBeTruthy()
  })

  it('reports transport failures without leaking thrown details', async () => {
    vi.mocked(createApiToken).mockRejectedValue(new Error('private transport detail'))
    const view = render(<ApiTab initial={{ data }} />)
    fireEvent.change(view.getByLabelText('Название токена'), { target: { value: 'Agent' } })
    fireEvent.click(view.getByRole('button', { name: 'Создать токен' }))
    expect((await view.findByRole('alert')).textContent).toBe('Не удалось создать токен.')
    expect(view.queryByLabelText('Секрет токена')).toBeNull()
  })

  it('paginates the journal and displays interrupted/succeeded/failed outcomes', async () => {
    const entries: ApiAdminData['entries'] = ['started', 'succeeded', 'failed'].map((status, i) => ({ id: String(i), token_name: 'Agent', operation: 'PATCH', resource: 'media', resource_id: 'photo-1', status: status as 'started' | 'succeeded' | 'failed', error_code: status === 'failed' ? 'conflict' : null, created_at: token.created_at }))
    vi.mocked(getApiAdminData).mockResolvedValue({ data: { ...data, entries, offset: 25 } })
    const view = render(<ApiTab initial={{ data: { ...data, hasNext: true } }} />)
    fireEvent.click(view.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(getApiAdminData).toHaveBeenCalledWith(25))
    expect(await view.findByText('Страница 2')).toBeTruthy()
    for (const label of ['Начато', 'Выполнено', 'Ошибка', 'conflict']) expect(view.getByText(label)).toBeTruthy()
    vi.mocked(getApiAdminData).mockResolvedValue({ data })
    // Data can paint before React completes the async transition; a real
    // user cannot navigate while the controls remain disabled.
    await waitFor(() => expect((view.getByRole('button', { name: 'Назад' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(view.getByRole('button', { name: 'Назад' }))
    await waitFor(() => expect(getApiAdminData).toHaveBeenLastCalledWith(0))
  })

  it('recovers from a failed initial read', async () => {
    vi.mocked(getApiAdminData).mockResolvedValue({ data })
    const view = render(<ApiTab initial={{ error: 'Данные недоступны.' }} />)
    expect((view.getByRole('button', { name: 'Создать токен' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(view.getByRole('button', { name: 'Повторить загрузку' }))
    expect(await view.findByText('Script')).toBeTruthy()
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull())
  })
})
