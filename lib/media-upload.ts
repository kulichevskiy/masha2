export type PreparedMediaUpload =
  | {
      kind: 'photo'
      width: number | null
      height: number | null
    }
  | {
      kind: 'video'
      width: number
      height: number
      durationSeconds: number
      poster: Blob
    }

const VIDEO_READ_TIMEOUT_MS = 10_000

export function isMp4File(file: File): boolean {
  return file.type.toLowerCase() === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
}

async function measureImage(file: File): Promise<PreparedMediaUpload> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const dimensions = { kind: 'photo' as const, width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  } catch {
    return { kind: 'photo', width: null, height: null }
  }
}

function prepareVideo(file: File): Promise<PreparedMediaUpload> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    let settled = false
    const timeout = window.setTimeout(
      () => fail('Не удалось прочитать видео'),
      VIDEO_READ_TIMEOUT_MS
    )

    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadedmetadata', handleMetadata)
      video.removeEventListener('loadeddata', capturePoster)
      video.removeEventListener('error', handleError)
      URL.revokeObjectURL(objectUrl)
    }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }

    const capturePoster = () => {
      if (settled) return
      const width = video.videoWidth
      const height = video.videoHeight
      const durationSeconds = video.duration
      if (!width || !height || !Number.isFinite(durationSeconds)) {
        fail('Не удалось прочитать метаданные видео')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        fail('Не удалось создать постер видео')
        return
      }
      context.drawImage(video, 0, 0, width, height)
      canvas.toBlob(
        (poster) => {
          if (!poster) {
            fail('Не удалось создать постер видео')
            return
          }
          settled = true
          cleanup()
          resolve({ kind: 'video', width, height, durationSeconds, poster })
        },
        'image/jpeg',
        0.9
      )
    }

    const handleMetadata = () => {
      // Metadata provides duration and intrinsic dimensions. The decoded first
      // frame may arrive in the same event turn or in loadeddata immediately after.
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        capturePoster()
      } else {
        video.addEventListener('loadeddata', capturePoster, { once: true })
      }
    }

    const handleError = () => fail('Не удалось прочитать видео')

    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.addEventListener('loadedmetadata', handleMetadata, { once: true })
    video.addEventListener('error', handleError, { once: true })
    video.src = objectUrl
    video.load()
  })
}

export function prepareMediaUpload(file: File): Promise<PreparedMediaUpload> {
  return isMp4File(file) ? prepareVideo(file) : measureImage(file)
}
