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
  // Editorial is a feed of stories: the seeded story's cover links to its page,
  // which shows the title, the sequence and the same chrome (nav, BOOK).
  await page.goto('/editorial')
  // The tile's name also carries its caption, so it is found by where it goes.
  const tile = page.locator('a[href="/editorial/seed-story"]')
  await expect(tile).toContainText('Seed story')
  await expect(tile.locator('img')).toBeVisible()
  await tile.click()
  await expect(page).toHaveURL(/\/editorial\/seed-story$/)
  await expect(page.locator('h1')).toHaveText('Seed story')
  await expect(page.locator('dd').first()).toHaveText('maria chevskaya')
  const storyImage = page.locator('main img, img').first()
  await expect.poll(() => storyImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('link', { name: 'Editorial', exact: true }).first()).toHaveAttribute('aria-current', 'page')
  const missing = await page.goto('/editorial/no-such-story')
  expect(missing?.status()).toBe(404)
  await page.goto('/editorial/seed-story')
  await page.getByRole('link', { name: 'Book', exact: true }).first().click()
  await expect(page).toHaveURL(/\/book$/)
  await expect(page.locator('h1')).toBeVisible()
})
