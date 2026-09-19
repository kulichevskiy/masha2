'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createApiToken, getApiAdminData, revokeApiToken } from '../api-actions'
import type { ApiActionResult, ApiAdminData } from '../api-types'

const STATUS = { started: 'Начато', succeeded: 'Выполнено', failed: 'Ошибка' }
function date(value: string | null) {
  return value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'UTC' }) + ' UTC' : '—'
}

export function ApiTab({ initial }: { initial: ApiActionResult<ApiAdminData> }) {
  const [data, setData] = useState(initial.data)
  const [error, setError] = useState(initial.error ?? '')
  const [name, setName] = useState('')
  const [secret, setSecret] = useState<{ value: string; tokenId: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  function load(offset: number) {
    startTransition(async () => {
      setError('')
      try {
        const result = await getApiAdminData(offset)
        if (result.error !== undefined) setError(result.error)
        else setData(result.data)
      } catch {
        setError('Не удалось обновить данные API.')
      }
    })
  }

  function create(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      setError('')
      try {
        const result = await createApiToken(name)
        if (result.error !== undefined) { setError(result.error); return }
        setSecret({ value: result.data.secret, tokenId: result.data.token.id })
        setCopied(false)
        setName('')
        setData((current) => current ? { ...current, tokens: [result.data.token, ...current.tokens] } : current)
      } catch {
        setError('Не удалось создать токен.')
      }
    })
  }

  function revoke(id: string) {
    startTransition(async () => {
      setError('')
      try {
        const result = await revokeApiToken(id)
        if (result.error !== undefined) { setError(result.error); return }
        setData((current) => current ? { ...current, tokens: current.tokens.map((token) => token.id === id ? { ...token, revoked_at: result.data.revokedAt } : token) } : current)
        setSecret((current) => current?.tokenId === id ? null : current)
      } catch {
        setError('Не удалось отозвать токен.')
      }
    })
  }

  return (
    <div className="space-y-8 ph-no-capture ph-mask">
      <section className="rounded-xl border p-5 space-y-4" aria-labelledby="api-tokens-heading">
        <div>
          <h2 id="api-tokens-heading" className="text-xl font-semibold">Токены API</h2>
          <p className="text-sm text-muted-foreground mt-1">Каждый токен даёт полный доступ к сайту и действует до отзыва.</p>
          <a href="/api/docs" className="text-sm underline">Документация API</a>
        </div>
        <form onSubmit={create} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 max-w-sm">
            <label htmlFor="api-token-name" className="block text-sm mb-1">Название токена</label>
            <Input id="api-token-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Например, локальный скрипт" autoComplete="off" />
          </div>
          <Button type="submit" disabled={pending || !data || !!secret || !name.trim()}>Создать токен</Button>
        </form>
        {secret && (
          <div className="rounded-md border p-4 space-y-3 ph-no-capture ph-mask" data-testid="api-token-secret">
            <p className="text-sm">Скопируйте токен сейчас. После скрытия или ухода со страницы увидеть его снова нельзя.</p>
            <label htmlFor="api-token-secret" className="sr-only">Секрет токена</label>
            <textarea id="api-token-secret" readOnly value={secret.value} rows={2} className="w-full font-mono text-sm break-all border rounded-md p-2 ph-no-capture ph-mask" autoComplete="off" spellCheck={false} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={async () => {
                try { await navigator.clipboard.writeText(secret.value); setCopied(true) }
                catch { setError('Не удалось скопировать токен. Выделите и скопируйте его вручную.') }
              }}>{copied ? 'Скопировано' : 'Скопировать'}</Button>
              <Button type="button" variant="outline" onClick={() => setSecret(null)}>Скрыть токен</Button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!data && <Button variant="outline" disabled={pending} onClick={() => load(0)}>Повторить загрузку</Button>}
        {data && (data.tokens.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b"><th className="p-2">Название / префикс</th><th className="p-2">Создан</th><th className="p-2">Последнее использование</th><th className="p-2">Статус</th><th className="p-2"><span className="sr-only">Действия</span></th></tr></thead>
              <tbody>{data.tokens.map((token) => (
                <tr key={token.id} className="border-b">
                  <td className="p-2"><div>{token.name}</div><code className="text-muted-foreground">{token.prefix}…</code></td>
                  <td className="p-2">{date(token.created_at)}</td><td className="p-2">{date(token.last_used_at)}</td>
                  <td className="p-2">{token.revoked_at ? `Отозван: ${date(token.revoked_at)}` : 'Активен'}</td>
                  <td className="p-2">{!token.revoked_at && <Button variant="destructive" disabled={pending} onClick={() => revoke(token.id)} aria-label={`Отозвать токен ${token.name}`}>Отозвать</Button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">Токены ещё не созданы.</p>)}
      </section>
      <section className="space-y-4" aria-labelledby="api-journal-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="api-journal-heading" className="text-xl font-semibold">Журнал изменений API</h2>
          <Button variant="outline" disabled={pending} onClick={() => load(data?.offset ?? 0)}>Обновить</Button>
        </div>
        <p className="text-sm text-muted-foreground">Записи «Начато» ещё выполняются или были прерваны. Время указано в UTC.</p>
        {data && (data.entries.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b">{['Время', 'Токен', 'Операция', 'Объект', 'Результат'].map((title) => <th key={title} className="p-2">{title}</th>)}</tr></thead>
          <tbody>{data.entries.map((entry) => <tr key={entry.id} className="border-b">
            <td className="p-2">{date(entry.created_at)}</td><td className="p-2">{entry.token_name}</td><td className="p-2">{entry.operation}</td>
            <td className="p-2 break-all">{entry.resource}{entry.resource_id ? ` / ${entry.resource_id}` : ''}</td>
            <td className="p-2">{STATUS[entry.status]}{entry.error_code && <div className="text-muted-foreground">{entry.error_code}</div>}</td>
          </tr>)}</tbody>
        </table></div> : <p className="text-sm text-muted-foreground">Записей пока нет.</p>)}
        {data && <div className="flex items-center gap-3">
          <Button variant="outline" disabled={pending || data.offset === 0} onClick={() => load(Math.max(0, data.offset - 25))}>Назад</Button>
          <span className="text-sm">Страница {Math.floor(data.offset / 25) + 1}</span>
          <Button variant="outline" disabled={pending || !data.hasNext} onClick={() => load(data.offset + 25)}>Далее</Button>
        </div>}
      </section>
    </div>
  )
}
