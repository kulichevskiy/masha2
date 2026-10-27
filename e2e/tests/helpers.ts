import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'
export function db() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:55321')
    throw new Error('E2E local database required')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
export async function login(page: Page, email = 'admin@e2e.invalid') {
  await page.goto('/auth/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'войти', exact: true }).click()
}
export async function assertSaved(table: string, email: string) {
  await expect
    .poll(async () => {
      const result = await db().from(table).select('email').eq('email', email)
      if (result.error) throw result.error
      return result.data.length
    })
    .toBe(1)
}
