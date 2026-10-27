import { it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
const mock = vi.hoisted(() => ({ signInWithPassword: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword: mock.signInWithPassword } }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mock.push }) }))
import { LoginForm } from './login-form'
it('logs in with password and displays rejected credentials', async () => {
  const view = render(<LoginForm />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'client@example.org' } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password' } })
  mock.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user' } }, error: null })
  fireEvent.submit(view.container.querySelector('form')!)
  await waitFor(() => expect(mock.push).toHaveBeenCalledWith('/admin'))
  mock.signInWithPassword.mockResolvedValue({
    data: { user: null },
    error: new Error('Invalid credentials'),
  })
  fireEvent.submit(view.container.querySelector('form')!)
  await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeTruthy())
})
