'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /Load failed/i, /Failed to fetch/i, /NetworkError/i, /AbortError/i, /cancelled/i]

/** Remonte automatiquement les erreurs de l'app vers la tour de contrôle (max 10 par session, sans doublon). */
export default function ErrorReporter() {
  const [supabase] = useState(() => createClient())
  const pathname = usePathname()

  useEffect(() => {
    const sent = new Set<string>()
    let count = 0
    const report = async (message: string, stack?: string) => {
      if (!message || count >= 10 || sent.has(message) || IGNORED.some((r) => r.test(message))) return
      sent.add(message)
      count++
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        const cap = (window as any).Capacitor
        await supabase.rpc('report_client_error', {
          p_message: message,
          p_stack: stack || null,
          p_route: window.location.pathname,
          p_platform: cap?.getPlatform?.() || 'web',
          p_user_agent: navigator.userAgent,
          p_version: process.env.NEXT_PUBLIC_APP_VERSION || null,
        })
      } catch {
        /* le suivi d'erreurs ne doit jamais provoquer d'erreur */
      }
    }
    const onError = (e: ErrorEvent) => void report(e.message, e.error?.stack)
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason
      void report(typeof r === 'string' ? r : r?.message || 'Promesse rejetée', r?.stack)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [supabase, pathname])

  return null
}
