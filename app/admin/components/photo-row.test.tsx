import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
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

import { updatePhoto } from '../actions'
it('saves metadata fields and cancels edits without persistence', async () => {
  cleanup()
  render(<table><tbody><PhotoRow photo={{ ...basePhoto, kind:'photo', poster_path:null, duration_seconds:null }} supabaseUrl="https://example.supabase.co" /></tbody></table>)
  for(const [label, placeholder, field] of [['Заголовок','Заголовок','title'],['Описание','Описание','description'],['Portrait','Alt текст','alt_text']]) {
    fireEvent.click(screen.getByText(label,{exact:true}))
    const input=screen.getByPlaceholderText(placeholder)
    fireEvent.change(input,{target:{value:`Edited ${field}`}})
    fireEvent.keyDown(input,{key:'Enter'})
    await waitFor(()=>expect(updatePhoto).toHaveBeenCalledWith('media-1',{[field]:`Edited ${field}`}))
    await waitFor(()=>expect(screen.queryByPlaceholderText(placeholder)).toBeNull())
    fireEvent.click(screen.getByText(`Edited ${field}`,{exact:true}))
    fireEvent.keyDown(screen.getByPlaceholderText(placeholder),{key:'Escape'})
  }
})
