'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
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
  const uploadHook = useSupabaseUpload({
    bucketName: 'photos',
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
        // records. File names equal storage paths when no path is specified.
        Promise.all(
          newSuccesses.map(async (storagePath) => {
            const file = files.find((f) => f.name === storagePath)
            const { width, height } = file
              ? await measureImage(file)
              : { width: null, height: null }
            return { storagePath, width, height }
          })
        )
          .then((uploads) => createPhotosFromUploads(uploads))
          .then(() => {
            // Clear files to reset dropzone state
            setFiles([])
            processedSuccessesRef.current.clear()

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
  }, [isSuccess, successes, router, setFiles, files])

  return (
    <div className="mb-6">
      <Dropzone {...uploadHook}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  )
}
