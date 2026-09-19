'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PhotoUploader, publicPhotoUrl } from './photo-uploader'
import { updateHomeStory } from '../actions'
import {
  focusPosition,
  type HomeStoryContent,
  type StoryFocus,
  type StoryKey,
  type StorySection,
} from '@/lib/home-story-content'

// Editor for the home story page. The whole record is one client form: edits
// live in local state and persist on Save, like the workshop tab.
//
// The layout owns the slots — how many photographs a section holds, where its
// link goes, what shape it is cropped to — so this form only offers the fields
// each section actually shows. Clearing a field puts the shipped wording back
// rather than blanking the page.
//
// Each photo slot carries two sliders for the point the crop keeps in view,
// with a live preview in the slot's own shape. Full-bleed frames preview at a
// phone's proportions, because that is the only place their crop bites: on a
// desktop they are wider than the photograph.

type FieldKey = 'label' | 'heading' | 'body' | 'cta' | 'link'

type PhotoSpec = {
  label: string
  // Tailwind aspect class of the preview — the shape the page crops to.
  ratio: string
  hint?: string
}

type SectionSpec = {
  key: StoryKey
  title: string
  note?: string
  fields: { key: FieldKey; label: string; multiline?: boolean }[]
  photos: PhotoSpec[]
}

const PHONE_BLEED: Omit<PhotoSpec, 'label'> = {
  ratio: 'aspect-[9/16]',
  hint: 'Превью в пропорциях телефона — там кадр обрезается сильнее всего.',
}

const HEADING = { key: 'heading' as const, label: 'Заголовок (перенос строки = новая строка)', multiline: true }
const BODY = { key: 'body' as const, label: 'Текст (пустая строка = новый абзац)', multiline: true }
const LABEL = { key: 'label' as const, label: 'Надпись над заголовком' }

const SECTIONS: SectionSpec[] = [
  {
    key: 'hero',
    title: '1 · Первый экран',
    fields: [
      LABEL,
      HEADING,
      BODY,
      { key: 'cta', label: 'Кнопка (ведёт на /book)' },
      { key: 'link', label: 'Ссылка-стрелка (ведёт к разделу «работы»)' },
    ],
    photos: [{ label: 'Кадр на весь экран', ...PHONE_BLEED }],
  },
  {
    key: 'people',
    title: '2 · Люди',
    fields: [LABEL, HEADING, BODY],
    photos: [
      { label: 'Левый кадр', ratio: 'aspect-[4/5]' },
      { label: 'Средний кадр', ratio: 'aspect-[4/5]' },
      { label: 'Правый кадр', ratio: 'aspect-[4/5]' },
    ],
  },
  {
    key: 'session',
    title: '3 · Съёмка',
    fields: [LABEL, HEADING, BODY, { key: 'link', label: 'Ссылка-стрелка (ведёт на /book)' }],
    photos: [{ label: 'Кадр справа', ratio: 'aspect-[3/4]' }],
  },
  {
    key: 'work',
    title: '4 · Работы',
    note: 'Фотографии в этом блоке берутся из начала лент «Портреты», «Дети» и «Editorial» — порядок меняется на вкладке «Фото». Пока в ленте Editorial ничего не отмечено, её строка стоит без кадров.',
    fields: [LABEL],
    photos: [],
  },
  {
    key: 'video',
    title: '5 · Видео',
    note: 'Кадр и длительность берутся из первого ролика в ленте «Видео».',
    fields: [HEADING, BODY, { key: 'link', label: 'Ссылка-стрелка (ведёт на /video)' }],
    photos: [],
  },
  {
    key: 'behind',
    title: '6 · За камерой',
    fields: [LABEL, HEADING, BODY],
    photos: [{ label: 'Портрет Марии', ratio: 'aspect-[4/5]' }],
  },
  {
    key: 'workshops',
    title: '7 · Воркшопы',
    note: 'Пока воркшоп анонсирован, под текстом сами появляются его название, даты и места, а подпись у ссылки берётся с баннера.',
    fields: [LABEL, HEADING, BODY, { key: 'link', label: 'Ссылка-стрелка, когда воркшопа нет' }],
    photos: [{ label: 'Кадр справа', ratio: 'aspect-[3/2]' }],
  },
  {
    key: 'invitation',
    title: '8 · Приглашение',
    fields: [
      LABEL,
      HEADING,
      { key: 'cta', label: 'Кнопка (ведёт на /book)' },
      { key: 'link', label: 'Ссылка-стрелка (письмо Марии)' },
    ],
    photos: [{ label: 'Кадр на весь экран', ...PHONE_BLEED }],
  },
]

