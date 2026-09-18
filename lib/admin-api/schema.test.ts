// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validate, validatePatch, uploadSchema, type Schema } from './schema'
import { expectedVersion, jsonBody, pagination } from './http'
import { makeOpenApi } from './openapi'

const request = (headers: Record<string, string>) => new Request('https://site.test/api/v1/media', { headers })
describe('API input contract', () => {
  it('rejects writable-service fields and hostile nested structures', () => {
    expect(() => validatePatch('media', { version: 9 })).toThrow('Invalid body')
    expect(() => validatePatch('media', { storage_path: 'other.jpg' })).toThrow('Invalid body')
    expect(() => validatePatch('workshop', { gallery: [{ photo_path: 'workshop/x.jpg', secret: true }] })).toThrow('Invalid body.gallery')
    expect(() => validatePatch('workshop', { gallery: [{ photo_path: 'https://evil.test/x.jpg' }] })).toThrow('Invalid body.gallery')
    expect(() => validatePatch('gift-certificate', { amounts: [{ id: 'x', price: '10' }, { id: 'x', price: '20' }] })).toThrow('Duplicate')
    expect(() => validatePatch('media', { pages: ['portraits', 'portraits'] })).toThrow('Invalid body.pages')
    expect(() => validatePatch('media', {})).toThrow('Provide at least')
    expect(() => validatePatch('media', JSON.parse('{"__proto__":{"evil":true}}'))).toThrow('Invalid body')
  })
  it('sanitizes API rich text before it reaches trusted UI rendering', () => {
    const patch = validatePatch('faq', { answer: '<p onclick="evil()">Hi <strong>there</strong><script>evil()</script><a href="javascript:evil()">bad</a><a href="https://example.com">good</a></p>' })
    expect(patch.answer).toBe('<p>Hi <strong>there</strong><a>bad</a><a href="https://example.com">good</a></p>')
    expect(validatePatch('workshop', { program: [{ day: '1', title: 'Day', body: '<img src=x onerror=evil()>ok', photo_path: null }] })).toMatchObject({ program: [{ body: 'ok' }] })
  })
  it('preserves partial updates and requires creation fields', () => {
    expect(validatePatch('workshop', { banner_visible: false })).toEqual({ banner_visible: false })
    expect(validatePatch('media', { title: null, pages: [] })).toEqual({ title: null, pages: [] })
    expect(() => validatePatch('tiers', { name: 'Tier' }, true)).toThrow('Invalid body')
    expect(() => validatePatch('settings', { value: 'not an email' })).toThrow('Invalid body.value')
  })
  it('bounds file declarations without accepting paths as filenames', () => {
    const input = { purpose: 'media', kind: 'photo', filename: 'photo.jpg', content_type: 'image/jpeg', size: 100, width: null, height: null }
    expect(validate(uploadSchema, input)).toEqual(input)
    for (const filename of ['../x', 'x\\y', 'x\n.jpg']) expect(() => validate(uploadSchema, { ...input, filename })).toThrow('Invalid body.filename')
    expect(() => validate(uploadSchema, { ...input, size: Infinity })).toThrow('Invalid body.size')
  })
  it('requires a single strong numeric ETag', () => {
    expect(expectedVersion(request({ 'If-Match': '"12"' }))).toBe(12)
    expect(() => expectedVersion(request({}))).toThrow('Send the ETag')
    for (const value of ['*', 'W/"2"', '2', '"2", "3"', '"0"', '"2147483648"']) expect(() => expectedVersion(request({ 'If-Match': value }))).toThrow('If-Match')
  })
  it('validates bounded JSON and pagination', async () => {
    expect(pagination(new URL('https://site.test?limit=100&offset=200'))).toEqual({ limit: 100, offset: 200 })
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'offset=1.5']) expect(() => pagination(new URL(`https://site.test?${query}`))).toThrow('Invalid')
    await expect(jsonBody(new Request('https://site.test', { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } }))).rejects.toThrow('application/json')
    await expect(jsonBody(new Request('https://site.test', { method: 'POST', body: '{bad', headers: { 'Content-Type': 'application/json' } }))).rejects.toThrow('Malformed')
    await expect(jsonBody(new Request('https://site.test', { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1), headers: { 'Content-Type': 'application/json' } }))).rejects.toThrow('exceeds')
  })
  it('documents legacy UI response content without enforcing stricter input rules', () => {
    const api = makeOpenApi()
    const operation = api.paths['/workshop'].get as { responses: Record<string, { content: { 'application/json': { schema: { properties: { data: Schema } } } } }> }
    const fields = operation.responses['200'].content['application/json'].schema.properties.data.properties!
    expect(validate(fields.gallery, [{ photo_path: '' }])).toEqual([{ photo_path: '' }])
    expect(validate(fields.days, [{ day: '1', title: 'Legacy day' }])).toEqual([{ day: '1', title: 'Legacy day' }])
    expect(validatePatch('workshop', { gallery: [{ photo_path: '' }] })).toEqual({ gallery: [{ photo_path: '' }] })
    expect(() => validatePatch('workshop', { gallery: [{ photo_path: 'https://outside.test/file.jpg' }] })).toThrow('Invalid')
  })

  it('publishes each resource and precondition without a token-management API', () => {
    const api = makeOpenApi()
    expect(api.paths['/media/{id}'].patch).toMatchObject({ parameters: expect.arrayContaining([expect.objectContaining({ name: 'If-Match', required: true })]) })
    expect(api.paths['/workshop-subscribers'].get).toBeTruthy()
    expect(api.paths['/uploads/{id}/complete'].post).toBeTruthy()
    const completion = api.paths['/uploads/{id}/complete'].post as { responses: Record<string, { content: { 'application/json': { schema: { properties: { data: { oneOf: Schema[] } } } } } }> }
    const alternatives = completion.responses['200'].content['application/json'].schema.properties.data.oneOf
    const pageAsset = { storage_path: 'workshop/api/id/source.jpg', bucket: 'photos' }
    const matches = alternatives.filter(schema => { try { validate(schema, pageAsset); return true } catch { return false } })
    expect(matches).toHaveLength(1)
    expect(alternatives[0].required).toEqual(expect.arrayContaining(['id', 'kind']))
    expect(api.paths['/tokens']).toBeUndefined()
    expect(api.security).toEqual([{ bearerAuth: [] }])
  })
})
