/**
 * The admin «Истории» tab (spec R4): create with a title, rows with cover,
 * slug, count and visibility, drag-reorder persisting reused slots, and the
 * editor — field validation messages from the action, credits rows, photo
 * add / remove / cover persisting through setStoryPhotos. dnd-kit and the
 * server actions are stubbed at their boundaries, like photos-table.test.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, act, fireEvent, within, cleanup } from '@testing-library/react'

const mock = vi.hoisted(() => ({
  drag: [] as ((event: unknown) => void)[],
  createStory: vi.fn(async () => ({ id: 'new', slug: 'new' })),
  reorderStories: vi.fn(async () => ({})),
  setStoryVisible: vi.fn(async () => ({})),
  deleteStory: vi.fn(async () => ({})),
  updateStory: vi.fn<(input: unknown) => Promise<{ error?: string; slug?: string }>>(async () => ({ slug: 'soft-structure' })),
  setStoryPhotos: vi.fn(async (): Promise<{ error?: string }> => ({})),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ onDragEnd, children }: { onDragEnd: (event: unknown) => void; children: React.ReactNode }) => {
    mock.drag.push(onDragEnd)
    return children
  },
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}))
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  rectSortingStrategy: vi.fn(),
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: undefined, isDragging: false }),
  arrayMove: (array: unknown[], from: number, to: number) => {
    const copy = [...array]
    copy.splice(to, 0, copy.splice(from, 1)[0])
    return copy
  },
}))
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: () => undefined } } }))
vi.mock('../story-actions', () => ({
  createStory: mock.createStory,
  reorderStories: mock.reorderStories,
  setStoryVisible: mock.setStoryVisible,
  deleteStory: mock.deleteStory,
  updateStory: mock.updateStory,
  setStoryPhotos: mock.setStoryPhotos,
}))

import { StoriesTable, type AdminStory, type CataloguePhoto } from './stories-table'

const catalogue: CataloguePhoto[] = [
  { id: 'p1', kind: 'photo', storage_path: 'photos/a/one.jpg', poster_path: null, title: 'One', alt_text: null },
  { id: 'p2', kind: 'photo', storage_path: 'photos/a/two.jpg', poster_path: null, title: null, alt_text: 'Two' },
  { id: 'p3', kind: 'video', storage_path: 'videos/a/clip.mp4', poster_path: 'videos/a/clip.jpg', title: 'Clip', alt_text: null },
]

function story(overrides: Partial<AdminStory>): AdminStory {
  return {
    id: 's1',
    slug: 'soft-structure',
    title: 'soft structure',
    subtitle: 'Soft fabric.',
    credits: [{ role: 'photography', name: 'maria chevskaya' }, { role: 'model', name: '' }],
    cover_photo_id: null,
    position: 0,
    visible: false,
    version: 1,
    created_at: '',
    updated_at: '',
    photo_ids: ['p2', 'p1'],
    ...overrides,
  }
}

const url = 'http://local'

afterEach(cleanup)

beforeEach(() => {
  mock.drag = []
  for (const fn of [mock.createStory, mock.reorderStories, mock.setStoryVisible, mock.deleteStory, mock.updateStory, mock.setStoryPhotos]) fn.mockClear()
  mock.updateStory.mockResolvedValue({ slug: 'soft-structure' })
  mock.setStoryPhotos.mockResolvedValue({})
})

describe('<StoriesTable />', () => {
  it('creates a story from the title field and clears it on success', async () => {
    const view = render(<StoriesTable stories={[]} catalogue={catalogue} supabaseUrl={url} />)
    expect(view.container.textContent).toContain('Историй пока нет')
    const input = view.getByLabelText('Название новой истории') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'White noise' } })
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })
    expect(mock.createStory).toHaveBeenCalledWith({ title: 'White noise' })
    expect(input.value).toBe('')
  })

  it('shows the action error and keeps the typed title', async () => {
    mock.createStory.mockResolvedValueOnce({ error: 'Название не может быть пустым' } as never)
    const view = render(<StoriesTable stories={[]} catalogue={catalogue} supabaseUrl={url} />)
    const input = view.getByLabelText('Название новой истории') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'x' } })
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })
    expect(view.getByRole('alert').textContent).toBe('Название не может быть пустым')
    expect(input.value).toBe('x')
  })

  it('lists stories with the cover, public path, photo count and visibility; toggling persists', async () => {
    const view = render(<StoriesTable stories={[story({})]} catalogue={catalogue} supabaseUrl={url} />)
    const row = view.container.querySelector('li')!
    expect(row.textContent).toContain('soft structure')
    expect(row.textContent).toContain('/editorial/soft-structure · 2 фото')
    // No cover chosen → first photo of the sequence (p2) fronts the story.
    expect(row.querySelector('img')?.getAttribute('src')).toBe(`${url}/storage/v1/object/public/photos/photos/a/two.jpg`)

    const toggle = within(row).getByRole('switch')
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(mock.setStoryVisible).toHaveBeenCalledWith({ id: 's1', visible: true })
  })

  it('persists a drag as reused position slots in the new order', async () => {
    const stories = [story({ id: 'a', slug: 'a', position: -4 }), story({ id: 'b', slug: 'b', position: 2 })]
    const view = render(<StoriesTable stories={stories} catalogue={catalogue} supabaseUrl={url} />)
    await act(async () => mock.drag[0]?.({ active: { id: 'a' }, over: { id: 'b' } }))
    expect(mock.reorderStories).toHaveBeenCalledWith(['b', 'a'])
    expect(Array.from(view.container.querySelectorAll('li > div p.truncate.text-xs')).map((p) => p.textContent?.startsWith('/editorial/b'))).toEqual([true, false])
    await act(async () => {
      mock.drag[0]?.({ active: { id: 'a' }, over: null })
      mock.drag[0]?.({ active: { id: 'a' }, over: { id: 'a' } })
    })
    expect(mock.reorderStories).toHaveBeenCalledTimes(1)
  })

  it('deletes after confirmation only', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const view = render(<StoriesTable stories={[story({})]} catalogue={catalogue} supabaseUrl={url} />)
    const remove = view.getByRole('button', { name: 'Удалить: soft structure' })
    await act(async () => {
      fireEvent.click(remove)
    })
    expect(mock.deleteStory).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(remove)
    })
    expect(mock.deleteStory).toHaveBeenCalledWith({ id: 's1' })
    confirmSpy.mockRestore()
  })
})

describe('story editor', () => {
  async function openEditor(stories = [story({})]) {
    const view = render(<StoriesTable stories={stories} catalogue={catalogue} supabaseUrl={url} />)
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Редактировать' }))
    })
    return view
  }

  it('saves title, slug, subtitle and the credit rows as typed and reports success', async () => {
    const view = await openEditor()
    fireEvent.change(view.getByLabelText('Слаг'), { target: { value: 'soft-structure-2' } })
    fireEvent.change(view.getByLabelText('Подзаголовок'), { target: { value: 'New line' } })
    fireEvent.change(view.getByLabelText('Имя 2'), { target: { value: 'Eva' } })
    mock.updateStory.mockResolvedValueOnce({ slug: 'soft-structure-2' })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Сохранить' }))
    })
    expect(mock.updateStory).toHaveBeenCalledWith({
      id: 's1',
      title: 'soft structure',
      slug: 'soft-structure-2',
      subtitle: 'New line',
      credits: [{ role: 'photography', name: 'maria chevskaya' }, { role: 'model', name: 'Eva' }],
    })
    expect(view.getByRole('status').textContent).toBe('Сохранено')
  })

  it('shows the validation message returned by the action', async () => {
    const view = await openEditor()
    mock.updateStory.mockResolvedValueOnce({ error: 'Слаг: только строчные латинские буквы, цифры и дефисы' })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Сохранить' }))
    })
    expect(view.getByRole('alert').textContent).toBe('Слаг: только строчные латинские буквы, цифры и дефисы')
  })

  it('adds, moves and removes credit rows', async () => {
    const view = await openEditor()
    fireEvent.click(view.getByRole('button', { name: 'Роль' }))
    expect(view.getAllByPlaceholderText('роль')).toHaveLength(3)
    fireEvent.change(view.getByLabelText('Роль 3'), { target: { value: 'styling' } })
    fireEvent.click(view.getByRole('button', { name: 'Выше 3' }))
    fireEvent.click(view.getByRole('button', { name: 'Убрать 1' }))
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Сохранить' }))
    })
    expect(mock.updateStory.mock.calls[0][0]).toMatchObject({
      credits: [{ role: 'styling', name: '' }, { role: 'model', name: '' }],
    })
  })

  it('adds a catalogue photo, makes a cover and removes a photo, persisting each change', async () => {
    const view = await openEditor()
    const tiles = () => Array.from(view.container.querySelectorAll('ul.grid li')).length
    expect(tiles()).toBe(2)

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Добавить фото' }))
    })
    // Only editorial photos not yet in the story are offered.
    expect(view.getByRole('button', { name: 'Добавить: Clip' })).toBeTruthy()
    expect(view.queryByRole('button', { name: 'Добавить: One' })).toBeNull()
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Добавить: Clip' }))
    })
    expect(mock.setStoryPhotos).toHaveBeenLastCalledWith({ storyId: 's1', photoIds: ['p2', 'p1', 'p3'], coverPhotoId: null })

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Обложка: One' }))
    })
    expect(mock.setStoryPhotos).toHaveBeenLastCalledWith({ storyId: 's1', photoIds: ['p2', 'p1', 'p3'], coverPhotoId: 'p1' })

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Убрать из истории: One' }))
    })
    expect(mock.setStoryPhotos).toHaveBeenLastCalledWith({ storyId: 's1', photoIds: ['p2', 'p3'], coverPhotoId: null })
  })

  it('reorders story photos by drag and snaps back when persisting fails', async () => {
    const view = await openEditor()
    const photoDrag = mock.drag[mock.drag.length - 1]
    await act(async () => photoDrag?.({ active: { id: 'p1' }, over: { id: 'p2' } }))
    expect(mock.setStoryPhotos).toHaveBeenLastCalledWith({ storyId: 's1', photoIds: ['p1', 'p2'], coverPhotoId: null })

    mock.setStoryPhotos.mockResolvedValueOnce({ error: 'Не удалось обновить фотографии: x' })
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Убрать из истории: Two' }))
    })
    expect(view.getByRole('alert').textContent).toBe('Не удалось обновить фотографии: x')
    expect(view.container.querySelectorAll('ul.grid li')).toHaveLength(2)
  })
})
