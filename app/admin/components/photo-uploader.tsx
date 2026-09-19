'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { newId } from '@/lib/id'

// One-photo picker used by the content tabs: shows what is set, lets it be
// replaced or cleared. Files land in the `photos` bucket under `folder/`.

export function publicPhotoUrl(supabaseUrl: string, path: string | null | undefined): string | null {
  if (!path) return null
  return `${supabaseUrl}/storage/v1/object/public/photos/${path}`
}

export function PhotoUploader({
  currentPath,
  onUploaded,
  onClear,
  supabaseUrl,
  folder = 'workshop',
}: {
  currentPath: string | null
  onUploaded: (path: string) => void
  onClear: () => void
  supabaseUrl: string
  folder?: string
}) {
  // Each upload runs inside a fresh UploadSession instance keyed by sessionId.
  // After a successful upload we bump sessionId so the inner component
  // unmounts and remounts — the supabase upload hook re-initialises with
  // empty `successes` / `files`, which avoids `isSuccess` flipping to true the
  // moment the user drops a second file (and hiding the upload controls).
  // The per-session id doubles as the storage key prefix so filenames that
  // collide across sessions (e.g. `IMG_0001.jpg`) don't overwrite each other.
  const [sessionId, setSessionId] = useState<string>(() => newId())
  const currentUrl = publicPhotoUrl(supabaseUrl, currentPath)

  return (
    <div className="flex flex-col gap-3">
      {currentUrl && (
        <div className="flex items-center gap-3 border border-border rounded-md p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="" className="w-20 h-20 object-cover rounded border" />
          <div className="flex-1 text-xs text-muted-foreground truncate">{currentPath}</div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <UploadSession
        key={sessionId}
        folder={folder}
        prefix={sessionId}
        onUploaded={(path) => {
          onUploaded(path)
          setSessionId(newId())
        }}
      />
    </div>
  )
}

function UploadSession({
  folder,
  prefix,
  onUploaded,
}: {
  folder: string
  prefix: string
  onUploaded: (storagePath: string) => void
}) {
  const upload = useSupabaseUpload({
    bucketName: 'photos',
    path: `${folder}/${prefix}`,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 1,
    upsert: false,
  })

  const { successes } = upload
  const firedRef = useRef(false)
  useEffect(() => {
    if (firedRef.current) return
    if (successes.length === 0) return
    firedRef.current = true
    onUploaded(`${folder}/${prefix}/${successes[0]}`)
  }, [successes, folder, prefix, onUploaded])

  return (
    <Dropzone {...upload}>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  )
}
