'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/admin')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="bg-white border border-gray-200 p-6 max-w-sm w-full">
        <h3 className="text-[22px] font-semibold tracking-tight text-[#252525] leading-tight">
          Новый пароль
        </h3>
        <p className="mt-1 mb-5 text-[13px] text-gray-500 font-inter">Введите новый пароль</p>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
          <div>
            <label htmlFor="password" className="block mb-1.5 text-[13px] font-medium text-[#252525]">
              Новый пароль
            </label>
            <input
              id="password"
              type="password"
              placeholder="Новый пароль"
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
            {isLoading ? 'сохранение...' : 'сохранить'}
          </button>
        </form>
      </div>
    </div>
  )
}
