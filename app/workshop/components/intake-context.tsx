'use client'

// Shared selected-intake state for the workshop page. The tariff cards, the
// dark "choose your intake" picker in the Apply band, and the apply form all
// read and write through this one context so a choice made anywhere is
// reflected everywhere. Default is 'full' — the featured intake in the design.
//
// The provider is a client component, but it only wraps `children`, so the
// page body it surrounds stays server-rendered; only the interactive consumers
// (cards, picker, form) are client components.

import { createContext, useContext, useState } from 'react'

export type IntakeKey = 'short' | 'full'

type IntakeContextValue = {
  intake: IntakeKey
  setIntake: (key: IntakeKey) => void
}

const IntakeContext = createContext<IntakeContextValue | null>(null)

export function IntakeProvider({ children }: { children: React.ReactNode }) {
  const [intake, setIntake] = useState<IntakeKey>('full')
  return (
    <IntakeContext.Provider value={{ intake, setIntake }}>
      {children}
    </IntakeContext.Provider>
  )
}

export function useIntake(): IntakeContextValue {
  const ctx = useContext(IntakeContext)
  if (!ctx) {
    throw new Error('useIntake must be used within an IntakeProvider')
  }
  return ctx
}
