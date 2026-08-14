import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhotoRow } from './photo-row'

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}))

vi.mock('../actions', () => ({ updatePhoto: vi.fn(), deletePhoto: vi.fn() }))

const basePhoto = {
  id: 'media-1',
  alt_text: 'Portrait',
  created_at: '2026-08-14T00:00:00Z',
  description: null,
  height: 1280,
  pages: [],
  position: 0,
  storage_path: 'videos/batch/clip.mp4',
  title: null,
  updated_at: '2026-08-14T00:00:00Z',
  width: 720,
}

describe('<PhotoRow /> video presentation', () => {
  it('uses the video poster thumbnail and shows a compact duration', () => {
    render(
      <table>
        <tbody>
          <PhotoRow
            photo={{
              ...basePhoto,
              kind: 'video',
              poster_path: 'videos/batch/clip.poster.jpg',
              duration_seconds: 62.4,
            }}
            supabaseUrl="https://example.supabase.co"
          />
        </tbody>
      </table>
    )

    expect(screen.getByRole('img', { name: 'Portrait' }).getAttribute('src')).toBe(
      'https://example.supabase.co/storage/v1/object/public/videos/videos/batch/clip.poster.jpg'
    )
    expect(screen.getByText('1:02')).toBeTruthy()
  })
})
