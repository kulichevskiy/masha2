'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { createPhotosFromUploads } from '../actions'

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

        // Extract storage paths from successful uploads (file names = storage paths when no path specified)
        const storagePaths = newSuccesses

        // Create photo records in database
        createPhotosFromUploads(storagePaths)
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
  }, [isSuccess, successes, router, setFiles])

  return (
    <div className="mb-6">
      <Dropzone {...uploadHook}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  )
}
