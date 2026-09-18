# Uploading files from a script

Requires Node.js 20 or newer and `ffprobe` (part of FFmpeg). Video uploads additionally use `ffmpeg` to extract a JPEG poster. Install FFmpeg with your operating system's package manager.

Set `MASHA_API_TOKEN` in the environment using your secret manager or a hidden shell prompt. Never put the PAT in command arguments, source files, or committed `.env` files.

```sh
node scripts/api-upload.mjs --url https://your-site.example --purpose media ./portrait.jpg ./prepared/clip.mp4
node scripts/api-upload.mjs --url https://your-site.example --purpose workshop ./hero.jpg
node scripts/api-upload.mjs --url https://your-site.example --purpose gift ./certificate.jpg
```

`--url` is the site origin, without `/api/v1`. HTTPS is required except for local development on `http://localhost`, `http://127.0.0.1`, or `http://[::1]`.

Photos support JPEG, PNG, WebP, GIF, AVIF, up to 10 MiB. Videos must be prepared MP4 files up to 25 MiB and are only supported for `--purpose media`. Use `scripts/prepare-video.sh` to convert MOV or other footage first. The client extracts dimensions, duration, and the first video frame; it does not re-encode the video. Temporary poster files are removed when preparation or transfer finishes or fails.

The client creates an upload session, prints `Upload ID: <uuid>` to stderr **before sending file bytes**, transfers source and poster directly to signed storage destinations, and finalizes the upload. PAT authorization is sent only to the site's API. Storage PUTs carry the returned content-type/cache-control headers, without PAT or cookies. Redirects are rejected.

Stdout contains one JSON object per completed file with identifiers, version, and storage paths. It never prints PATs or signed URLs. New portfolio media remain hidden until assigned to pages. For workshop/gift uploads, use the returned `storage_path` in the corresponding page PATCH, with the current `If-Match` version.

If a transfer or finalization is interrupted, use the saved session ID with the **same PAT**:

```sh
node scripts/api-upload.mjs --url https://your-site.example --recover 11111111-1111-4111-8111-111111111111
```

Recovery reads `GET /api/v1/uploads/{id}` and prints the existing result if already complete; otherwise it retries finalization. It does not resend missing bytes or refresh signed upload URLs. If bytes are missing or the session has expired, start a new upload. The script stops on the first failed file; earlier completed uploads remain valid. HTTP status and stable error codes can be inspected through the API or admin mutation journal.
