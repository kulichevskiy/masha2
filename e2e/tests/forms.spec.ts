import { test, expect } from '@playwright/test'
import { db, assertSaved } from './helpers'
test('gift validates input and persists selected amount', async ({ page }) => {
  await page.goto('/gift')
  const email = page.locator('input[name=email]')
  await email.fill('invalid')
  await page.locator('button[type=submit]').click()
  expect(await email.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false)
  await email.fill('gift@e2e.invalid')
  await page.locator('button[type=submit]').click()
  await expect(page.getByRole('status')).toContainText('Thank you')
  await assertSaved('gift_certificate_requests', 'gift@e2e.invalid')
  const result = await db()
    .from('gift_certificate_requests')
    .select('amount')
    .eq('email', 'gift@e2e.invalid')
    .single()
  expect(result.data?.amount).toBe('450 €')
})
test('workshop application and closed-sales subscription persist', async ({ page }) => {
  await page.goto('/workshop')
  const form = page.locator('form').filter({ has: page.locator('input[name=name]') })
  await form.locator('button[type=submit]').click()
  expect(
    await form
      .locator('input[name=name]')
      .evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false)
  await form.locator('input[name=name]').fill('E2E Applicant')
  await form.locator('input[name=email]').fill('application@e2e.invalid')
  await form.locator('button[type=submit]').click()
  await expect(page.getByRole('status')).toContainText('Thank you')
  await assertSaved('workshop_applications', 'application@e2e.invalid')
  const changed = await db().from('workshop').update({ sales_open: false }).not('id', 'is', null)
  if (changed.error) throw changed.error
  try {
    await page.reload()
    const subscribe = page
      .locator('form')
      .filter({ has: page.locator('input[name=email]') })
      .first()
    await subscribe.locator('input[name=email]').fill('subscriber@e2e.invalid')
    await subscribe.locator('button[type=submit]').click()
    await expect(subscribe.getByRole('alert')).toContainText(/season|city/i)
    expect(
      (await db().from('workshop_subscribers').select('id').eq('email', 'subscriber@e2e.invalid'))
        .data,
    ).toEqual([])
    await subscribe.locator('input[type=checkbox]').first().check()
    // Preferences include at least one season and city.
    const cities = subscribe.locator('input[name=cities]')
    if (await cities.count()) await cities.first().check()
    await subscribe.locator('button[type=submit]').click()
    await assertSaved('workshop_subscribers', 'subscriber@e2e.invalid')
  } finally {
    const restored = await db().from('workshop').update({ sales_open: true }).not('id', 'is', null)
    if (restored.error) throw restored.error
  }
})
