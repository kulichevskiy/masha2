import { test, expect } from '@playwright/test'
test('portfolio sections and booking navigation', async ({ page }) => {
  for (const path of ['/', '/portraits', '/kids', '/editorial', '/video']) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('body')).not.toContainText('Application error')
    if (path !== '/') {
      const image = page.locator('img').first()
      await expect(image).toBeVisible()
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0)
    }
  }
  await page.getByRole('link', { name: 'Book', exact: true }).first().click()
  await expect(page).toHaveURL(/\/book$/)
  await expect(page.locator('h1')).toBeVisible()
})
