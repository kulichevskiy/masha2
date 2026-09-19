'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PhotoUploader } from './photo-uploader'
import { updateHomeStory } from '../actions'
import type { HomeStoryContent, StoryKey, StorySection } from '@/lib/home-story-content'

// Editor for the home story page. The whole record is one client form: edits
// live in local state and persist on Save, like the workshop tab.
//
// The layout owns the slots — how many photographs a section holds, where its
// link goes — so this form only offers the fields each section actually shows.
// Clearing a field puts the shipped wording back rather than blanking the page.

type FieldKey = 'label' | 'heading' | 'body' | 'cta' | 'link'

type SectionSpec = {
  key: StoryKey
  title: string
  note?: string
  fields: { key: FieldKey; label: string; multiline?: boolean }[]
  photos: string[]
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
    photos: ['Кадр на весь экран'],
  },
  {
    key: 'people',
    title: '2 · Люди',
    fields: [LABEL, HEADING, BODY],
    photos: ['Левый кадр', 'Средний кадр', 'Правый кадр'],
  },
  {
    key: 'session',
    title: '3 · Съёмка',
    fields: [LABEL, HEADING, BODY, { key: 'link', label: 'Ссылка-стрелка (ведёт на /book)' }],
    photos: ['Кадр справа'],
  },
  {
    key: 'work',
    title: '4 · Работы',
    note: 'Фотографии в этом блоке берутся из начала лент «Портреты», «Дети» и снова «Портреты» — порядок меняется на вкладке «Фото».',
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
    photos: ['Портрет Марии'],
  },
  {
    key: 'workshops',
    title: '7 · Воркшопы',
    note: 'Пока воркшоп анонсирован, под текстом сами появляются его название, даты и места, а подпись у ссылки берётся с баннера.',
    fields: [LABEL, HEADING, BODY, { key: 'link', label: 'Ссылка-стрелка, когда воркшопа нет' }],
    photos: ['Кадр справа'],
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
    photos: ['Кадр на весь экран'],
  },
]

export function HomeTab({ content, supabaseUrl }: { content: HomeStoryContent; supabaseUrl: string }) {
  const [state, setState] = useState<HomeStoryContent>(content)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patchSection = (key: StoryKey, patch: Partial<StorySection>) => {
    setState((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  const patchPhoto = (key: StoryKey, index: number, patch: Partial<{ path: string; alt: string }>) => {
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

            {spec.photos.map((photoLabel, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Label>{photoLabel}</Label>
                <p className="text-xs text-muted-foreground m-0">
                  Пока фотография не выбрана, кадр берётся из начала ленты.
                </p>
                <PhotoUploader
                  folder="home"
                  supabaseUrl={supabaseUrl}
                  currentPath={section.photos[index]?.path || null}
                  onUploaded={(path) => patchPhoto(spec.key, index, { path })}
                  onClear={() => patchPhoto(spec.key, index, { path: '' })}
                />
                <Field
                  label="Описание кадра (alt)"
                  value={section.photos[index]?.alt ?? ''}
                  onChange={(value) => patchPhoto(spec.key, index, { alt: value })}
                />
              </div>
            ))}
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
