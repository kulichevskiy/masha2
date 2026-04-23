'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.67 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.1S8.69 5.9 12 5.9c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.85 3.3 14.62 2.3 12 2.3 6.98 2.3 2.9 6.38 2.9 11.4s4.08 9.1 9.1 9.1c5.26 0 8.74-3.69 8.74-8.89 0-.6-.06-1.05-.14-1.51H12z"
      />
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.67-.06-1.31-.17-1.93H12v3.65h5.42c-.23 1.26-.95 2.33-2.02 3.05v2.53h3.27c1.92-1.77 3.03-4.38 3.03-7.3z"
      />
      <path
        fill="#FBBC05"
        d="M5.5 13.73a5.87 5.87 0 010-3.47V7.72H2.17a9.7 9.7 0 000 8.56l3.33-2.55z"
      />
      <path
        fill="#34A853"
        d="M12 20.5c2.7 0 4.96-.9 6.62-2.44l-3.27-2.53c-.9.61-2.08.98-3.35.98-2.58 0-4.76-1.74-5.54-4.08l-3.33 2.55A9.98 9.98 0 0012 20.5z"
      />
    </svg>
  )
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/admin')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    })
    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="bg-white border border-gray-200 p-6 max-w-sm w-full">
        <h3 className="text-[22px] font-semibold tracking-tight text-[#252525] leading-tight">Вход</h3>
        <p className="mt-1 mb-5 text-[13px] text-gray-500 font-inter">
          Введите email для входа в аккаунт
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="block mb-1.5 text-[13px] font-medium text-[#252525]">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="email@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 border border-gray-200 rounded-none px-3 text-sm bg-transparent font-inter outline-none focus:border-[#252525]"
            />
          </div>
          <div>
            <div className="flex items-center mb-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-[#252525]">
                Пароль
              </label>
              <Link
                href="/auth/forgot-password"
                className="ml-auto text-xs text-[#252525] no-underline hover:underline"
              >
                Восстановить пароль
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 border border-gray-200 rounded-none px-3 text-sm bg-transparent font-inter outline-none focus:border-[#252525]"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-4 bg-black text-white rounded-none font-inter text-[13px] font-normal tracking-[0.02em] lowercase cursor-pointer transition-colors hover:bg-gray-800 disabled:opacity-60"
          >
            {isLoading ? 'вход...' : 'войти'}
          </button>

          <div className="relative text-center text-xs text-gray-500 my-3">
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
            <span className="relative bg-white px-2.5 lowercase">или</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group w-full h-9 bg-transparent text-gray-500 rounded-none font-inter text-[13px] font-normal tracking-[0.02em] cursor-pointer inline-flex items-center justify-center gap-2 transition-colors hover:text-[#252525] disabled:opacity-60"
          >
            <GoogleIcon />
            <span className="pb-0.5 border-b border-transparent transition-colors group-hover:border-[#252525]">
              войти через Google
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