export function HomeTab({
  content,
  previews,
  supabaseUrl,
}: {
  content: HomeStoryContent
  // The feed frame behind each slot, for the preview while nothing is pinned.
  previews: Record<StoryKey, (string | null)[]>
  supabaseUrl: string
}) {
  const [state, setState] = useState<HomeStoryContent>(content)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patchSection = (key: StoryKey, patch: Partial<StorySection>) => {
    setState((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  const patchPhoto = (key: StoryKey, index: number, patch: Partial<{ path: string; alt: string; focus: StoryFocus }>) => {
    setState((current) => ({
      ...current,
      [key]: {
        ...current[key],
        photos: current[key].photos.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)),
      },
    }))
  }

  const patchCategory = (index: number, patch: Partial<{ title: string; text: string; cta: string }>) => {
    setState((current) => ({
      ...current,
      work: {
        ...current.work,
        categories: current.work.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
      },
    }))
  }

  const persist = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateHomeStory(state)
        setSavedAt(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="sticky top-0 z-10 bg-background border-b border-border py-3 -mx-4 px-4 sm:-mx-0 sm:px-0 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground m-0">
          Тексты и кадры главной страницы. Пустое поле — вернётся текст по умолчанию.
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-destructive">{error}</span>}
          {savedAt && !error && (
            <span className="text-xs text-muted-foreground">Сохранено {savedAt.toLocaleTimeString('ru')}</span>
          )}
          <Button onClick={persist} disabled={pending} size="sm">
            {pending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {SECTIONS.map((spec) => {
        const section = state[spec.key]
        return (
          <section key={spec.key} className="flex flex-col gap-4 pb-6 border-b border-border">
            <h2 className="text-lg font-medium">{spec.title}</h2>
            {spec.note && <p className="text-sm text-muted-foreground m-0">{spec.note}</p>}

            {spec.fields.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                value={section[field.key]}
                multiline={field.multiline}
                onChange={(value) => patchSection(spec.key, { [field.key]: value })}
              />
            ))}

            {spec.key === 'work' &&
              state.work.categories.map((category, index) => (
                <div key={index} className="border border-border rounded-md p-4 flex flex-col gap-3">
                  <Field
                    label="Название"
                    value={category.title}
                    onChange={(value) => patchCategory(index, { title: value })}
                  />
                  <Field
                    label="Описание"
                    value={category.text}
                    multiline
                    onChange={(value) => patchCategory(index, { text: value })}
                  />
                  <Field
                    label="Подпись у ссылки"
                    value={category.cta}
                    onChange={(value) => patchCategory(index, { cta: value })}
                  />
                </div>
              ))}

            {spec.photos.map((photoSpec, index) => {
              const photo = section.photos[index]
              const src = photo?.path ? publicPhotoUrl(supabaseUrl, photo.path) : previews[spec.key]?.[index] ?? null
              return (
                <div key={index} className="flex flex-col gap-2">
                  <Label>{photoSpec.label}</Label>
                  <p className="text-xs text-muted-foreground m-0">
                    Пока фотография не выбрана, кадр берётся из начала ленты.
                  </p>
                  <PhotoUploader
                    folder="home"
                    supabaseUrl={supabaseUrl}
                    currentPath={photo?.path || null}
                    onUploaded={(path) => patchPhoto(spec.key, index, { path })}
                    onClear={() => patchPhoto(spec.key, index, { path: '' })}
                  />
                  <Field
                    label="Описание кадра (alt)"
                    value={photo?.alt ?? ''}
                    onChange={(value) => patchPhoto(spec.key, index, { alt: value })}
                  />
                  {photo && (
                    <FocusEditor
                      id={`${spec.key}-${index}`}
                      photo={photo}
                      src={src}
                      ratio={photoSpec.ratio}
                      hint={photoSpec.hint}
                      onChange={(focus) => patchPhoto(spec.key, index, { focus })}
                    />
                  )}
                </div>
              )
            })}
          </section>
        )
      })}

      <div className="flex justify-end">
        <Button onClick={persist} disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </div>
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
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="border border-input rounded-md px-3 py-2 text-sm bg-transparent outline-none focus:border-ring resize-y font-mono"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// The point the crop keeps in view. Two sliders, and the frame itself redrawn
// on every move so the author sees the crop, not a number.
function FocusEditor({
  id,
  photo,
  src,
  ratio,
  hint,
  onChange,
}: {
  id: string
  photo: StorySection['photos'][number]
  src: string | null
  ratio: string
  hint?: string
  onChange: (focus: StoryFocus) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-start">
      <div className={`relative overflow-hidden bg-muted ${ratio} w-40`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: focusPosition(photo) }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
            В ленте пока нет кадра для этого места
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs text-muted-foreground">Что оставить в кадре</Label>
        <Slider
          id={`${id}-x`}
          label="По горизонтали"
          value={photo.focus.x}
          onChange={(x) => onChange({ ...photo.focus, x })}
        />
        <Slider
          id={`${id}-y`}
          label="По вертикали"
          value={photo.focus.y}
          onChange={(y) => onChange({ ...photo.focus, y })}
        />
        {hint && <p className="text-xs text-muted-foreground m-0">{hint}</p>}
      </div>
    </div>
  )
}

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Label htmlFor={id} className="w-32 shrink-0 text-xs">
        {label}
      </Label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{value}%</span>
    </div>
  )
}
