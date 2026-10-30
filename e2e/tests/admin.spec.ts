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

test('admin creates, fills, publishes and deletes an editorial story', async ({ page, request }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Личный кабинет фотографа' })).toBeVisible()
  await page.goto('/admin?tab=stories')
  await expect(page.getByText('/editorial/seed-story', { exact: false })).toBeVisible()
  await page.getByLabel('Название новой истории').fill('E2E story')
  await page.getByRole('button', { name: 'Добавить историю', exact: true }).click()
  const created = page.locator('li').filter({ hasText: '/editorial/e2e-story' })
  await expect(created).toBeVisible()
  await expect
    .poll(async () => (await db().from('editorial_stories').select('visible').eq('slug', 'e2e-story').single()).data?.visible)
    .toBe(false)

  await created.getByRole('button', { name: 'Редактировать' }).click()
  await created.getByLabel('Подзаголовок').fill('An end-to-end story.')
  await created.getByLabel('Имя 2').fill('Visitor')
  await created.getByRole('button', { name: 'Сохранить' }).click()
  await expect(created.getByText('Сохранено', { exact: true })).toBeVisible()
  await expect
    .poll(async () => (await db().from('editorial_stories').select('subtitle, credits').eq('slug', 'e2e-story').single()).data)
    .toEqual({
      subtitle: 'An end-to-end story.',
      credits: [{ role: 'photography', name: 'maria chevskaya' }, { role: 'model', name: 'Visitor' }],
    })

  await created.getByRole('button', { name: 'Добавить фото' }).click()
  await created.getByRole('button', { name: /^Добавить: / }).first().click()
  await expect
    .poll(async () => {
      const story = await db().from('editorial_stories').select('id').eq('slug', 'e2e-story').single()
      return (await db().from('editorial_story_photos').select('photo_id').eq('story_id', story.data!.id)).data?.length
    })
    .toBe(1)

  // Still hidden: anonymous visitors (the `request` fixture carries no admin
  // cookies) get a 404 for the page and no tile in the feed; the signed-in
  // owner does not see it on the public pages either.
  const hidden = await request.get('/editorial/e2e-story')
  expect(hidden.status()).toBe(404)
  const anonymousFeed = await (await request.get('/editorial')).text()
  expect(anonymousFeed).not.toContain('/editorial/e2e-story')
  await page.goto('/editorial')
  await expect(page.getByRole('link', { name: 'E2E story', exact: true })).toHaveCount(0)
  await page.goto('/admin?tab=stories')
  const createdRow = page.locator('li').filter({ hasText: '/editorial/e2e-story' })

  await createdRow.getByRole('switch', { name: 'Видима: E2E story' }).click()
  await expect
    .poll(async () => (await db().from('editorial_stories').select('visible').eq('slug', 'e2e-story').single()).data?.visible)
    .toBe(true)

  await page.goto('/editorial')
  // The tile's name also carries its caption, so it is found by where it goes.
  await expect(page.locator('a[href="/editorial/e2e-story"]')).toContainText('E2E story')
  await page.goto('/editorial/e2e-story')
  await expect(page.locator('h1')).toHaveText('E2E story')
  await expect(page.locator('p', { hasText: 'An end-to-end story.' })).toBeVisible()
  await expect(page.locator('dd').nth(1)).toHaveText('visitor')
  // Two visible stories: the footer navigation links them to each other.
  const storiesNav = page.getByRole('navigation', { name: 'Stories' })
  await expect(storiesNav.getByRole('link', { name: /Seed story/ }).first()).toHaveAttribute('href', '/editorial/seed-story')

  await page.goto('/admin?tab=stories')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Удалить: E2E story' }).click()
  await expect
    .poll(async () => (await db().from('editorial_stories').select('id').eq('slug', 'e2e-story')).data?.length)
    .toBe(0)
  // Deleting the story leaves its photograph in the library.
  const photos = await db().from('photos').select('id')
  expect(photos.data?.length).toBeGreaterThan(0)
  const gone = await page.request.get('/editorial/e2e-story')
  expect(gone.status()).toBe(404)
})
