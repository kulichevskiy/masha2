import Link from 'next/link'
import { resources } from '@/lib/admin-api/resources'
import { patches } from '@/lib/admin-api/schema'

export const metadata = { title: 'Admin API · Maria Chevskaya' }
export default function ApiDocs() {
  return <main className="mx-auto max-w-4xl px-4 py-12 space-y-8">
    <header><h1 className="text-3xl">Admin API</h1><p className="mt-3 text-gray-600">Manage the portfolio and site content from agents and scripts.</p>
      <p className="mt-3"><Link className="underline" href="/api/openapi.json">OpenAPI 3.1 specification</Link> · <Link className="underline" href="/admin?tab=api">Manage tokens</Link></p></header>
    <section className="space-y-3"><h2 className="text-xl">Authentication</h2><p>Create a named personal access token in the admin API tab. Every token has full access and stays valid until revoked. Its secret is displayed once. Token management is available only in the admin. Send <code>Authorization: Bearer $MASHA_API_TOKEN</code> to <code>/api/v1</code>; browser cookies do not authenticate API requests.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Read, then change</h2><p>GET returns <code>{'{"data": …}'}</code> and a quoted integer <code>ETag</code>. PATCH and DELETE require that ETag in <code>If-Match</code>. A stale version returns 409 without changes; a missing version returns 428. Versions also change when someone edits in the admin.</p>
      <pre className="overflow-auto bg-gray-50 p-4 text-sm">{`# Set SITE to your site origin and MASHA_API_TOKEN in your environment.
curl -i "$SITE/api/v1/workshop" \\
  -H "Authorization: Bearer $MASHA_API_TOKEN"

# Replace 3 with the version from the latest response.
curl -X PATCH "$SITE/api/v1/workshop" \\
  -H "Authorization: Bearer $MASHA_API_TOKEN" \\
  -H 'Content-Type: application/json' -H 'If-Match: "3"' \\
  --data '{"banner_visible":true,"sales_open":false}'`}</pre>
      <p>Changes apply immediately. PATCH changes supplied fields only; nested arrays are replaced in full. Unknown fields are rejected, and rich-text HTML is sanitized. Ordinary creation is not replay-safe: after a timeout, inspect the collection before retrying.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Resources</h2><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Path under /api/v1</th><th>Operations</th></tr></thead><tbody>{Object.entries(resources).map(([name, r]) => <tr className="border-b" key={name}><td className="py-2"><code>/{name}</code></td><td>{[r.singleton ? 'Read' : 'List, read by id', r.create && 'create', r.update && 'update', r.delete && 'delete', r.reorder && 'reorder'].filter(Boolean).join(', ')}</td></tr>)}</tbody></table></div>
      <p>Collection GET accepts <code>limit=1…100</code> and <code>offset</code>. Follow <code>pagination.next_offset</code> until null. Lists are live: concurrent additions/deletions can move page boundaries. Media accepts <code>kind</code> and <code>page</code>; subscribers accept <code>season</code> and <code>city</code>. Customer IP hashes and user-agent metadata are not returned.</p>
      <p>Reorder with <code>POST /media/reorder</code> (also tiers/faq), sending <code>{'{"items":[{"id":"…","version":3},…]}'}</code> in the desired order. Up to 100 rows move atomically over their existing slots; omitted rows stay in place. Any stale version aborts the whole operation. Legacy duplicate positions are normalized first; omitted rows keep their visual slots, but numeric positions and versions may change.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Upload files</h2><ol className="list-decimal pl-5 space-y-2"><li>POST <code>/uploads</code> with purpose, kind, filename, content_type, size, width and height. Videos additionally require duration_seconds. See OpenAPI for exact types.</li><li>PUT raw source bytes to the returned signed source URL using its headers. For videos also PUT a JPEG poster to the poster URL. Do not send the PAT to storage URLs. Signed URLs expire in two hours.</li><li>POST <code>/uploads/{'{id}'}/complete</code> without a body. Completion verifies files and returns a hidden portfolio media row, or a page asset path. Repeating completion returns the original result; GET <code>/uploads/{'{id}'}</code> recovers status.</li></ol>
      <p>Photos: JPEG, PNG, WebP, GIF or AVIF up to 10 MiB. Videos: prepared MP4 up to 25 MiB. The client extracts dimensions/duration and prepares a JPEG poster; there is no server transcoding or URL import. Workshop/gift uploads accept photos only.</p>
      <pre className="overflow-auto bg-gray-50 p-4 text-sm">{`# Requires Node 20+, ffmpeg and ffprobe.
node scripts/api-upload.mjs --url "$SITE" --purpose media photo.jpg clip.mp4
node scripts/api-upload.mjs --url "$SITE" --purpose workshop hero.jpg`}</pre>
      <p>Use the repository script with <code>MASHA_API_TOKEN</code> in the environment. For a camera MOV, prepare an MP4 first with <code>scripts/prepare-video.sh</code>. New portfolio media have empty <code>pages</code>; PATCH them to assign portraits, kids or video. For page assets, use the returned storage_path in hero_photo_path, program or gallery.</p>
      <p>Deleting portfolio media removes the record and queues file cleanup durably. If storage is unavailable, later API mutations retry cleanup. Unfinished uploads do not create portfolio records; their uploaded files can remain in storage.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Editable fields</h2>{Object.entries(patches).map(([name, schema]) => <details key={name} className="border-b pb-3"><summary className="cursor-pointer">{name}</summary><pre className="mt-3 overflow-auto bg-gray-50 p-4 text-xs">{JSON.stringify(schema, null, 2)}</pre></details>)}</section>
    <section className="space-y-3"><h2 className="text-xl">Journal and errors</h2><p>Authenticated mutations appear in the admin journal and <code>/audit-log</code>, including validation failures. Entries contain time, token name, operation, target and result—not secrets or submitted content. A <code>started</code> entry means execution was interrupted or is still in progress; inspect the resource before retrying.</p><p>Errors use <code>{'{"error":{"code":"conflict","message":"…"}}'}</code>. Invalid input: 400; absent/revoked PAT: 401; missing record: 404; stale version: 409; oversized JSON: 413; wrong content type: 415; absent If-Match: 428; server failure: 500. JSON bodies are limited to 1 MiB. All authenticated responses are private and uncached.</p></section>
  </main>
}
