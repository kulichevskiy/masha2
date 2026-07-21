'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { newId } from '@/lib/id'
import { createPhotosFromUploads } from '../actions'

// Read a file's intrinsic pixel dimensions in the browser before upload, so the
// public feed can render it at its natural aspect ratio without cropping.
// `imageOrientation: 'from-image'` applies EXIF orientation, so a rotated photo
// reports its *displayed* dimensions — matching how the browser renders <img>
// (image-orientation: from-image) and how the backfill script stores them.
// Returns nulls if the browser cannot decode the image — the feed falls back to
// a neutral aspect ratio for those.
async function measureImage(
  file: File
): Promise<{ width: number | null; height: number | null }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  } catch {
    return { width: null, height: null }
  }
}

export function PhotoUploadDropzone() {
  const router = useRouter()
  // Namespace every batch under a unique `photos/<uuid>/` prefix so two files
  // that happen to share a filename (e.g. `IMG_1234.jpg` from two shoots) get
  // distinct object keys and coexist instead of colliding. The original
  // filename stays intact and readable inside the key. Bumped after each
  // successful batch so a second batch in the same page session also can't
  // collide. `key={prefix}` remounts UploadSession on each batch so it gets a
  // fresh `useSupabaseUpload` instance (empty `successes`/`files`) instead of
  // mutating `path` on a hook whose `successes` accumulates across batches —
  // mirrors the workshop/gift uploaders' sessionId-keyed pattern.
  const [prefix, setPrefix] = useState<string>(() => `photos/${newId()}`)

  return (
    <div className="mb-6">
      <UploadSession
        key={prefix}
        prefix={prefix}
        onBatchComplete={() => {
          setPrefix(`photos/${newId()}`)
          router.refresh()
        }}
      />
    </div>
  )
}

function UploadSession({
  prefix,
  onBatchComplete,
}: {
  prefix: string
  onBatchComplete: () => void
}) {
  const uploadHook = useSupabaseUpload({
    bucketName: 'photos',
    path: prefix,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 50,
    upsert: false,
  })

  const { files, isSuccess, successes } = uploadHook
  const firedRef = useRef(false)

  // After successful upload, create database records. This fires once per
  // UploadSession instance: the parent remounts a fresh instance (new prefix,
  // new key) for the next batch, so there is no accumulated `successes` state
  // to guard against here.
  useEffect(() => {
    if (firedRef.current) return
    if (!isSuccess || successes.length === 0) return
    firedRef.current = true

    // Measure each uploaded file's intrinsic dimensions, then create the DB
    // records. The hook reports successes by filename; the full object key
    // is that filename under the batch prefix (`photos/<uuid>/IMG_1234.jpg`).
    Promise.all(
      successes.map(async (fileName) => {
        const file = files.find((f) => f.name === fileName)
        const { width, height } = file
          ? await measureImage(file)
          : { width: null, height: null }
        return { storagePath: `${prefix}/${fileName}`, width, height }
      })
    )
      .then((uploads) => createPhotosFromUploads(uploads))
      .then(() => {
        onBatchComplete()
      })
      .catch((error) => {
        console.error('Failed to create photo records:', error)
        firedRef.current = false
      })
  }, [isSuccess, successes, files, prefix, onBatchComplete])

  return (
    <Dropzone {...uploadHook}>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  )
}
