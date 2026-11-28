'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MoneyTab, WithdrawalsTab, AlertsTab, GrowthTab, CommsTab, ErrorsTab, srcLabel, type Ctx } from './extras'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Tab = 'overview' | 'money' | 'withdrawals' | 'alerts' | 'suspects' | 'users' | 'growth' | 'comms' | 'errors' | 'journal'
type ActionKind = 'restrict' | 'suspend' | 'block' | 'unban' | 'logout' | 'global'
type Action = { kind: ActionKind; ids: string[]; feature?: string; label?: string }

const FEATURES = [
  { id: 'tasks', label: 'Tâches', icon: '✅' },
  { id: 'diffusion', label: 'Diffusion', icon: '📢' },
  { id: 'campaigns', label: 'Campagnes', icon: '🎯' },
  { id: 'withdraw', label: 'Retraits', icon: '💸' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'treasures', label: 'Coffres', icon: '🏆' },
]
const DURATIONS = [
  { id: '1h', label: '1 heure', ms: 3600e3 },
  { id: '24h', label: '24 heures', ms: 24 * 3600e3 },
  { id: '7d', label: '7 jours', ms: 7 * 24 * 3600e3 },
  { id: '30d', label: '30 jours', ms: 30 * 24 * 3600e3 },
  { id: 'forever', label: "Jusqu'à ce que je lève", ms: 0 },
]
const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'online', label: 'En ligne' },
  { id: 'restricted', label: 'Restreints' },
  { id: 'blocked', label: 'Bloqués' },
  { id: 'premium', label: 'Premium' },
  { id: 'new24h', label: 'Nouveaux 24 h' },
]
const FEED_ICON: Record<string, string> = { signup: '👤', task: '✅', diffusion: '📢', withdrawal: '💸', payment: '💳', admin: '🛡️' }

const fmt = (n: unknown) => Math.round(Number(n) || 0).toLocaleString('fr-FR')
const bytes = (n?: number | null) => (n == null ? '—' : n > 1e9 ? (n / 1e9).toFixed(2) + ' Go' : (n / 1e6).toFixed(1) + ' Mo')
const until = (durationId: string) => {
  const d = DURATIONS.find((x) => x.id === durationId)
  return !d || d.ms === 0 ? null : new Date(Date.now() + d.ms).toISOString()
}
const ago = (iso?: string | null) => {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}
const featureLabel = (id: string) => FEATURES.find((f) => f.id === id)?.label || id

