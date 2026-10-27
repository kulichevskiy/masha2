import { it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
const mock = vi.hoisted(() => ({
  drag: null as ((event: unknown) => void) | null,
  reorder: vi.fn(),
}))
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    onDragEnd,
    children,
  }: {
    onDragEnd: (event: unknown) => void
    children: React.ReactNode
  }) => {
    mock.drag = onDragEnd
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
  arrayMove: (array: unknown[], from: number, to: number) => {
    const copy = [...array]
    copy.splice(to, 0, copy.splice(from, 1)[0])
    return copy
  },
}))
vi.mock('./photo-row', () => ({
  PhotoRow: ({ photo }: { photo: { id: string } }) => (
    <tr>
      <td>{photo.id}</td>
    </tr>
  ),
}))
vi.mock('../actions', () => ({ reorderPhotos: mock.reorder }))
import { PhotosTable } from './photos-table'
import type { Tables } from '@/lib/supabase/database.types'
it('persists a valid drag and ignores missing or unchanged targets', async () => {
  const photos = [
    { id: 'a', pages: ['portraits'], position: 1 },
    { id: 'b', pages: ['portraits'], position: 3 },
  ] as Tables<'photos'>[]
  const view = render(<PhotosTable photos={photos} supabaseUrl="http://local" />)
  await act(async () => mock.drag?.({ active: { id: 'a' }, over: { id: 'b' } }))
  expect(mock.reorder).toHaveBeenCalledWith(['b', 'a'])
  expect(view.container.querySelector('tbody')?.textContent).toBe('ba')
  mock.reorder.mockClear()
  await act(async () => {
    mock.drag?.({ active: { id: 'a' }, over: null })
    mock.drag?.({ active: { id: 'a' }, over: { id: 'a' } })
    mock.drag?.({ active: { id: 'missing' }, over: { id: 'a' } })
  })
  expect(mock.reorder).not.toHaveBeenCalled()
})
