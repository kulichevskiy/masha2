'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/rich-text-editor'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import {
  updateGiftCertificate,
  deleteGiftCertificateRequest,
} from '@/app/gift/actions'
import type { GiftCertificate, Amount, GalleryItem } from '@/app/gift/data'

// Gift-certificate admin editor. The whole record is a single client form:
// edits live in local state and persist on Save. Photo uploads go through the
// supabase upload hook directly to the `photos` bucket under the `gift/` prefix.

type Order = {
  id: string
  email: string
  amount: string | null
  created_at: string
}

type Props = {
  giftCertificate: GiftCertificate
  orders: Order[]
  supabaseUrl: string
}

function publicUrl(supabaseUrl: string, path: string | null | undefined): string | null {
  if (!path) return null
  return `${supabaseUrl}/storage/v1/object/public/photos/${path}`
}

// Ephemeral client-side id stitched onto list items whose row hosts an init-
// time-only child component — RichTextEditor (Tiptap content is set only at
// init) and PhotoUploader (UploadSession owns a per-row sessionId / upload
// state). Without a stable key, React's index-based reuse would swap a
// neighbouring row's editor document or in-flight upload onto a different entry
// after a reorder. The _id travels with the item across move/patch operations
// and is stripped before persisting to JSONB.
type WithId<T> = T & { _id: string }
type LocalAmount = WithId<Amount>
type LocalGalleryItem = WithId<GalleryItem>
type LocalState = {
  is_visible: boolean
  body: string | null
  amounts: LocalAmount[]
  gallery: LocalGalleryItem[]
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

function withId<T>(item: T): WithId<T> {
  return { ...item, _id: newId() }
}

function stripId<T extends { _id: string }>(item: T): Omit<T, '_id'> {
  const { _id: _drop, ...rest } = item
  return rest
}

export function GiftTab({ giftCertificate, orders, supabaseUrl }: Props) {
  const [state, setState] = useState<LocalState>(() => ({
    is_visible: giftCertificate.is_visible,
    body: giftCertificate.body,
    amounts: giftCertificate.amounts.map(withId),
    gallery: giftCertificate.gallery.map(withId),
  }))
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = (patch: Partial<LocalState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }

  const persist = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateGiftCertificate({
          is_visible: state.is_visible,
          body: state.body,
          amounts: state.amounts.map(stripId),
          gallery: state.gallery.map(stripId),
        })
        setSavedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  const toggleVisible = (checked: boolean) => {
    setState((prev) => ({ ...prev, is_visible: checked }))
    startTransition(async () => {
      try {
        await updateGiftCertificate({ is_visible: checked })
        setSavedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Visibility + save bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border py-3 -mx-4 px-4 sm:-mx-0 sm:px-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Switch
            id="gift-visible"
            checked={state.is_visible}
            onCheckedChange={toggleVisible}
            disabled={pending}
          />
          <Label htmlFor="gift-visible" className="cursor-pointer">
            {state.is_visible ? 'Видим публично' : 'Скрыт'}
          </Label>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-destructive">{error}</span>}
          {savedAt && !error && (
            <span className="text-xs text-muted-foreground">
              Сохранено {savedAt.toLocaleTimeString('ru')}
            </span>
          )}
          <Button onClick={persist} disabled={pending} size="sm">
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <Section title="Текст">
        <div className="flex flex-col gap-1.5">
          <Label>Описание (rich text)</Label>
          <RichTextEditor
            value={state.body ?? ''}
            onChange={(html) => save({ body: html || null })}
          />
        </div>
      </Section>

      {/* Amounts */}
      <Section title="Номиналы">
        <ListEditor
          items={state.amounts}
          onChange={(amounts) => save({ amounts })}
          empty={(): LocalAmount => withId({ id: newId(), price: '' })}
          render={(amount, onPatch) => (
            <Field
              label="Сумма"
              value={amount.price}
              onChange={(v) => onPatch({ price: v })}
            />
          )}
          addLabel="Добавить номинал"
        />
      </Section>

      {/* Gallery */}
      <Section title="Галерея">
        <ListEditor
          items={state.gallery}
          onChange={(gallery) => save({ gallery })}
          empty={(): LocalGalleryItem => withId({ photo_path: '' })}
          render={(item, onPatch) => (
            <PhotoUploader
              currentPath={item.photo_path || null}
              onUploaded={(path) => onPatch({ photo_path: path })}
              onClear={() => onPatch({ photo_path: '' })}
              supabaseUrl={supabaseUrl}
            />
          )}
          // The public /gift page renders the first photo as a large hero and
          // the rest as a mosaic — surface that ordering intent in the editor.
          badge={(i) =>
            i === 0 ? (
              <span
                data-testid="gallery-hero-badge"
                className="self-start text-[11px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5"
              >
                Большое фото
              </span>
            ) : null
          }
          dividerBefore={(i, total) =>
            i === 1 && total >= 2 ? (
              <div
                data-testid="gallery-mosaic-divider"
                className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground/70"
              >
                <span className="h-px flex-1 bg-border" />
                мозаика
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null
          }
          addLabel="Добавить фото"
        />
      </Section>

      {/* Orders list */}
      <Section title="Заказы">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Заказов пока нет.</p>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </Section>
    </div>
  )
}

// --- helpers --------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 pb-6 border-b border-border">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

type ListEditorProps<T> = {
  items: T[]
  onChange: (items: T[]) => void
  empty: () => T
  render: (item: T, onPatch: (patch: Partial<T>) => void) => React.ReactNode
  addLabel: string
  // Optional presentation-only chrome keyed off an item's position. `badge`
  // renders inside the item container (e.g. a hero marker on the first item);
  // `dividerBefore` renders above the container (e.g. a section divider).
  badge?: (index: number, total: number) => React.ReactNode
  dividerBefore?: (index: number, total: number) => React.ReactNode
}

function ListEditor<T extends object>({
  items,
  onChange,
  empty,
  render,
  addLabel,
  badge,
  dividerBefore,
}: ListEditorProps<T>) {
  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    onChange(next)
  }
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, empty()])
  const patch = (i: number, p: Partial<T>) => {
    const next = [...items]
    next[i] = { ...(items[i] as object), ...(p as object) } as T
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        // Prefer the stable per-item _id over the index so that components
        // with init-only internal state keep their identity through reorders.
        const itemId = (item as { _id?: string })._id
        const key = itemId ?? i
        const divider = dividerBefore?.(i, items.length)
        const itemBadge = badge?.(i, items.length)
        return (
          <div key={key} className="flex flex-col gap-3">
            {divider}
            <div className="border border-border rounded-md p-3 flex flex-col gap-2">
              {itemBadge}
              {render(item, (p) => patch(i, p))}
              <div className="flex justify-end gap-1.5 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(i)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

function PhotoUploader({
  currentPath,
  onUploaded,
  onClear,
  supabaseUrl,
}: {
  currentPath: string | null
  onUploaded: (path: string) => void
  onClear: () => void
  supabaseUrl: string
}) {
  // Each upload runs inside a fresh UploadSession instance keyed by sessionId.
  // After a successful upload we bump sessionId so the inner component
  // unmounts and remounts — the supabase upload hook re-initialises with
  // empty `successes` / `files`, which avoids `isSuccess` flipping to true the
  // moment the user drops a second file (and hiding the upload controls).
  // The per-session id doubles as the storage key prefix so filenames that
  // collide across sessions (e.g. `IMG_0001.jpg`) don't overwrite each other.
  const [sessionId, setSessionId] = useState<string>(() => newId())
  const currentUrl = publicUrl(supabaseUrl, currentPath)

  return (
    <div className="flex flex-col gap-3">
      {currentUrl && (
        <div className="flex items-center gap-3 border border-border rounded-md p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt=""
            className="w-20 h-20 object-cover rounded border"
          />
          <div className="flex-1 text-xs text-muted-foreground truncate">
            {currentPath}
          </div>
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
  prefix,
  onUploaded,
}: {
  prefix: string
  onUploaded: (storagePath: string) => void
}) {
  const upload = useSupabaseUpload({
    bucketName: 'photos',
    path: `gift/${prefix}`,
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
    onUploaded(`gift/${prefix}/${successes[0]}`)
  }, [successes, prefix, onUploaded])

  return (
    <Dropzone {...upload}>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  const [pending, startTransition] = useTransition()
  const remove = (id: string, email: string) => {
    if (!confirm(`Удалить заказ от «${email}»?`)) return
    startTransition(async () => {
      await deleteGiftCertificateRequest(id)
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Дата</th>
            <th className="py-2 pr-3 font-medium">Email</th>
            <th className="py-2 pr-3 font-medium">Сумма</th>
            <th className="py-2 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b align-top">
              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(o.created_at).toLocaleString('ru')}
              </td>
              <td className="py-2 pr-3">
                <a
                  href={`mailto:${o.email}`}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  {o.email}
                </a>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{o.amount ?? '—'}</td>
              <td className="py-2 pr-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(o.id, o.email)}
                  disabled={pending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
