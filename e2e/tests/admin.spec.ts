import { test, expect } from '@playwright/test'
import { db, login } from './helpers'

test('admin login, upload, edit, reorder, visibility and logout persist', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Личный кабинет фотографа' })).toBeVisible()
  for (const name of ['one.png', 'two.png']) {
    const { readFileSync } = await import('node:fs')
    await page.locator('input[type=file]').setInputFiles({
      name,
      mimeType: 'image/png',
      buffer: readFileSync('e2e/fixtures/photo.png'),
    })
    await page.getByRole('button', { name: 'Загрузить фото и видео', exact: true }).click()
    await expect
      .poll(
        async () =>
          (await db().from('photos').select('id').like('storage_path', `%/${name}`)).data?.length,
      )
      .toBe(1)
    await page.reload()
  }
  let row = page.getByRole('row').filter({ has: page.locator('img[src$="/one.png"]') })
  await row.getByText('Заголовок', { exact: true }).click()
  await row.getByPlaceholder('Заголовок').fill('E2E portrait')
  await row.getByPlaceholder('Заголовок').press('Enter')
  await expect(row.getByText('E2E portrait', { exact: true })).toBeVisible()
  await expect
    .poll(
      async () =>
        (await db().from('photos').select('title').like('storage_path', '%/one.png').single()).data
          ?.title,
    )
    .toBe('E2E portrait')
  const original = await db()
    .from('photos')
    .select('id,storage_path,position,pages')
    .order('position')
  if (original.error) throw original.error
  const handle = row.getByRole('button', { name: 'Переместить' })
  const sourceBox = await handle.boundingBox()
  const targetHandle = page
    .getByRole('row')
    .filter({ has: page.locator('img[src$="/two.png"]') })
    .getByRole('button', { name: 'Переместить' })
  const targetBox = await targetHandle.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2)
  await page.mouse.down()
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 10,
  })
  await expect(page.getByRole('status')).toContainText(`droppable area ${original.data[0].id}`)
  await page.mouse.up()
  await expect(handle).not.toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () =>
      (await db().from('photos').select('id').order('position')).data?.map((p) => p.id),
    )
    .toEqual([original.data[1].id, original.data[0].id, ...original.data.slice(2).map((p) => p.id)])
  await page.reload()
  const storedRows = await db().from('photos').select('storage_path').order('position')
  const imagePaths = await page
    .locator('tbody tr img')
    .evaluateAll((images) => images.map((img) => (img as HTMLImageElement).src))
  expect(imagePaths.map((path) => path.split('/').pop())).toEqual(
    storedRows.data!.map((photo) => photo.storage_path.split('/').pop()),
  )
  row = page.getByRole('row').filter({ hasText: 'E2E portrait' })
  const portraits = row.getByRole('button', { name: 'Portraits', exact: true })
  await portraits.click()
  await expect(portraits).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(
      async () =>
        (await db().from('photos').select('pages').like('storage_path', '%/one.png').single()).data
          ?.pages,
    )
    .toEqual(['portraits'])
  await expect(portraits).toBeEnabled()
  await page.goto('/portraits')
  await expect(page.locator('img[src*="one.png"]')).toBeVisible()
  await page.goto('/admin')
  row = page.getByRole('row').filter({ hasText: 'E2E portrait' })
  await row.getByRole('button', { name: 'Portraits', exact: true }).click()
  await expect
    .poll(
      async () =>
        (await db().from('photos').select('pages').like('storage_path', '%/one.png').single()).data
          ?.pages,
    )
    .toEqual([])
  await page.goto('/portraits')
  await expect(page.locator('img[src*="one.png"]')).toHaveCount(0)
  await page.goto('/admin')
  row = page.getByRole('row').filter({ has: page.locator('img[src$="/one.png"]') })
  await row.getByRole('button', { name: 'Portraits', exact: true }).click()
  await expect
    .poll(
      async () =>
        (await db().from('photos').select('pages').like('storage_path', '%/one.png').single()).data
          ?.pages,
    )
    .toEqual(['portraits'])
  await page.reload()
  row = page.getByRole('row').filter({ hasText: 'E2E portrait' })
  await expect(row.getByRole('button', { name: 'Portraits', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const record = await db()
    .from('photos')
    .select('storage_path')
    .like('storage_path', '%/one.png')
    .single()
  const object = await db().storage.from('photos').download(record.data!.storage_path)
  expect(object.error).toBeNull()
  expect(object.data?.size).toBeGreaterThan(0)
  await page.goto('/portraits')
  await expect(page.locator('img[src*="one.png"]')).toBeVisible()
  await page.goto('/admin')
  await page.getByRole('button', { name: /выйти/i }).click()
  await expect(page).toHaveURL(/\/auth\/login/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('non-admin cannot enter admin', async ({ page }) => {
  await login(page, 'visitor@e2e.invalid')
  await expect(page).toHaveURL(/\/auth\/error/)
  await expect(page.getByRole('heading', { name: 'Личный кабинет фотографа' })).toHaveCount(0)
})
