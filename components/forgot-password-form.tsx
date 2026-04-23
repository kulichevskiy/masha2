'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {success ? (
        <div className="bg-white border border-gray-200 p-6 max-w-sm w-full">
          <h3 className="text-[22px] font-semibold tracking-tight text-[#252525] leading-tight">
            Проверьте почту
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-gray-500 font-inter">Инструкции отправлены</p>
          <p className="text-sm text-gray-500 font-inter leading-relaxed">
            Если вы зарегистрированы, письмо для восстановления пароля отправлено на указанный email.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 p-6 max-w-sm w-full">
          <h3 className="text-[22px] font-semibold tracking-tight text-[#252525] leading-tight">
            Восстановление пароля
          </h3>
          <p className="mt-1 mb-5 text-[13px] text-gray-500 font-inter">
            Введите email для получения ссылки
          </p>

          <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-4 bg-black text-white rounded-none font-inter text-[13px] font-normal tracking-[0.02em] lowercase cursor-pointer transition-colors hover:bg-gray-800 disabled:opacity-60"
            >
              {isLoading ? 'отправка...' : 'отправить'}
            </button>
            <div className="mt-4 text-center text-[13px] text-gray-500 font-inter">
              Вспомнили пароль?{' '}
              <Link href="/auth/login" className="text-[#252525] underline underline-offset-4">
                Войти
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