export default function ControlTowerPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [adminId, setAdminId] = useState('')
  const [alertCount, setAlertCount] = useState(0)
  const [tab, setTab] = useState<Tab>('overview')
  const [version, setVersion] = useState(0)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)

  const [overview, setOverview] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [feed, setFeed] = useState<any[]>([])
  const [globals, setGlobals] = useState<Record<string, { off: boolean; reason: string }>>({})
  const [latency, setLatency] = useState<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [suspects, setSuspects] = useState<any[]>([])
  const [suspectsLoading, setSuspectsLoading] = useState(false)

  const [users, setUsers] = useState<any[]>([])
  const usersRef = useRef<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])

  const [audit, setAudit] = useState<any[]>([])
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)

  const flash = useCallback((text: string, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const rpc = useCallback(
    async (name: string, params?: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc(name, params)
      if (error) throw new Error(error.message)
      return data
    },
    [supabase]
  )

  // Accès réservé aux admins (le serveur refuse de toute façon les autres)
  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', session.user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.replace('/dashboard')
      setAdminId(session.user.id)
      setReady(true)
    })()
  }, [supabase, router])

  useEffect(() => {
    usersRef.current = users
  }, [users])

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(query), 350)
    return () => clearTimeout(t)
  }, [query])

  // ── Vue d'ensemble : actualisation automatique toutes les 10 s ──
  const loadOverview = useCallback(async () => {
    try {
      const t0 = performance.now()
      const [o, f, g] = await Promise.all([rpc('control_overview'), rpc('control_live_feed', { p_limit: 40 }), rpc('control_get_global_features')])
      setLatency(Math.round(performance.now() - t0))
      setOverview(o)
      setFeed(f || [])
      setGlobals(g || {})
      setLastRefresh(new Date())
      try {
        const al = await rpc('control_alerts_list', { p_resolved: false })
        setAlertCount(Array.isArray(al) ? al.length : 0)
      } catch {
        /* partie 2 non installée : pas de compteur */
      }
    } catch (e) {
      flash((e as Error).message, false)
    }
  }, [rpc, flash])

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await rpc('control_health'))
    } catch {
      /* la santé est secondaire : pas de message */
    }
  }, [rpc])

  useEffect(() => {
    if (!ready || tab !== 'overview') return
    void loadOverview()
    void loadHealth()
    const fast = setInterval(() => document.visibilityState === 'visible' && void loadOverview(), 10000)
    const slow = setInterval(() => document.visibilityState === 'visible' && void loadHealth(), 60000)
    return () => {
      clearInterval(fast)
      clearInterval(slow)
    }
  }, [ready, tab, version, loadOverview, loadHealth])

  const loadSuspects = useCallback(async () => {
    setSuspectsLoading(true)
    try {
      setSuspects((await rpc('control_suspects', { p_limit: 60 })) || [])
    } catch (e) {
      flash((e as Error).message, false)
    }
    setSuspectsLoading(false)
  }, [rpc, flash])

  useEffect(() => {
    if (ready && tab === 'suspects') void loadSuspects()
  }, [ready, tab, version, loadSuspects])

  const loadUsers = useCallback(
    async (reset: boolean) => {
      setUsersLoading(true)
      try {
        const offset = reset ? 0 : usersRef.current.length
        const rows: any[] = (await rpc('control_search_users', { p_query: qDebounced, p_filter: filter, p_limit: 40, p_offset: offset })) || []
        setUsers((prev) => (reset ? rows : [...prev, ...rows]))
        setHasMore(rows.length === 40)
      } catch (e) {
        flash((e as Error).message, false)
      }
      setUsersLoading(false)
    },
    [rpc, qDebounced, filter, flash]
  )

  useEffect(() => {
    if (ready && tab === 'users') void loadUsers(true)
  }, [ready, tab, qDebounced, filter, version, loadUsers])

  useEffect(() => {
    if (!ready || tab !== 'journal') return
    ;(async () => {
      try {
        setAudit((await rpc('control_audit_log', { p_limit: 150 })) || [])
      } catch (e) {
        flash((e as Error).message, false)
      }
    })()
  }, [ready, tab, version, rpc, flash])

  const toggleSelect = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const done = (msg: string) => {
    flash(msg)
    setAction(null)
    setSelected([])
    setVersion((v) => v + 1)
  }

  const liftRestriction = async (id: string, feature: string) => {
    try {
      await rpc('control_set_restriction', { p_user_ids: [id], p_feature: feature, p_enable: false })
      flash(`${featureLabel(feature)} rétablis`)
      setVersion((v) => v + 1)
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const dismiss = async (id: string) => {
    try {
      await rpc('control_dismiss_suspect', { p_user_id: id, p_note: 'Vérifié par un admin' })
      setSuspects((s) => s.filter((x) => x.id !== id))
      flash('Écarté (30 jours)')
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const restoreGlobal = async (feature: string) => {
    try {
      await rpc('control_set_global_feature', { p_feature: feature, p_off: false })
      flash(`${featureLabel(feature)} rétablis pour tout le monde`)
      void loadOverview()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  if (!ready)
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )

  const ctx: Ctx = { rpc, flash, openUser: setDrawerId, version, bump: () => setVersion((v) => v + 1), adminId }
  const o = overview || {}
  const Kpi = ({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub?: string; tone?: string }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black mt-1 ${tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
  const Bar = ({ label, value, max }: { label: string; value: number | null | undefined; max: number }) => {
    const pct = value == null ? 0 : Math.min((value / max) * 100, 100)
    return (
      <div className="mb-3">
        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
          <span>{label}</span>
          <span>{bytes(value)} / {bytes(max)}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }
  const Badge = ({ children, tone }: { children: React.ReactNode; tone: string }) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${tone}`}>{children}</span>
  )
  const statusBadges = (u: any) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {u.is_blocked && <Badge tone="bg-red-100 text-red-700">Bloqué</Badge>}
      {u.suspended && !u.is_blocked && <Badge tone="bg-orange-100 text-orange-700">Suspendu</Badge>}
      {u.is_premium && <Badge tone="bg-amber-100 text-amber-700">Premium</Badge>}
      {(u.restrictions || []).filter((r: string) => r !== 'account').map((r: string) => (
        <Badge key={r} tone="bg-slate-200 text-slate-700">⛔ {featureLabel(r)}</Badge>
      ))}
    </div>
  )

  return (
    <main className="min-h-dvh bg-slate-50 pb-10">
      {toast && (
        <div role="status" className={`fixed left-3 right-3 z-[400] px-4 py-3 rounded-xl text-white text-sm font-bold shadow-xl ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`} style={{ top: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}>
          {toast.text}
        </div>
      )}

      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-3 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/admin" className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center" aria-label="Retour">‹</Link>
            <h1 className="text-lg font-black text-slate-900 flex-1">🛰️ Tour de contrôle</h1>
            {tab === 'overview' && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Direct · 10 s
              </span>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {([
              ['overview', 'Vue d’ensemble'],
              ['money', 'Argent'],
              ['withdrawals', `Retraits${Number(overview?.withdrawals_pending) > 0 ? ` (${overview.withdrawals_pending})` : ''}`],
              ['alerts', `Alertes${alertCount > 0 ? ` (${alertCount})` : ''}`],
              ['suspects', `Suspects${suspects.length ? ` (${suspects.length})` : ''}`],
              ['users', 'Utilisateurs'],
              ['growth', 'Croissance'],
              ['comms', 'Communication'],
              ['errors', 'Erreurs'],
              ['journal', 'Journal'],
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold ${tab === id ? 'bg-slate-900 text-white' : id === 'alerts' && alertCount > 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-white border border-slate-200 text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-3 space-y-4">
        {/* ───────── VUE D'ENSEMBLE ───────── */}
        {tab === 'overview' && (
          <>
            {(Number(o.payments_stuck) > 0 || Number(health?.withdrawals_over_72h) > 0 || Number(health?.proofs_over_24h) > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
                <p className="text-sm font-black text-red-700">⚠️ À traiter</p>
                {Number(o.payments_stuck) > 0 && <p className="text-xs text-red-700">{o.payments_stuck} paiement(s) LeekPay en attente depuis plus de 30 min.</p>}
                {Number(health?.withdrawals_over_72h) > 0 && <p className="text-xs text-red-700">{health.withdrawals_over_72h} retrait(s) en attente depuis plus de 72 h.</p>}
                {Number(health?.proofs_over_24h) > 0 && <p className="text-xs text-red-700">{health.proofs_over_24h} preuve(s) en attente depuis plus de 24 h.</p>}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Utilisateurs" value={fmt(o.users_total)} sub={`+${fmt(o.users_new_24h)} / 24 h · +${fmt(o.users_new_7d)} / 7 j`} />
              <Kpi label="En ligne maintenant" value={fmt(o.online_now)} sub={`${fmt(o.active_24h)} actifs sur 24 h`} tone="emerald" />
              <Kpi label="Restreints" value={fmt(o.restricted)} sub="au moins une fonction coupée" tone={Number(o.restricted) > 0 ? 'amber' : 'slate'} />
              <Kpi label="Suspendus / bloqués" value={fmt(Number(o.suspended) + Number(o.blocked))} sub={`${fmt(o.suspended)} suspendus · ${fmt(o.blocked)} bloqués`} tone={Number(o.blocked) + Number(o.suspended) > 0 ? 'red' : 'slate'} />
              <Kpi label="Soldes FCFA" value={`${fmt(o.balance_total)} F`} sub="total chez les utilisateurs" />
              <Kpi label="Jetons en circulation" value={fmt(o.coins_total)} />
              <Kpi label="Bonus parrainage dû" value={`${fmt(o.bonus_available)} F`} sub="disponible, non retiré" />
              <Kpi label="Premium" value={fmt(o.premium)} />
            </div>

            <div>
              <p className="text-xs font-black text-slate-500 uppercase mb-2">À valider</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/dashboard/admin/retraits" className="block"><Kpi label="Retraits" value={fmt(o.withdrawals_pending)} sub={`${fmt(o.withdrawals_pending_amount)} F`} tone={Number(o.withdrawals_pending) > 0 ? 'amber' : 'slate'} /></Link>
                <Link href="/dashboard/admin/taches" className="block"><Kpi label="Preuves tâches" value={fmt(o.task_proofs_pending)} tone={Number(o.task_proofs_pending) > 0 ? 'amber' : 'slate'} /></Link>
                <Link href="/dashboard/admin/preuves" className="block"><Kpi label="Preuves diffusion" value={fmt(o.ad_proofs_pending)} tone={Number(o.ad_proofs_pending) > 0 ? 'amber' : 'slate'} /></Link>
                <Link href="/dashboard/admin/annonces" className="block"><Kpi label="Campagnes" value={fmt(o.campaigns_pending)} tone={Number(o.campaigns_pending) > 0 ? 'amber' : 'slate'} /></Link>
              </div>
            </div>

            {/* INTERRUPTEURS GLOBAUX */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-slate-900 mb-1">Interrupteurs globaux</p>
              <p className="text-[11px] text-slate-500 mb-3">Couper une fonction pour <strong>tout le monde</strong> (ex. geler les retraits pendant une enquête). Elle est bloquée côté serveur.</p>
              <div className="divide-y divide-slate-100">
                {FEATURES.map((f) => {
                  const off = globals[f.id]?.off
                  return (
                    <div key={f.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-lg">{f.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">{f.label}</p>
                        <p className={`text-[11px] ${off ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>{off ? `Coupé${globals[f.id]?.reason ? ' : ' + globals[f.id].reason : ''}` : 'Actif'}</p>
                      </div>
                      {off ? (
                        <button onClick={() => restoreGlobal(f.id)} className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold">Rétablir</button>
                      ) : (
                        <button onClick={() => setAction({ kind: 'global', ids: [], feature: f.id, label: f.label })} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-200">Couper</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* SANTÉ */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-slate-900">Santé du site</p>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${latency == null ? 'bg-slate-100 text-slate-500' : latency < 800 ? 'bg-emerald-50 text-emerald-700' : latency < 2000 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  Réponse : {latency == null ? '—' : `${latency} ms`}
                </span>
              </div>
              <Bar label="Base de données (plan gratuit)" value={health?.db_size_bytes} max={500 * 1024 * 1024} />
              <Bar label="Stockage fichiers (plan gratuit)" value={health?.storage_bytes} max={1024 * 1024 * 1024} />
              {health?.rows && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                  {Object.entries(health.rows).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-500 capitalize">{k.replace('_', ' ')}</p>
                      <p className="text-sm font-black text-slate-900">{fmt(v)}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-3">Dernière actualisation : {lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR') : '—'}</p>
            </section>

            {/* FLUX EN DIRECT */}
            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-sm font-black text-slate-900">Activité en direct</p>
              </div>
              {feed.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucune activité sur les dernières 24 h.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
                  {feed.map((e, i) => (
                    <button key={i} onClick={() => e.uid && setDrawerId(e.uid)} className="w-full flex items-start gap-3 py-2.5 text-left">
                      <span className="text-lg shrink-0">{FEED_ICON[e.kind] || '•'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{e.user_name || 'Utilisateur'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{e.label}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{ago(e.ts)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ───────── SUSPECTS ───────── */}
        {tab === 'suspects' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Score calculé automatiquement (numéros partagés, rafales de filleuls, retraits trop rapides, preuves en rafale…).</p>
              <button onClick={() => void loadSuspects()} className="shrink-0 ml-2 text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg">Actualiser</button>
            </div>
            {suspectsLoading ? (
              <p className="text-center text-sm text-slate-500 py-10">Analyse en cours…</p>
            ) : suspects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">Aucun compte suspect pour le moment 🎉</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suspects.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white font-black ${Number(s.score) >= 70 ? 'bg-red-500' : Number(s.score) >= 40 ? 'bg-orange-500' : 'bg-amber-500'}`}>{s.score}</div>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => setDrawerId(s.id)} className="font-black text-slate-900 text-sm truncate block max-w-full text-left">{s.full_name || 'Utilisateur'}</button>
                        <p className="text-[11px] text-slate-500">{s.phone || 'pas de numéro'} · {fmt(s.balance)} F · inscrit {ago(s.created)}</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {(s.reasons || []).map((r: string, i: number) => (
                        <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-red-500">●</span>{r}</li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button onClick={() => setDrawerId(s.id)} className="py-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">Voir la fiche</button>
                      <button onClick={() => setAction({ kind: 'restrict', ids: [s.id] })} className="py-2.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">Restreindre</button>
                      <button onClick={() => setAction({ kind: 'suspend', ids: [s.id] })} className="py-2.5 rounded-lg bg-orange-100 text-orange-800 text-xs font-bold">Suspendre</button>
                      <button onClick={() => setAction({ kind: 'block', ids: [s.id] })} className="py-2.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold">Bloquer</button>
                    </div>
                    <button onClick={() => dismiss(s.id)} className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200">Ce n&apos;est pas suspect (écarter 30 jours)</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ───────── UTILISATEURS ───────── */}
        {tab === 'users' && (
          <>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, téléphone, email ou identifiant…" className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${filter === f.id ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{f.label}</button>
              ))}
            </div>

            {selected.length > 0 && (
              <div className="sticky top-[6.5rem] z-20 bg-slate-900 text-white rounded-2xl p-3 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">{selected.length} sélectionné(s)</p>
                  <button onClick={() => setSelected([])} className="text-[11px] text-slate-300">Tout désélectionner</button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setAction({ kind: 'restrict', ids: selected })} className="py-2 rounded-lg bg-amber-500 text-xs font-bold">Restreindre</button>
                  <button onClick={() => setAction({ kind: 'suspend', ids: selected })} className="py-2 rounded-lg bg-orange-500 text-xs font-bold">Suspendre</button>
                  <button onClick={() => setAction({ kind: 'block', ids: selected })} className="py-2 rounded-lg bg-red-500 text-xs font-bold">Bloquer</button>
                  <button onClick={() => setAction({ kind: 'unban', ids: selected })} className="py-2 rounded-lg bg-emerald-500 text-xs font-bold">Réhabiliter</button>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
              {users.length === 0 && !usersLoading && <p className="text-center text-sm text-slate-400 py-8">Aucun utilisateur trouvé.</p>}
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-5 h-5 accent-sky-500 shrink-0" aria-label="Sélectionner" />
                  <button onClick={() => setDrawerId(u.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <p className="text-sm font-bold text-slate-900 truncate">{u.full_name || 'Utilisateur'}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{u.phone || u.email || '—'} · {u.online ? 'en ligne' : `vu ${ago(u.last_seen)}`}</p>
                    {statusBadges(u)}
                  </button>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">{fmt(u.balance)} F</p>
                    <p className="text-[10px] text-slate-400">{fmt(u.coins_balance)} jetons</p>
                  </div>
                </div>
              ))}
              {usersLoading && <p className="text-center text-xs text-slate-400 py-4">Chargement…</p>}
            </div>
            {hasMore && !usersLoading && (
              <button onClick={() => void loadUsers(false)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700">Charger plus</button>
            )}
          </>
        )}

        {/* ───────── ONGLETS PARTIE 2 ───────── */}
        {tab === 'money' && <MoneyTab {...ctx} />}
        {tab === 'withdrawals' && <WithdrawalsTab {...ctx} />}
        {tab === 'alerts' && <AlertsTab {...ctx} />}
        {tab === 'growth' && <GrowthTab {...ctx} />}
        {tab === 'comms' && <CommsTab {...ctx} />}
        {tab === 'errors' && <ErrorsTab {...ctx} />}

        {/* ───────── JOURNAL ───────── */}
        {tab === 'journal' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
            {audit.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Aucune action enregistrée.</p>}
            {audit.map((a, i) => (
              <div key={i} className="p-3">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{String(a.action).replace(/_/g, ' ')}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  par {a.admin_name || 'admin'}{a.target_name ? ` → ${a.target_name}` : ''}
                  {a.details?.fonction ? ` · ${featureLabel(a.details.fonction)}` : ''}
                  {a.details?.motif ? ` · « ${a.details.motif} »` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawerId && <UserDrawer id={drawerId} version={version} rpc={rpc} onClose={() => setDrawerId(null)} onAction={setAction} onLift={liftRestriction} />}
      {action && <ActionModal action={action} rpc={rpc} onClose={() => setAction(null)} onDone={done} onError={(m) => flash(m, false)} />}
    </main>
  )
}

/* ───────────────────────── Fiche utilisateur 360° ───────────────────────── */
function UserDrawer({ id, version, rpc, onClose, onAction, onLift }: { id: string; version: number; rpc: (n: string, p?: Record<string, unknown>) => Promise<any>; onClose: () => void; onAction: (a: Action) => void; onLift: (id: string, feature: string) => void }) {
  const [u, setU] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ledger, setLedger] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await rpc('control_user_360', { p_user_id: id })
        if (!cancelled) {
          if (data?.error) setErr(data.error)
          else setU(data)
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message)
      }
    })()
    ;(async () => {
      try {
        const l = await rpc('control_user_ledger', { p_user_id: id, p_limit: 20 })
        if (!cancelled) setLedger(Array.isArray(l) ? l : [])
      } catch {
        /* partie 2 non installée */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, version, rpc])

  const banned = u?.banned_until && new Date(u.banned_until) > new Date()
  const restrictionOf = (f: string) => (u?.restrictions || []).find((r: any) => r.feature === f)
  const accountRestriction = restrictionOf('account')

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-slate-50 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
        {err && <p className="text-sm text-red-600 font-semibold text-center py-8">{err}</p>}
        {!u && !err && <p className="text-center text-sm text-slate-500 py-10">Chargement…</p>}
        {u && (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-2xl font-black shrink-0">{(u.full_name || '?').charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-slate-900 truncate">{u.full_name || 'Utilisateur'}</p>
                <p className="text-xs text-slate-500 truncate">{u.email || '—'}</p>
                <p className="text-xs text-slate-500">{u.phone || 'pas de numéro'}</p>
                <p className="text-[11px] text-slate-400">Inscrit {ago(u.created_at)} · vu {ago(u.last_seen)}</p>
              </div>
              <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-500 shrink-0">✕</button>
            </div>

            <div className={`rounded-xl p-3 mb-3 text-xs font-bold ${u.is_blocked ? 'bg-red-100 text-red-700' : banned ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {u.is_blocked ? '⛔ Compte bloqué' : banned ? `⏸️ Suspendu jusqu'au ${new Date(u.banned_until).toLocaleString('fr-FR')}` : '✅ Compte actif'}
              {accountRestriction?.reason ? ` — « ${accountRestriction.reason} »` : ''}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {u.is_blocked || banned ? (
                <button onClick={() => onAction({ kind: 'unban', ids: [id] })} className="col-span-2 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold">Réhabiliter le compte</button>
              ) : (
                <>
                  <button onClick={() => onAction({ kind: 'suspend', ids: [id] })} className="py-3 rounded-xl bg-orange-100 text-orange-800 text-sm font-bold">Suspendre</button>
                  <button onClick={() => onAction({ kind: 'block', ids: [id] })} className="py-3 rounded-xl bg-red-100 text-red-700 text-sm font-bold">Bloquer</button>
                </>
              )}
              <button onClick={() => onAction({ kind: 'logout', ids: [id] })} className="col-span-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold">Forcer la déconnexion</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                ['Solde', `${fmt(u.balance)} F`],
                ['Jetons', fmt(u.coins_balance)],
                ['Niveau', u.level ?? '—'],
                ['Tâches ✓/✗/⏳', `${u.tasks?.approved}/${u.tasks?.rejected}/${u.tasks?.pending}`],
                ['Diffusions ✓/✗/⏳', `${u.ads?.validated}/${u.ads?.rejected}/${u.ads?.pending}`],
                ['Filleuls', fmt(u.referrals)],
                ['Campagnes', fmt(u.campaigns)],
                ['Messages 24 h', fmt(u.messages_24h)],
                ['Même numéro', Number(u.same_phone_accounts) > 0 ? `⚠️ ${u.same_phone_accounts} autre(s)` : 'aucun'],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{k}</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{String(v)}</p>
                </div>
              ))}
            </div>
            {u.referred_by_name && <p className="text-[11px] text-slate-500 mb-3">Parrain : <strong>{u.referred_by_name}</strong></p>}

            <p className="text-xs font-black text-slate-500 uppercase mb-2">Fonctions de ce compte</p>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 mb-4">
              {FEATURES.map((f) => {
                const r = restrictionOf(f.id)
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3">
                    <span>{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{f.label}</p>
                      <p className={`text-[11px] ${r ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                        {r ? `Désactivé${r.expires_at ? ` jusqu'au ${new Date(r.expires_at).toLocaleDateString('fr-FR')}` : ''}${r.reason ? ` · ${r.reason}` : ''}` : 'Autorisé'}
                      </p>
                    </div>
                    {r ? (
                      <button onClick={() => onLift(id, f.id)} className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold">Rétablir</button>
                    ) : (
                      <button onClick={() => onAction({ kind: 'restrict', ids: [id], feature: f.id })} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold">Désactiver</button>
                    )}
                  </div>
                )
              })}
            </div>

            {(u.withdrawals || []).length > 0 && (
              <>
                <p className="text-xs font-black text-slate-500 uppercase mb-2">Derniers retraits</p>
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 mb-4">
                  {u.withdrawals.map((w: any, i: number) => (
                    <div key={i} className="flex justify-between p-3 text-xs">
                      <span className="font-bold text-slate-900">{fmt(w.amount)} F</span>
                      <span className="text-slate-500">{w.status} · {ago(w.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {ledger.length > 0 && (
              <>
                <p className="text-xs font-black text-slate-500 uppercase mb-2">Mouvements de solde</p>
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 mb-4">
                  {ledger.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 text-xs">
                      <span className={`font-black w-20 shrink-0 ${Number(e.delta) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{Number(e.delta) >= 0 ? '+' : ''}{fmt(e.delta)} {e.kind === 'fcfa' ? 'F' : '🪙'}</span>
                      <span className="flex-1 text-slate-700 truncate">{srcLabel(e.source)}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{ago(e.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs font-black text-slate-500 uppercase mb-2">Activité récente</p>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {(u.timeline || []).length === 0 && <p className="text-center text-xs text-slate-400 py-4">Aucune activité.</p>}
              {(u.timeline || []).map((e: any, i: number) => (
                <div key={i} className="flex gap-3 p-3 text-xs">
                  <span>{FEED_ICON[e.kind] || '•'}</span>
                  <span className="flex-1 text-slate-700">{e.label}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{ago(e.ts)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── Fenêtre de confirmation des actions ───────────────────────── */
function ActionModal({ action, rpc, onClose, onDone, onError }: { action: Action; rpc: (n: string, p?: Record<string, unknown>) => Promise<any>; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [features, setFeatures] = useState<string[]>(action.feature ? [action.feature] : [])
  const [duration, setDuration] = useState(action.kind === 'suspend' ? '7d' : '24h')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const n = action.ids.length

  const titles: Record<ActionKind, string> = {
    restrict: 'Désactiver des fonctions',
    suspend: 'Suspendre le compte',
    block: 'Bloquer définitivement',
    unban: 'Réhabiliter',
    logout: 'Forcer la déconnexion',
    global: `Couper « ${action.label} » pour tout le monde`,
  }

  const run = async () => {
    if (action.kind === 'restrict' && features.length === 0) return onError('Choisis au moins une fonction.')
    if ((action.kind === 'block' || action.kind === 'global') && reason.trim().length < 3) return onError('Indique un motif.')
    setBusy(true)
    try {
      let result: any
      if (action.kind === 'restrict') {
        for (const f of features) {
          result = await rpc('control_set_restriction', { p_user_ids: action.ids, p_feature: f, p_enable: true, p_reason: reason, p_until: until(duration) })
          if (result && result.success === false) throw new Error(result.error)
        }
        return onDone(`${features.length} fonction(s) désactivée(s) pour ${n} compte(s)`)
      }
      if (action.kind === 'suspend') result = await rpc('control_ban_users', { p_user_ids: action.ids, p_until: until(duration), p_reason: reason, p_block: false })
      else if (action.kind === 'block') result = await rpc('control_ban_users', { p_user_ids: action.ids, p_until: null, p_reason: reason, p_block: true })
      else if (action.kind === 'unban') result = await rpc('control_unban_users', { p_user_ids: action.ids })
      else if (action.kind === 'logout') result = await rpc('control_force_logout', { p_user_ids: action.ids })
      else result = await rpc('control_set_global_feature', { p_feature: action.feature, p_off: true, p_reason: reason })
      if (result && result.success === false) throw new Error(result.error)
      onDone(action.kind === 'global' ? `${action.label} coupé pour tout le monde` : `Action effectuée sur ${n} compte(s)`)
    } catch (e) {
      onError((e as Error).message)
    }
    setBusy(false)
  }

  const needsDuration = action.kind === 'restrict' || action.kind === 'suspend'
  const needsReason = action.kind !== 'unban' && action.kind !== 'logout'
  const danger = action.kind === 'block' || action.kind === 'global'

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/70 flex items-end md:items-center justify-center" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-900">{titles[action.kind]}</h2>
        {action.kind !== 'global' && <p className="text-xs text-slate-500 mb-4">{n} compte(s) concerné(s)</p>}

        {action.kind === 'restrict' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {FEATURES.map((f) => {
              const on = features.includes(f.id)
              return (
                <button key={f.id} type="button" onClick={() => setFeatures((s) => (on ? s.filter((x) => x !== f.id) : [...s, f.id]))} className={`p-3 rounded-xl border-2 text-left text-sm font-bold ${on ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700'}`}>
                  {f.icon} {f.label}
                </button>
              )
            })}
          </div>
        )}

        {needsDuration && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Durée</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base">
              {DURATIONS.filter((d) => action.kind !== 'suspend' || d.id !== 'forever').map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

        {needsReason && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Motif {danger ? '(obligatoire)' : '(facultatif, visible par l\'utilisateur pour une restriction)'}</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex : preuves truquées" className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400" />
          </div>
        )}

        {action.kind === 'block' && <p className="text-xs text-red-600 font-semibold mb-4">L&apos;utilisateur est déconnecté immédiatement et ne peut plus se reconnecter tant que tu ne le réhabilites pas.</p>}
        {action.kind === 'global' && <p className="text-xs text-red-600 font-semibold mb-4">Cette fonction sera bloquée pour TOUS les utilisateurs jusqu&apos;à ce que tu la rétablisses.</p>}
        {action.kind === 'unban' && <p className="text-xs text-slate-500 mb-4">Le compte pourra de nouveau se connecter. Les restrictions de fonctions restent en place (retire-les depuis la fiche).</p>}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} disabled={busy} className="py-3.5 rounded-xl bg-slate-100 text-slate-700 font-bold">Annuler</button>
          <button onClick={run} disabled={busy} className={`py-3.5 rounded-xl text-white font-bold disabled:opacity-60 ${danger ? 'bg-red-600' : action.kind === 'unban' ? 'bg-emerald-500' : 'bg-slate-900'}`}>{busy ? '…' : 'Confirmer'}</button>
        </div>
      </div>
    </div>
  )
}
