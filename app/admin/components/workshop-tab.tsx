'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/rich-text-editor'
import { RichText } from '@/components/rich-text'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { updateWorkshop, deleteWorkshopApplication } from '@/app/workshop/actions'
import type {
  Workshop,
  ProgramDay,
  WorkshopDay,
  GalleryItem,
  FaqItem,
  Tariff,
} from '@/app/workshop/data'

// Workshop admin editor. The whole record is a single client form: edits live
// in local state and persist on Save. Photo uploads go through the supabase
// upload hook directly to the `photos` bucket under the `workshop/` prefix.

type Application = {
  id: string
  name: string
  email: string
  instagram: string | null
  message: string | null
  intake: string | null
  created_at: string
}

type Props = {
  workshop: Workshop
  applications: Application[]
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
// neighbouring row's editor document or in-flight upload onto a different
// workshop entry after a reorder. The _id travels with the item across move/
// patch operations and is stripped before persisting to JSONB.
type WithId<T> = T & { _id: string }
type LocalProgramDay = WithId<ProgramDay>
type LocalFaqItem = WithId<FaqItem>
type LocalGalleryItem = WithId<GalleryItem>
type LocalState = Omit<Workshop, 'program' | 'gallery' | 'faq'> & {
  program: LocalProgramDay[]
  gallery: LocalGalleryItem[]
  faq: LocalFaqItem[]
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

export function WorkshopTab({ workshop, applications, supabaseUrl }: Props) {
  const [state, setState] = useState<LocalState>(() => ({
    ...workshop,
    program: workshop.program.map(withId),
    gallery: workshop.gallery.map(withId),
    faq: workshop.faq.map(withId),
  }))
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = (patch: Partial<LocalState>) => {
    const next = { ...state, ...patch }
    setState(next)
  }

  const persist = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateWorkshop({
          is_visible: state.is_visible,
          workshop_number: state.workshop_number,
          title: state.title,
          tagline: state.tagline,
          dates: state.dates,
          location: state.location,
          price: state.price,
          seats: state.seats,
          hero_photo_path: state.hero_photo_path,
          intro: state.intro,
          the_idea_heading: state.the_idea_heading,
          the_idea_quote: state.the_idea_quote,
          apply_heading: state.apply_heading,
          apply_intro: state.apply_intro,
          program: state.program.map(stripId),
          days: state.days,
          tariffs: state.tariffs,
          gallery: state.gallery.map(stripId),
          faq: state.faq.map(stripId),
        })
        setSavedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  const toggleVisible = (checked: boolean) => {
    const next = { ...state, is_visible: checked }
    setState(next)
    startTransition(async () => {
      try {
        await updateWorkshop({ is_visible: checked })
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
            id="workshop-visible"
            checked={state.is_visible}
            onCheckedChange={toggleVisible}
            disabled={pending}
          />
          <Label htmlFor="workshop-visible" className="cursor-pointer">
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

      {/* Hero meta */}
      <Section title="Шапка">
        <Field
          label="Номер воркшопа"
          value={state.workshop_number ?? ''}
          onChange={(v) => save({ workshop_number: v || null })}
        />
        <Field
          label="Заголовок"
          value={state.title ?? ''}
          onChange={(v) => save({ title: v || null })}
        />
        <Field
          label="Подзаголовок (тагалайн)"
          value={state.tagline ?? ''}
          onChange={(v) => save({ tagline: v || null })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Даты"
            value={state.dates ?? ''}
            onChange={(v) => save({ dates: v || null })}
          />
          <Field
            label="Локация"
            value={state.location ?? ''}
            onChange={(v) => save({ location: v || null })}
          />
          <Field
            label="Цена"
            value={state.price ?? ''}
            onChange={(v) => save({ price: v || null })}
          />
          <Field
            label="Мест"
            value={state.seats ?? ''}
            onChange={(v) => save({ seats: v || null })}
          />
        </div>
      </Section>

      {/* Hero photo */}
      <Section title="Фото шапки">
        <PhotoUploader
          currentPath={state.hero_photo_path}
          onUploaded={(path) => save({ hero_photo_path: path })}
          onClear={() => save({ hero_photo_path: null })}
          supabaseUrl={supabaseUrl}
        />
      </Section>

      {/* Idea */}
      <Section title="01 — The idea">
        <Field
          label="Подзаголовок раздела"
          value={state.the_idea_heading ?? ''}
          onChange={(v) => save({ the_idea_heading: v || null })}
        />
        <Field
          label="Цитата (italic Playfair)"
          value={state.the_idea_quote ?? ''}
          onChange={(v) => save({ the_idea_quote: v || null })}
          multiline
        />
        <div className="flex flex-col gap-1.5">
          <Label>Интро (rich text)</Label>
          <RichTextEditor
            value={state.intro ?? ''}
            onChange={(html) => save({ intro: html || null })}
          />
        </div>
      </Section>

      {/* Program */}
      <Section title="02 — Программа">
        <ListEditor
          items={state.program}
          onChange={(program) => save({ program })}
          empty={(): LocalProgramDay =>
            withId({
              day: 'Day 0X',
              title: '',
              body: '',
              photo_path: null,
            })
          }
          render={(day, onPatch) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Лейбл дня"
                  value={day.day}
                  onChange={(v) => onPatch({ day: v })}
                />
                <Field
                  label="Заголовок"
                  value={day.title}
                  onChange={(v) => onPatch({ title: v })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Описание (rich text)</Label>
                <RichTextEditor
                  value={day.body}
                  onChange={(html) => onPatch({ body: html })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Фото дня</Label>
                <PhotoUploader
                  currentPath={day.photo_path}
                  onUploaded={(path) => onPatch({ photo_path: path })}
                  onClear={() => onPatch({ photo_path: null })}
                  supabaseUrl={supabaseUrl}
                />
              </div>
            </div>
          )}
          addLabel="Добавить день"
        />
      </Section>

      {/* Days — fixed three-column day breakdown (03 on the page). Mirrors the
          fixed Tariffs editor: map over the three day slots, no add/remove. */}
      <Section title="03 — Дни">
        {state.days.map((d, i) => (
          <DayEditor
            key={i}
            index={i}
            day={d}
            onPatch={(patch) =>
              save({
                days: state.days.map((cur, j) =>
                  j === i ? { ...cur, ...patch } : cur
                ),
              })
            }
          />
        ))}
      </Section>

      {/* Tariffs — two fixed tiers (short then full), no add/remove */}
      <Section title="Тарифы">
        {state.tariffs.map((t, i) => (
          <TariffEditor
            key={t.key}
            tariff={t}
            onPatch={(patch) =>
              save({
                tariffs: state.tariffs.map((cur, j) =>
                  j === i ? { ...cur, ...patch } : cur
                ),
              })
            }
          />
        ))}
      </Section>

      {/* Gallery */}
      <Section title="06 — Галерея">
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
          addLabel="Добавить фото"
        />
      </Section>

      {/* FAQ */}
      <Section title="07 — Вопросы">
        <ListEditor
          items={state.faq}
          onChange={(faq) => save({ faq })}
          empty={(): LocalFaqItem => withId({ question: '', answer: '' })}
          render={(item, onPatch) => (
            <div className="flex flex-col gap-3">
              <Field
                label="Вопрос"
                value={item.question}
                onChange={(v) => onPatch({ question: v })}
              />
              <div className="flex flex-col gap-1.5">
                <Label>Ответ (rich text)</Label>
                <RichTextEditor
                  value={item.answer}
                  onChange={(html) => onPatch({ answer: html })}
                />
                {item.answer && (
                  <div className="text-xs text-muted-foreground border-l-2 border-border pl-3 mt-1">
                    <RichText html={item.answer} className="text-xs" />
                  </div>
                )}
              </div>
            </div>
          )}
          addLabel="Добавить вопрос"
        />
      </Section>

      {/* Apply */}
      <Section title="Форма заявки">
        <Field
          label="Заголовок"
          value={state.apply_heading ?? ''}
          onChange={(v) => save({ apply_heading: v || null })}
          multiline
        />
        <div className="flex flex-col gap-1.5">
          <Label>Текст под заголовком (rich text)</Label>
          <RichTextEditor
            value={state.apply_intro ?? ''}
            onChange={(html) => save({ apply_intro: html || null })}
          />
        </div>
      </Section>

      {/* Applications list */}
      <Section title="Заявки">
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Заявок пока нет.</p>
        ) : (
          <ApplicationsTable applications={applications} />
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
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="border border-input rounded-md px-3 py-2 text-sm bg-transparent outline-none focus:border-ring resize-y"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// Editor for a single fixed tariff tier. `key` is the slot identity and is not
// editable. Mirrors the public Tariff shape: Field for the text fields, a
// StringListEditor each for the program days and extras, a featured checkbox.
function TariffEditor({
  tariff,
  onPatch,
}: {
  tariff: Tariff
  onPatch: (patch: Partial<Tariff>) => void
}) {
  return (
    <div className="border border-border rounded-md p-4 flex flex-col gap-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {tariff.key === 'full' ? 'Полный интейк' : 'Короткий интейк'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Название" value={tariff.name} onChange={(v) => onPatch({ name: v })} />
        <Field label="Дни" value={tariff.days} onChange={(v) => onPatch({ days: v })} />
        <Field label="Цена" value={tariff.price} onChange={(v) => onPatch({ price: v })} />
      </div>
      <Field
        label="Кратко (italic)"
        value={tariff.summary}
        onChange={(v) => onPatch({ summary: v })}
        multiline
      />
      <Field
        label="Описание"
        value={tariff.desc}
        onChange={(v) => onPatch({ desc: v })}
        multiline
      />
      <div className="flex flex-col gap-1.5">
        <Label>Дни программы</Label>
        <StringListEditor
          items={tariff.days_list}
          onChange={(days_list) => onPatch({ days_list })}
          placeholder="Day 01 — Seeing"
          addLabel="Добавить день"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Дополнительно</Label>
        <StringListEditor
          items={tariff.extras}
          onChange={(extras) => onPatch({ extras })}
          placeholder="Один пункт"
          addLabel="Добавить пункт"
        />
      </div>
      <Field
        label="Примечание (italic)"
        value={tariff.note}
        onChange={(v) => onPatch({ note: v })}
        multiline
      />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={tariff.featured}
          onChange={(e) => onPatch({ featured: e.target.checked })}
          className="h-4 w-4"
        />
        Выделенный тариф (чёрная карточка)
      </label>
    </div>
  )
}

// Editor for one fixed day slot in the three-day breakdown. Mirrors TariffEditor:
// day label + session title + optional note as Fields, and a StringListEditor
// for the bullet list. No add/remove — the three slots are fixed.
function DayEditor({
  index,
  day,
  onPatch,
}: {
  index: number
  day: WorkshopDay
  onPatch: (patch: Partial<WorkshopDay>) => void
}) {
  return (
    <div className="border border-border rounded-md p-4 flex flex-col gap-4">
      <h3 className="text-sm font-medium text-muted-foreground">День {index + 1}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Лейбл дня"
          value={day.day}
          onChange={(v) => onPatch({ day: v })}
        />
        <Field
          label="Название сессии"
          value={day.title}
          onChange={(v) => onPatch({ title: v })}
        />
      </div>
      <Field
        label="Примечание (опционально)"
        value={day.note}
        onChange={(v) => onPatch({ note: v })}
      />
      <div className="flex flex-col gap-1.5">
        <Label>Пункты</Label>
        <StringListEditor
          items={day.bullets}
          onChange={(bullets) => onPatch({ bullets })}
          placeholder="Один пункт"
          addLabel="Добавить пункт"
        />
      </div>
    </div>
  )
}

type ListEditorProps<T> = {
  items: T[]
  onChange: (items: T[]) => void
  empty: () => T
  render: (item: T, onPatch: (patch: Partial<T> | T) => void) => React.ReactNode
  addLabel: string
}

function ListEditor<T extends object>({
  items,
  onChange,
  empty,
  render,
  addLabel,
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
  const patch = (i: number, p: Partial<T> | T) => {
    const next = [...items]
    next[i] = Array.isArray(p)
      ? (p as T)
      : ({ ...(items[i] as object), ...(p as object) } as T)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        // Prefer the stable per-item _id over the index so that components
        // with init-only internal state (e.g. RichTextEditor / Tiptap) keep
        // their identity through reorders.
        const itemId = (item as { _id?: string })._id
        const key = itemId ?? i
        return (
          <div
            key={key}
            className="border border-border rounded-md p-3 flex flex-col gap-2"
          >
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
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus className="h-4 w-4 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

function StringListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  addLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={it}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, ''])}
        className="self-start"
      >
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
    path: `workshop/${prefix}`,
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
    onUploaded(`workshop/${prefix}/${successes[0]}`)
  }, [successes, prefix, onUploaded])

  return (
    <Dropzone {...upload}>
      <DropzoneEmptyState />
      <DropzoneContent />
    </Dropzone>
  )
}

function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [pending, startTransition] = useTransition()
  const remove = (id: string, name: string) => {
    if (!confirm(`Удалить заявку от «${name}»?`)) return
    startTransition(async () => {
      await deleteWorkshopApplication(id)
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Дата</th>
            <th className="py-2 pr-3 font-medium">Имя</th>
            <th className="py-2 pr-3 font-medium">Email</th>
            <th className="py-2 pr-3 font-medium hidden md:table-cell">Тариф</th>
            <th className="py-2 pr-3 font-medium hidden md:table-cell">Instagram</th>
            <th className="py-2 pr-3 font-medium hidden lg:table-cell">Сообщение</th>
            <th className="py-2 pr-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id} className="border-b align-top">
              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(a.created_at).toLocaleString('ru')}
              </td>
              <td className="py-2 pr-3">{a.name}</td>
              <td className="py-2 pr-3">
                <a
                  href={`mailto:${a.email}`}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  {a.email}
                </a>
              </td>
              <td className="py-2 pr-3 hidden md:table-cell whitespace-nowrap">{a.intake ?? '—'}</td>
              <td className="py-2 pr-3 hidden md:table-cell">{a.instagram ?? '—'}</td>
              <td className="py-2 pr-3 hidden lg:table-cell max-w-md whitespace-pre-wrap">
                {a.message ?? '—'}
              </td>
              <td className="py-2 pr-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(a.id, a.name)}
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
