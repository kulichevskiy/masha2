import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { ApiError } from './errors'
import { PHOTO_PAGES } from '../photo-pages'

// The same schemas drive runtime validation and the published OpenAPI contract.
export type Schema = {
  type?: string | string[]; properties?: Record<string, Schema>; required?: string[];
  additionalProperties?: boolean; items?: Schema; enum?: (string | number)[];
  minLength?: number; maxLength?: number; minimum?: number; maximum?: number;
  minItems?: number; maxItems?: number; uniqueItems?: boolean; pattern?: string;
  format?: string; description?: string
}
export const string: Schema = { type: 'string', maxLength: 20000 }
const nullableString: Schema = { ...string, type: ['string', 'null'] }
const html: Schema = { ...string, format: 'html', description: 'HTML limited to editor formatting; unsafe tags/attributes are removed.' }
const nullableHtml: Schema = { ...html, type: ['string', 'null'] }
const boolean: Schema = { type: 'boolean' }
export const uuid: Schema = { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
export const version: Schema = { type: 'integer', minimum: 1, maximum: 2147483647 }
const path: Schema = { type: 'string', minLength: 1, maxLength: 1024, format: 'storage-path', description: 'Relative photos-bucket path returned by upload completion (not a URL).' }
const strings: Schema = { type: 'array', items: string, maxItems: 100 }
export const object = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: 'object', properties, required, additionalProperties: false })
const array = (items: Schema): Schema => ({ type: 'array', items, maxItems: 100 })
const gallery = array(object({ photo_path: { ...path, minLength: 0, description: 'Relative photos path; an empty string leaves a placeholder, as in the admin editor.' } }, ['photo_path']))
const faq = array(object({ question: string, answer: html }, ['question', 'answer']))
const tariff = object({ key: { type: 'string', enum: ['short', 'full'] }, name: string, days: string, price: string, summary: string, desc: string, days_list: strings, extras: strings, note: string, featured: boolean }, ['key', 'name', 'days', 'price', 'summary', 'desc', 'days_list', 'extras', 'note', 'featured'])

export const patches: Record<string, Schema> = {
  media: object({ title: nullableString, description: nullableString, alt_text: nullableString, pages: { type: 'array', items: { type: 'string', enum: [...PHOTO_PAGES] }, uniqueItems: true, maxItems: PHOTO_PAGES.length } }),
  tiers: object({ name: string, price_text: string, subtitle: nullableString, description: nullableHtml, is_active: boolean, is_accent: boolean }),
  faq: object({ question: string, answer: html, is_visible: boolean }),
  workshop: object({
    banner_visible: boolean, sales_open: boolean, workshop_number: nullableString, title: nullableString,
    tagline: nullableString, dates: nullableString, location: nullableString, price: nullableString, seats: nullableString,
    hero_photo_path: { ...path, type: ['string', 'null'] }, intro: nullableHtml,
    the_idea_heading: nullableString, the_idea_quote: nullableString, apply_heading: nullableString, apply_intro: nullableHtml,
    closed_heading: nullableString, closed_intro: nullableHtml, tariffs_intro: nullableHtml,
    program: array(object({ day: string, title: string, body: html, photo_path: { ...path, type: ['string', 'null'] } }, ['day', 'title', 'body', 'photo_path'])),
    days: array(object({ day: string, title: string, note: string, bullets: strings }, ['day', 'title', 'note', 'bullets'])),
    tariffs: { ...array(tariff), minItems: 2, maxItems: 2 }, gallery, faq,
  }),
  'gift-certificate': object({ is_visible: boolean, body: nullableHtml, amounts: array(object({ id: { ...string, minLength: 1, maxLength: 100 }, price: string }, ['id', 'price'])), gallery }),
  settings: object({ value: { type: 'string', format: 'email', maxLength: 254, description: 'Notification recipient email (booking_recipient_email).' } }, ['value']),
}
export const creates: Record<string, Schema> = {
  tiers: { ...patches.tiers, required: ['name', 'price_text'] },
  faq: { ...patches.faq, required: ['question', 'answer'] },
}
export const reorderSchema = object({ items: { type: 'array', minItems: 1, maxItems: 100, items: object({ id: uuid, version }, ['id', 'version']) } }, ['items'])
export const uploadSchema = object({
  purpose: { type: 'string', enum: ['media', 'workshop', 'gift'] }, kind: { type: 'string', enum: ['photo', 'video'] },
  filename: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[^/\\\\\\x00-\\x1f]+$' },
  content_type: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4'] },
  size: { type: 'integer', minimum: 1, maximum: 25 * 1024 * 1024 },
  width: { type: ['integer', 'null'], minimum: 1, maximum: 100000 }, height: { type: ['integer', 'null'], minimum: 1, maximum: 100000 },
  duration_seconds: { type: 'number', minimum: 0.001, maximum: 86400 },
}, ['purpose', 'kind', 'filename', 'content_type', 'size', 'width', 'height'])

const sanitizer = unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize, {
  tagNames: ['p', 'br', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'a'],
  attributes: { a: ['href', 'title'] }, protocols: { href: ['http', 'https', 'mailto', 'tel'] }, strip: ['script', 'style'],
}).use(rehypeStringify)

export function validate(schema: Schema, value: unknown, at = 'body'): unknown {
  const fail = () => { throw new ApiError(400, 'invalid_request', `Invalid ${at}`) }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (!types.includes(actual) && !(actual === 'number' && types.includes('integer') && Number.isInteger(value))) fail()
  if (value === null) return value
  if (schema.enum && !schema.enum.includes(value as string)) fail()
  if (typeof value === 'string') {
    if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) fail()
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail()
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail()
    if (schema.format === 'storage-path' && (value.startsWith('/') || value.includes('..') || /[:?#\\\x00-\x1f]/.test(value))) fail()
    if (schema.format === 'html') return String(sanitizer.processSync(value))
  }
  if (typeof value === 'number' && (!Number.isFinite(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) fail()
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) fail()
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail()
    return value.map((v, i) => validate(schema.items!, v, `${at}[${i}]`))
  }
  if (typeof value === 'object') {
    const data = value as Record<string, unknown>
    if (schema.required?.some(key => !(key in data))) fail()
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(data)) {
      if (!Object.hasOwn(schema.properties ?? {}, key)) fail()
      result[key] = validate(schema.properties![key], val, `${at}.${key}`)
    }
    return result
  }
  return value
}

export function validatePatch(resource: string, value: unknown, create = false): Record<string, unknown> {
  const result = validate((create ? creates : patches)[resource], value) as Record<string, unknown>
  if (!Object.keys(result).length) throw new ApiError(400, 'invalid_request', 'Provide at least one editable field')
  for (const key of ['tariffs', 'amounts']) {
    if (Array.isArray(result[key])) {
      const ids = result[key].map((r: Record<string, unknown>) => r[key === 'tariffs' ? 'key' : 'id'])
      if (new Set(ids).size !== ids.length) throw new ApiError(400, 'invalid_request', `Duplicate ${key} identity`)
    }
  }
  return result
}
