import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function run(args: string[], env = process.env, capture = false) {
  const result = spawnSync('pnpm', args, {
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  })
  if (result.status !== 0)
    throw new Error(`pnpm ${args.join(' ')} failed${capture ? `: ${result.stderr}` : ''}`)
  return result.stdout
}
async function main() {
  const stackEnv = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('SUPABASE_')),
    ),
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_HOME: resolve('e2e/.runtime/supabase'),
    SUPABASE_EXPERIMENTAL_STACK: '1',
  }
  try {
    run(
      [
        'exec',
        'supabase',
        'start',
        '--workdir',
        'e2e',
        '--runtime',
        process.env.E2E_SUPABASE_RUNTIME ?? 'native',
        '--eager',
      ],
      stackEnv,
      true,
    )
    const status = JSON.parse(
      run(
        ['exec', 'supabase', 'status', '--workdir', 'e2e', '--output-format', 'json'],
        stackEnv,
        true,
      ),
    )
    const local = status.env
    if (local.API_URL !== 'http://127.0.0.1:55321') throw new Error('Refusing non-E2E Supabase URL')
    const env = {
      ...process.env,
      SDLC_E2E: '1',
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: local.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3107',
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
      NEXT_PUBLIC_POSTHOG_HOST: '',
      RESEND_API_KEY: '',
      BOOKING_IP_SALT: 'local-e2e-only',
      E2E_PASSWORD: 'Local-test-password-28!',
    }
    run(
      ['exec', 'supabase', 'db', 'reset', '--local', '--workdir', 'e2e', '--no-seed', '--yes'],
      stackEnv,
      true,
    )
    const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    const users = await admin.auth.admin.listUsers()
    if (users.error) throw users.error
    for (const email of ['admin@e2e.invalid', 'visitor@e2e.invalid']) {
      if (!users.data.users.some((user) => user.email === email)) {
        const result = await admin.auth.admin.createUser({
          email,
          password: env.E2E_PASSWORD,
          email_confirm: true,
        })
        if (result.error) throw result.error
      }
    }
    const whitelist = await admin.from('admin_emails').upsert({ email: 'admin@e2e.invalid' })
    if (whitelist.error) throw whitelist.error
    const settings = await admin
      .from('app_settings')
      .upsert({ key: 'booking_recipient_email', value: 'recipient@e2e.invalid' })
    if (settings.error) throw settings.error
    // Clean only the dedicated stack; never use a developer's ambient credentials.
    for (const table of [
      'photos',
      'gift_certificate_requests',
      'workshop_applications',
      'workshop_subscribers',
      'booking_requests',
    ]) {
      const result = await admin.from(table).delete().not('id', 'is', null)
      if (result.error) throw result.error
    }
    const seedImage = await admin.storage
      .from('photos')
      .upload('seed/portfolio.png', readFileSync('e2e/fixtures/photo.png'), {
        contentType: 'image/png',
        upsert: true,
      })
    if (seedImage.error) throw seedImage.error
    const seedPhoto = await admin
      .from('photos')
      .insert({
        storage_path: 'seed/portfolio.png',
        title: 'Seed portrait',
        alt_text: 'Seed portrait',
        width: 16,
        height: 16,
        pages: ['portraits', 'kids', 'editorial', 'video'],
        position: 10,
      })
    if (seedPhoto.error) throw seedPhoto.error
    const gift = await admin.from('gift_certificate').select('id').single()
    if (gift.error) throw gift.error
    const updated = await admin
      .from('gift_certificate')
      .update({ is_visible: true, amounts: [{ id: 'e2e-450', price: '450 €' }] })
      .eq('id', gift.data.id)
    if (updated.error) throw updated.error
    const workshop = await admin.from('workshop').select('id').single()
    if (workshop.error) throw workshop.error
    const sales = await admin
      .from('workshop')
      .update({ sales_open: true })
      .eq('id', workshop.data.id)
    if (sales.error) throw sales.error
    rmSync('.next-e2e', { force: true, recursive: true })
    run(['build'], env)
    run(['exec', 'playwright', 'test', ...process.argv.slice(2)], env)
  } finally {
    run(['exec', 'supabase', 'stop', '--workdir', 'e2e'], stackEnv, true)
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
