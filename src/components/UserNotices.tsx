'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Notices = {
  announcements?: { id: string; title: string; message: string; level: 'info' | 'warning' | 'maintenance' }[]
  restrictions?: { feature: string; reason: string | null; expires_at: string | null }[]
  global_off?: string[]
}

const LABELS: Record<string, string> = { tasks: 'Tâches', diffusion: 'Diffusion', campaigns: 'Campagnes', withdraw: 'Retraits', messages: 'Messages', treasures: 'Coffres' }
const TONES = {
  info: 'bg-sky-600 text-white',
  warning: 'bg-amber-500 text-white',
  maintenance: 'bg-slate-800 text-white',
  restriction: 'bg-red-600 text-white',
}

/** Bandeaux affichés en haut de l'écran : annonces de l'équipe, fonctions désactivées pour ce compte ou pour tout le monde. */
export default function UserNotices() {
  const [supabase] = useState(() => createClient())
  const [notices, setNotices] = useState<Notices>({})
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      setDismissed(JSON.parse(sessionStorage.getItem('xaf_dismissed_notices') || '[]'))
    } catch {}
    let stop = false
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.rpc('get_my_notices')
      if (!stop && data) setNotices(data as Notices)
    }
    void load()
    const t = setInterval(() => document.visibilityState === 'visible' && void load(), 5 * 60 * 1000)
    const { data: sub } = supabase.auth.onAuthStateChange((e) => e === 'SIGNED_IN' && void load())
    return () => {
      stop = true
      clearInterval(t)
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      sessionStorage.setItem('xaf_dismissed_notices', JSON.stringify(next))
    } catch {}
  }

  const items: { id: string; tone: string; title: string; text?: string }[] = []
  for (const a of notices.announcements || []) items.push({ id: `a-${a.id}`, tone: TONES[a.level] || TONES.info, title: a.title, text: a.message })
  const restricted = (notices.restrictions || []).map((r) => LABELS[r.feature] || r.feature)
  if (restricted.length > 0) {
    const reason = (notices.restrictions || []).find((r) => r.reason)?.reason
    items.push({ id: `r-${restricted.join('')}`, tone: TONES.restriction, title: `Désactivé sur ton compte : ${restricted.join(', ')}`, text: reason ? `Motif : ${reason}` : 'Contacte le support si tu penses que c\'est une erreur.' })
  }
  const off = (notices.global_off || []).map((f) => LABELS[f] || f)
  if (off.length > 0) items.push({ id: `g-${off.join('')}`, tone: TONES.warning, title: `Temporairement indisponible : ${off.join(', ')}` })

  const visible = items.filter((i) => !dismissed.includes(i.id))
  if (visible.length === 0) return null

  return (
    <div className="sticky top-0 z-[150]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {visible.map((i) => (
        <div key={i.id} className={`${i.tone} px-4 py-2.5 flex items-start gap-3`} role="status">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black">{i.title}</p>
            {i.text && <p className="text-[11px] opacity-90 leading-snug">{i.text}</p>}
          </div>
          <button onClick={() => dismiss(i.id)} aria-label="Fermer" className="shrink-0 w-7 h-7 rounded-full bg-black/20 text-sm">✕</button>
        </div>
      ))}
    </div>
  )
}
