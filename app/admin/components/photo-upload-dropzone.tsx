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
  // successful batch (see below) so a second batch in the same page session
  // also can't collide. Mirrors the workshop/gift uploaders' sessionId pattern.
  const [prefix, setPrefix] = useState<string>(() => `photos/${newId()}`)
  const uploadHook = useSupabaseUpload({
    bucketName: 'photos',
    path: prefix,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 50,
    upsert: false,
  })

  const { files, setFiles, onUpload, isSuccess, successes } = uploadHook
  const processedSuccessesRef = useRef<Set<string>>(new Set())

  // After successful upload, create database records
  useEffect(() => {
    if (isSuccess && successes.length > 0) {
      // Filter out already processed successes
      const newSuccesses = successes.filter(
        (success) => !processedSuccessesRef.current.has(success)
      )

      if (newSuccesses.length > 0) {
        // Mark as processed
        newSuccesses.forEach((success) => processedSuccessesRef.current.add(success))

        // Measure each uploaded file's intrinsic dimensions, then create the DB
        // records. The hook reports successes by filename; the full object key
        // is that filename under the batch prefix (`photos/<uuid>/IMG_1234.jpg`).
        Promise.all(
          newSuccesses.map(async (fileName) => {
            const file = files.find((f) => f.name === fileName)
            const { width, height } = file
              ? await measureImage(file)
              : { width: null, height: null }
            return { storagePath: `${prefix}/${fileName}`, width, height }
          })
        )
          .then((uploads) => createPhotosFromUploads(uploads))
          .then(() => {
            // Clear files to reset dropzone state
            setFiles([])
            processedSuccessesRef.current.clear()

            // Rotate the prefix so a second batch in this same page session
            // can't collide with the first (mirrors workshop's sessionId bump).
            setPrefix(`photos/${newId()}`)

            // Refresh the page to show new photos
            router.refresh()
          })
          .catch((error) => {
            console.error('Failed to create photo records:', error)
            // Remove from processed set so it can be retried
            newSuccesses.forEach((success) => processedSuccessesRef.current.delete(success))
          })
      }
    }
  }, [isSuccess, successes, router, setFiles, files, prefix])

  return (
    <div className="mb-6">
      <Dropzone {...uploadHook}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  )
}
