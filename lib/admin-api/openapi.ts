import { creates, patches, reorderSchema, uploadSchema, type Schema } from './schema'
import { resources } from './resources'

const json = (schema: unknown) => ({ 'application/json': { schema } })
const error = { description: 'Request failed; see error.code. Failed preconditions never apply a change.', content: json({ $ref: '#/components/schemas/Error' }) }
const data = (schema: unknown) => ({ type: 'object', required: ['data'], properties: { data: schema } })
const etag = { ETag: { description: 'Quoted integer version for subsequent If-Match.', schema: { type: 'string', example: '"3"' } } }
const readResponse = (schema: unknown) => ({ description: 'Current resource', headers: etag, content: json(data(schema)) })
const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
const versionParameter = { name: 'If-Match', in: 'header', required: true, schema: { type: 'string', pattern: '^"[1-9][0-9]*"$', example: '"3"' }, description: 'ETag from the latest GET. Missing: 428. Stale: 409. Re-read before retrying.' }
const listParameters = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 10000000, default: 0 } },
]
const commonErrors = { '400': error, '401': error, '404': error, '405': error, '409': error, '413': error, '415': error, '428': error, '500': error }
const body = (schema: unknown) => ({ required: true, content: json(schema) })
const timestamp = { type: 'string', format: 'date-time' }
const nullableString = { type: ['string', 'null'] }

// Reads expose existing UI/legacy content as stored. Input length/path/array
// restrictions must not claim to be invariants of previously saved content.
function outputField(schema: Schema): Schema {
  return {
    type: schema.type,
    ...(schema.items ? { items: outputField(schema.items) } : {}),
    ...(schema.properties ? { properties: Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, outputField(value)])) } : {}),
  }
}

function rowSchema(name: string) {
  const properties: Record<string, unknown> = {
    id: { type: 'string', format: 'uuid' }, created_at: timestamp, updated_at: timestamp,
    version: { type: 'integer', minimum: 1 }, ...Object.fromEntries(Object.entries(patches[name]?.properties ?? {}).map(([key, schema]) => [key, outputField(schema)])),
  }
  if (resources[name].ordered) properties.position = { type: 'integer' }
  if (name === 'media') Object.assign(properties, {
    kind: { type: 'string', enum: ['photo', 'video'] }, storage_path: { type: 'string' }, poster_path: nullableString,
    width: { type: ['integer', 'null'] }, height: { type: ['integer', 'null'] }, duration_seconds: { type: ['number', 'null'] },
  })
  if (name === 'settings') { delete properties.id; delete properties.created_at; properties.key = { const: 'booking_recipient_email' } }
  if (['booking-requests', 'workshop-applications', 'workshop-subscribers', 'gift-orders'].includes(name)) {
    delete properties.updated_at
    properties.email = { type: 'string', format: 'email' }
  }
  if (name === 'booking-requests') Object.assign(properties, { message: nullableString, tier_id: { ...nullableString, format: 'uuid' } })
  if (name === 'workshop-applications') Object.assign(properties, { name: { type: 'string' }, instagram: nullableString, message: nullableString, intake: nullableString })
  if (name === 'workshop-subscribers') Object.assign(properties, { seasons: { type: 'array', items: { enum: ['winter', 'spring', 'summer'] } }, cities: { type: 'array', items: { enum: ['berlin', 'hamburg', 'paris'] } } })
  if (name === 'gift-orders') properties.amount = nullableString
  if (name === 'audit-log') {
    delete properties.version; delete properties.updated_at
    Object.assign(properties, { token_id: { type: ['string', 'null'], format: 'uuid' }, token_name: { type: 'string' }, operation: { type: 'string' }, resource: { type: 'string' }, resource_id: nullableString, status: { enum: ['started', 'succeeded', 'failed'] }, error_code: nullableString, completed_at: { ...nullableString, format: 'date-time' } })
  }
  return { type: 'object', required: Object.keys(properties), properties }
}

function publicSchema(schema: Schema): unknown {
  // `html` and `storage-path` are explanatory formats, accepted by JSON Schema
  // as annotations; retain them so an agent can discover rich-text fields.
  return schema
}

