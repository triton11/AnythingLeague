// app/supabase-context.tsx
'use client'

import { createContext, useContext } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const SupabaseContext = createContext<{ supabase: ReturnType<typeof createBrowserClient> } | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('Supabase context not found')
  return context.supabase
}

export { SupabaseContext }