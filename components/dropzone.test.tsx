import { it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { Dropzone, DropzoneContent } from './dropzone'
afterEach(cleanup)
function props(overrides: Record<string, unknown> = {}) {
  return {
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    files: [
      Object.assign(new File(['photo'], 'one.png', { type: 'image/png' }), {
        errors: [],
        preview: '/one.png',
      }),
    ],
    setFiles: vi.fn(),
    onUpload: vi.fn(),
    loading: false,
    successes: [],
    errors: [],
    maxFiles: 1,
    maxFileSize: 100,
    isSuccess: false,
    isDragActive: false,
    isDragReject: false,
    open: vi.fn(),
    isFocused: false,
    isDragAccept: false,
    isFileDialogActive: false,
    acceptedFiles: [],
    fileRejections: [],
    rootRef: { current: document.createElement('div') },
    inputRef: { current: document.createElement('input') },
    setErrors: vi.fn(),
    failUploads: vi.fn(),
    allowedMimeTypes: [],
    ...overrides,
  } as ComponentProps<typeof Dropzone>
}
it('shows uploaded count and prevents another upload after success', () => {
  render(
    <Dropzone {...props({ isSuccess: true })}>
      <DropzoneContent />
    </Dropzone>,
  )
  expect(screen.getByText(/Успешно загружено 1 фотография/)).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
})
it('shows queue limits and disables invalid uploads', () => {
  const file = Object.assign(new File(['x'], 'invalid.txt'), {
    errors: [{ message: 'Invalid type' }],
  })
  render(
    <Dropzone {...props({ files: [file, file], maxFiles: 1 })}>
      <DropzoneContent media />
    </Dropzone>,
  )
  expect(screen.getByText(/пожалуйста удалите/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Загрузить фото и видео' })).toBeNull()
})
it('renders pending and failed upload states', () => {
  const view = render(
    <Dropzone {...props({ loading: true })}>
      <DropzoneContent />
    </Dropzone>,
  )
  expect(screen.getByText('Загрузка файла...')).toBeTruthy()
  view.rerender(
    <Dropzone {...props({ errors: [{ name: 'one.png', message: 'Storage unavailable' }] })}>
      <DropzoneContent />
    </Dropzone>,
  )
  expect(screen.getByText('Ошибка загрузки: Storage unavailable')).toBeTruthy()
})
