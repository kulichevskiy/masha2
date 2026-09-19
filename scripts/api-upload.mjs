#!/usr/bin/env node
/** Node >=20 upload client. PAT is read only from MASHA_API_TOKEN. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4' }
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const HELP = `Usage:
  node scripts/api-upload.mjs --url https://site.example --purpose media|workshop|gift file [file ...]
  node scripts/api-upload.mjs --url https://site.example --recover UPLOAD_ID

Set MASHA_API_TOKEN in the environment. Requires Node >=20 and ffprobe;
video uploads also require ffmpeg. MP4 only; prepare other video formats with
scripts/prepare-video.sh first. Photos: 10 MiB; videos: 25 MiB.
Outputs one finalized JSON result per file. Upload IDs go to stderr before PUT.
--recover checks an upload and retries finalization if it is not complete.
It cannot resume missing file bytes; start a new upload if bytes are incomplete.`

export function validateUrl(value, siteOnly = false) {
  let url
  try { url = new URL(value) } catch { throw new Error('Invalid URL.') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.hash || (siteOnly && (url.pathname !== '/' || url.search))) {
    throw new Error('Use an HTTPS site origin, or HTTP localhost for local development.')
  }
  return url
}

export function parseArgs(args) {
  const options = { url: '', purpose: 'media', recover: '', files: [], help: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--') { options.files.push(...args.slice(i + 1)); break }
    if (arg === '--help' || arg === '-h') { options.help = true; continue }
    if (['--url', '--purpose', '--recover'].includes(arg)) {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error('Missing option value. Use --help.')
      options[arg.slice(2)] = value
    } else if (arg.startsWith('-')) throw new Error('Unknown option. Use --help.')
    else options.files.push(arg)
  }
  if (options.help) return options
  validateUrl(options.url, true)
  if (!['media', 'workshop', 'gift'].includes(options.purpose)) throw new Error('Purpose must be media, workshop, or gift.')
  if (options.recover ? (!UUID.test(options.recover) || options.files.length) : !options.files.length) throw new Error('Provide files or a valid --recover upload ID. Use --help.')
  return options
}

export function createApiClient(base, token, fetchImpl = fetch) {
  const origin = validateUrl(base, true).origin
  if (!/^mcp_[a-f0-9]{64}$/.test(token ?? '')) throw new Error('Set a valid MASHA_API_TOKEN environment variable.')
  return {
    async request(path, method = 'GET', body) {
      if (!/^uploads(?:\/[a-f0-9-]{36}(?:\/complete)?)?$/.test(path)) throw new Error('Invalid API path.')
      let response
      try {
        response = await fetchImpl(`${origin}/api/v1/${path}`, {
          method, redirect: 'error', signal: AbortSignal.timeout(120_000),
          headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })
      } catch { throw new Error('API request failed. Check connectivity and use --recover with the saved upload ID.') }
      if (!response.ok) throw new Error(`API request failed (HTTP ${response.status}). Check the API journal; use --recover with the saved upload ID.`)
      let json
      try { json = await response.json() } catch { throw new Error('Invalid API response.') }
      if (!json || !Object.hasOwn(json, 'data')) throw new Error('Invalid API response.')
      return json.data
    },
    async put(destination, bytes) {
      if (!destination || destination.method !== 'PUT') throw new Error('Invalid upload destination.')
      const url = validateUrl(destination.url)
      // Deliberately construct a fresh header allowlist. Never copy PAT auth,
      // cookies, or other response-provided headers to a storage origin.
      const headers = {}
      for (const [key, value] of Object.entries(destination.headers ?? {})) {
        if (['content-type', 'cache-control'].includes(key.toLowerCase()) && typeof value === 'string') headers[key] = value
      }
      let response
      try {
        response = await fetchImpl(url.href, { method: 'PUT', body: bytes, headers, redirect: 'error', signal: AbortSignal.timeout(120_000), credentials: 'omit' })
      } catch { throw new Error('File transfer failed. Use --recover with the saved upload ID to check its status.') }
      if (!response.ok) throw new Error(`File transfer failed (HTTP ${response.status}). Use --recover with the saved upload ID.`)
    },
  }
}

async function runProcess(command, args) {
  const env = { ...process.env }
  delete env.MASHA_API_TOKEN
  try {
    return await promisify(execFile)(command, args, { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 60_000, env })
  } catch { throw new Error('Media preparation failed. Ensure ffmpeg/ffprobe are installed and the input is valid.') }
}

export async function prepareFile(file, purpose, dependencies = {}) {
  const run = dependencies.runProcess ?? runProcess
  const makeTemp = dependencies.mkdtemp ?? mkdtemp
  const remove = dependencies.rm ?? rm
  const absolute = resolve(file)
  const filename = basename(absolute)
  const contentType = MIME[extname(absolute).toLowerCase()]
  if (!contentType || filename.length > 200 || /[\\\x00-\x1f]/.test(filename)) throw new Error('Unsupported filename or format. Use JPEG, PNG, WebP, GIF, AVIF, or prepared MP4.')
  const video = contentType === 'video/mp4'
  if (video && purpose !== 'media') throw new Error('Videos are supported only for purpose media.')
  let source
  try {
    const info = await stat(absolute)
    if (!info.isFile() || info.size <= 0 || info.size > (video ? 25 : 10) * 1024 * 1024) throw new Error('Invalid file size.')
    source = await readFile(absolute)
  } catch { throw new Error('Could not read input within its size limit: photos 10 MiB, videos 25 MiB.') }
  if (!source.length || source.length > (video ? 25 : 10) * 1024 * 1024) throw new Error('File exceeds its upload limit or is empty: photos 10 MiB, videos 25 MiB.')
  let probe
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration:stream_side_data=rotation:format=duration', '-of', 'json', absolute])
    probe = JSON.parse(stdout)
  } catch { throw new Error('Could not read media metadata. Check ffprobe and the input file.') }
  let { width, height } = probe.streams?.[0] ?? {}
  const rotation = Number(probe.streams?.[0]?.side_data_list?.find((item) => item.rotation !== undefined)?.rotation ?? 0)
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width]
  if (![width, height].every((value) => Number.isInteger(value) && value > 0 && value <= 100000)) throw new Error('Invalid image or video dimensions.')
  const metadata = { purpose, kind: video ? 'video' : 'photo', filename, content_type: contentType, size: source.length, width, height }
  if (video) {
    const duration = Number(probe.format?.duration ?? probe.streams?.[0]?.duration)
    if (!Number.isFinite(duration) || duration < 0.001 || duration > 86400) throw new Error('Invalid video duration.')
    metadata.duration_seconds = duration
  }
  let temporary
  const cleanup = async () => { if (temporary) { await remove(temporary, { recursive: true, force: true }); temporary = undefined } }
  try {
    let poster
    if (video) {
      temporary = await makeTemp(join(tmpdir(), 'masha-api-upload-'))
      const path = join(temporary, 'poster.jpg')
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', absolute, '-map', '0:v:0', '-frames:v', '1', '-q:v', '2', '-y', path])
      poster = await readFile(path)
      if (!poster.length || poster.length > 10 * 1024 * 1024) throw new Error('Invalid poster size.')
    }
    return { metadata, source, poster, cleanup }
  } catch {
    await cleanup()
    throw new Error('Could not prepare the video poster. Check ffmpeg and the input file.')
  }
}

// Only documented identifiers/paths go to stdout. Do not echo arbitrary server
// responses, signed URLs, request headers, or server exception messages.
export function safeResult(result) {
  const output = {}
  if (typeof result?.id === 'string' && UUID.test(result.id)) output.id = result.id
  if (Number.isSafeInteger(result?.version) && result.version > 0) output.version = result.version
  for (const field of ['storage_path', 'poster_path', 'path']) {
    const value = result?.[field]
    if (typeof value === 'string' && /^[a-zA-Z0-9_/.-]+$/.test(value) && !value.startsWith('/') && !value.includes('..') && !value.includes('mcp_')) output[field] = value
  }
  return output
}

export async function main(args = process.argv.slice(2), dependencies = {}) {
  const env = dependencies.env ?? process.env
  const out = dependencies.stdout ?? ((message) => process.stdout.write(message + '\n'))
  const err = dependencies.stderr ?? ((message) => process.stderr.write(message + '\n'))
  const options = parseArgs(args)
  if (options.help) { out(HELP); return }
  const client = createApiClient(options.url, env.MASHA_API_TOKEN, dependencies.fetch ?? fetch)
  if (options.recover) {
    const upload = await client.request(`uploads/${options.recover}`)
    const result = upload.completed_at ? upload.result : await client.request(`uploads/${options.recover}/complete`, 'POST')
    out(JSON.stringify(safeResult(result)))
    return
  }
  for (const file of options.files) {
    const prepared = await prepareFile(file, options.purpose, dependencies)
    try {
      const upload = await client.request('uploads', 'POST', prepared.metadata)
      if (!UUID.test(upload?.id ?? '')) throw new Error('Invalid upload session response.')
      err(`Upload ID: ${upload.id}`)
      await client.put(upload.source, prepared.source)
      if (prepared.poster) await client.put(upload.poster, prepared.poster)
      const result = await client.request(`uploads/${upload.id}/complete`, 'POST')
      out(JSON.stringify(safeResult(result)))
    } finally { await prepared.cleanup() }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    // Unknown exception text can contain a signed URL from an underlying fetch.
    process.stderr.write('Upload failed. Check file format, limits, ffmpeg/ffprobe, API access and connectivity. Use --recover with a saved upload ID; use --help for usage.\n')
    process.exitCode = 1
  })
}
