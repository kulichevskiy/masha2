'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { newId } from '@/lib/id'
import { createClient } from '@/lib/supabase/client'
import { prepareMediaUpload } from '@/lib/media-upload'
import { uploadImmutableObject } from '@/lib/immutable-storage-upload'
import { createPhotosFromUploads } from '../actions'

const supabase = createClient()
const PHOTO_MAX_BYTES = 10 * 1024 * 1024

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
  const [sessionId, setSessionId] = useState<string>(() => newId())

  return (
    <div className="mb-6">
      <UploadSession
        key={sessionId}
        sessionId={sessionId}
        onBatchComplete={() => {
          setSessionId(newId())
          router.refresh()
        }}
      />
    </div>
  )
}

function UploadSession({
  sessionId,
  onBatchComplete,
}: {
  sessionId: string
  onBatchComplete: () => void
}) {
  const preparedRef = useRef(new Map<File, Awaited<ReturnType<typeof prepareMediaUpload>>>())
  const prepareFiles = useCallback(async (files: File[]) => {
    const prepared = await Promise.all(files.map((file) => prepareMediaUpload(file)))
    files.forEach((file, index) => preparedRef.current.set(file, prepared[index]))
  }, [])

  const resolveUploadTarget = useCallback((file: File) =>
    file.type === 'video/mp4'
      ? {
          bucketName: 'videos',
          objectPath: `videos/${sessionId}/${file.name}`,
          upload: (source: File) => uploadImmutableObject(
            supabase, 'videos', `videos/${sessionId}/${file.name}`, source, 'video/mp4'
          ),
        }
      : { bucketName: 'photos', objectPath: `photos/${sessionId}/${file.name}` },
  [sessionId])

  const uploadHook = useSupabaseUpload({
    bucketName: 'photos',
    path: `photos/${sessionId}`,
    allowedMimeTypes: ['image/*', 'video/mp4'],
    maxFileSize: 25 * 1024 * 1024,
    maxFiles: 50,
    upsert: false,
    validator: (file) =>
      file.type.startsWith('image/') && file.size > PHOTO_MAX_BYTES
        ? { code: 'file-too-large', message: 'Фотография больше чем 10 МБ' }
        : null,
    prepareFiles,
    resolveUploadTarget,
  })

  const { files, isSuccess, successes, failUploads } = uploadHook
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
    const createdObjects: { bucket: string; path: string }[] = successes.map((fileName) => {
      const file = files.find((candidate) => candidate.name === fileName)
      return { bucket: file?.type === 'video/mp4' ? 'videos' : 'photos', path: `${file?.type === 'video/mp4' ? 'videos' : 'photos'}/${sessionId}/${fileName}` }
    })

    const finishBatch = async () => {
      const uploads = []
      for (const fileName of successes) {
        const file = files.find((f) => f.name === fileName)
        if (!file) throw new Error(`Не найден исходный файл ${fileName}`)

        const prepared = preparedRef.current.get(file)
        if (!prepared) throw new Error(`Файл ${fileName} не был подготовлен`)
        if (prepared.kind === 'photo') {
          uploads.push({
            storagePath: `photos/${sessionId}/${fileName}`,
            kind: 'photo' as const,
            width: prepared.width,
            height: prepared.height,
          })
          continue
        }

        const posterName = fileName.replace(/\.[^/.]+$/, '') + '.poster.jpg'
        const posterPath = `videos/${sessionId}/${posterName}`
        const { error } = await uploadImmutableObject(
          supabase, 'videos', posterPath, prepared.poster, 'image/jpeg'
        )
        if (error) throw new Error(`Failed to upload video poster: ${error.message}`)
        createdObjects.push({ bucket: 'videos', path: posterPath })

        uploads.push({
          storagePath: `videos/${sessionId}/${fileName}`,
          kind: 'video' as const,
          posterPath,
          durationSeconds: prepared.durationSeconds,
          width: prepared.width,
          height: prepared.height,
        })
      }
      await createPhotosFromUploads(uploads)
    }

    finishBatch()
      .then(() => {
        onBatchComplete()
      })
      .catch(async (error) => {
        console.error('Failed to create photo records:', error)
        await Promise.all(
          ['photos', 'videos'].map(async (bucket) => {
            const paths = createdObjects.filter((object) => object.bucket === bucket).map((object) => object.path)
            if (paths.length) await supabase.storage.from(bucket).remove(paths)
          })
        )
        failUploads(successes, error instanceof Error ? error.message : 'Не удалось завершить загрузку')
        firedRef.current = false
      })
  }, [isSuccess, successes, files, sessionId, onBatchComplete, failUploads])

  return (
    <Dropzone {...uploadHook}>
      <DropzoneEmptyState media />
      <DropzoneContent media />
    </Dropzone>
  )
}