export function makeOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const [name, resource] of Object.entries(resources)) {
    const path = `/${name}`
    const row = rowSchema(name)
    const tag = [name]
    const collectionGet: Record<string, unknown> = resource.singleton ? {
      summary: `Read ${name}`, operationId: `get_${name.replaceAll('-', '_')}`, tags: tag, responses: { '200': readResponse(row), ...commonErrors },
    } : {
      summary: `List ${name}`, operationId: `list_${name.replaceAll('-', '_')}`, tags: tag,
      description: 'Follow pagination.next_offset until null. Ordering is position/id for ordered content; otherwise created_at/id descending. Lists are live, not snapshots.',
      parameters: [...listParameters, ...(name === 'media' ? [{ name: 'kind', in: 'query', schema: { enum: ['photo', 'video'] } }, { name: 'page', in: 'query', schema: { enum: ['portraits', 'kids', 'video'] } }] : []), ...(name === 'workshop-subscribers' ? [{ name: 'season', in: 'query', schema: { enum: ['winter', 'spring', 'summer'] } }, { name: 'city', in: 'query', schema: { enum: ['berlin', 'hamburg', 'paris'] } }] : [])],
      responses: { '200': { description: 'Page of records', content: json({ type: 'object', properties: { data: { type: 'array', items: row }, pagination: { type: 'object', properties: { limit: { type: 'integer' }, offset: { type: 'integer' }, next_offset: { type: ['integer', 'null'] } } } } }) }, ...commonErrors },
    }
    paths[path] = { get: collectionGet }
    const target = resource.singleton ? path : `${path}/{id}`
    if (!resource.singleton) paths[target] = { get: { summary: `Read one ${name} record`, tags: tag, operationId: `get_${name.replaceAll('-', '_')}`, parameters: [idParameter], responses: { '200': readResponse(row), ...commonErrors } } }
    if (resource.create) paths[path].post = { summary: `Create ${name}`, tags: tag, operationId: `create_${name}`, requestBody: body(publicSchema(creates[name])), responses: { '201': readResponse(row), ...commonErrors } }
    if (resource.update) paths[target].patch = { summary: `Update ${name}`, tags: tag, operationId: `update_${name.replaceAll('-', '_')}`, description: 'Only supplied fields change. Nested arrays are replaced in full. Changes apply immediately. Unsafe HTML is sanitized. Unknown fields are rejected.', parameters: [...(resource.singleton ? [] : [idParameter]), versionParameter], requestBody: body(publicSchema(patches[name])), responses: { '200': readResponse(row), ...commonErrors } }
    if (resource.delete) paths[target].delete = { summary: `Delete ${name}`, tags: tag, operationId: `delete_${name.replaceAll('-', '_')}`, description: 'Permanent deletion. Media file cleanup is durable and retried on subsequent API mutations if storage is unavailable.', parameters: [idParameter, versionParameter], responses: { '200': { description: 'Deleted', content: json(data({ type: 'object', properties: { id: { type: 'string' }, deleted: { const: true } } })) }, ...commonErrors } }
    if (resource.reorder) paths[`${path}/reorder`] = { post: { summary: `Reorder ${name}`, tags: tag, operationId: `reorder_${name}`, description: 'Atomic reorder of 1–100 existing rows. Supply each id with its latest version in desired order; reuse their existing visual slots. Legacy tied positions are normalized by position/id first, which can change numeric positions/versions of omitted rows while retaining their visual slots. Rows outside the subset stay in place. Any conflict aborts the entire reorder.', requestBody: body(reorderSchema), responses: { '200': readResponse({ type: 'array', items: row }), ...commonErrors } } }
  }
  const uploadTarget = { type: ['object', 'null'], properties: { url: { type: 'string', format: 'uri' }, method: { const: 'PUT' }, headers: { type: 'object', additionalProperties: { type: 'string' } } } }
  paths['/uploads'] = { post: { summary: 'Start a file upload', operationId: 'start_upload', tags: ['uploads'], description: 'Photos ≤10 MiB; MP4 ≤25 MiB. Photo dimensions may be null. Video requires positive width, height, duration_seconds and purpose=media. PUT raw bytes to source/poster signed URLs with returned headers, WITHOUT the PAT. URLs expire in two hours. New media remain hidden. Page images return paths for workshop/gift fields. No URL import.', requestBody: body(uploadSchema), responses: { '201': readResponse({ type: 'object', properties: { id: { type: 'string', format: 'uuid' }, expires_at: timestamp, source: uploadTarget, poster: uploadTarget } }), ...commonErrors } } }
  paths['/uploads/{id}'] = { get: { summary: 'Recover upload status', operationId: 'get_upload', tags: ['uploads'], parameters: [idParameter], responses: { '200': readResponse({ type: 'object', properties: { id: { type: 'string' }, expires_at: timestamp, completed_at: { ...nullableString, format: 'date-time' }, result: { type: ['object', 'null'] } } }), ...commonErrors } } }
  paths['/uploads/{id}/complete'] = { post: { summary: 'Complete an upload', operationId: 'complete_upload', tags: ['uploads'], parameters: [idParameter], description: 'No body. Verify stored source and poster, then finalize. Retry-safe: repeats return the original result. Only the PAT that started the session can access it. Result is a media row or {storage_path,bucket} for page assets.', responses: { '200': readResponse({ oneOf: [rowSchema('media'), { type: 'object', required: ['storage_path', 'bucket'], additionalProperties: false, properties: { storage_path: { type: 'string' }, bucket: { type: 'string', const: 'photos' } } }] }), ...commonErrors } } }
  return {
    openapi: '3.1.0', info: { title: 'Maria Chevskaya Admin API', version: '1.0.0', description: 'Current admin capabilities for agents and scripts. Full-access, non-expiring PATs are managed only in the admin UI. Secrets are shown once. All data endpoints require Bearer authentication. Do not automatically retry ordinary create requests after ambiguous transport failures; inspect the collection first. Upload completion is replay-safe.' },
    servers: [{ url: '/api/v1' }], security: [{ bearerAuth: [] }], paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'PAT' } },
      schemas: {
        Error: {
          type: 'object', required: ['error'], properties: {
            error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } },
          },
        },
      },
    },
  }
}
