'use client'

import { useState, useEffect, useCallback } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Rpc = (name: string, params?: Record<string, unknown>) => Promise<any>
export type Ctx = {
  rpc: Rpc
  flash: (text: string, ok?: boolean) => void
  openUser: (id: string) => void
  version: number
  bump: () => void
  adminId: string
}

const fmt = (n: unknown) => Math.round(Number(n) || 0).toLocaleString('fr-FR')
const ago = (iso?: string | null) => {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}
const SOURCE_LABELS: Record<string, string> = {
  inconnu: '❓ Origine inconnue', bonus_quotidien: 'Bonus quotidien', roue: 'Roue', coffre: 'Coffres', pourboire: 'Pourboires',
  retrait: 'Retraits FCFA', retrait_jetons: 'Retraits de jetons', achat_jetons: 'Achat de jetons', conversion_jetons: 'Conversion jetons',
  campagne: 'Campagnes', paiement_leekpay: 'Paiements LeekPay', episode: 'Épisodes', produit_marche: 'Marché', retrait_bonus: 'Retrait bonus',
  bonus_vers_solde: 'Bonus → solde', credits_ia: 'Crédits IA', activation_premium: 'Activation Premium', ajustement_admin: 'Ajustement admin',
  validation_preuve: 'Validation de preuve', traitement_retrait: 'Traitement de retrait', traitement_campagne: 'Traitement de campagne', suppression_compte: 'Suppression de compte',
}
export const srcLabel = (s: string) => SOURCE_LABELS[s] || s
const CAPPABLE = ['roue', 'bonus_quotidien', 'coffre', 'pourboire', 'ajustement_admin', 'validation_preuve']

const Card = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-black text-slate-900">{title}</p>
      {right}
    </div>
    {children}
  </section>
)
const Stat = ({ label, value, tone = 'slate' }: { label: string; value: string; tone?: string }) => (
  <div className="bg-slate-50 rounded-xl p-3">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    <p className={`text-lg font-black ${tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
  </div>
)
const Loading = () => <p className="text-center text-sm text-slate-500 py-10">Chargement…</p>
const Empty = ({ text }: { text: string }) => <p className="text-center text-xs text-slate-400 py-6">{text}</p>

/* ───────────────────────────── ARGENT ───────────────────────────── */
export function MoneyTab({ rpc, flash, openUser, version, bump }: Ctx) {
  const [t, setT] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)
  const [eco, setEco] = useState<any>(null)
  const [simRate, setSimRate] = useState('')
  const [capForm, setCapForm] = useState({ source: 'roue', kind: 'coins', max: '' })
  const [limits, setLimits] = useState({ user: '', global: '', auto: '' })

  useEffect(() => {
    ;(async () => {
      try {
        const [tr, lg, ec] = await Promise.all([rpc('control_treasury', { p_days: 30 }), rpc('control_ledger_overview', { p_hours: 24 }), rpc('control_get_economy')])
        setT(tr)
        setLedger(lg)
        setEco(ec)
        setSimRate(String(tr?.liabilities?.coin_rate ?? 0.3))
        setLimits({ user: String(ec?.limit_user_daily || ''), global: String(ec?.limit_global_daily || ''), auto: String(ec?.auto_hold_score || '') })
      } catch (e) {
        flash((e as Error).message, false)
      }
    })()
  }, [rpc, flash, version])

  const saveCap = async (source: string, kind: string, max: number, enabled: boolean) => {
    try {
      const r = await rpc('control_set_cap', { p_source: source, p_kind: kind, p_daily_max: max, p_enabled: enabled })
      if (r?.success === false) throw new Error(r.error)
      flash('Plafond enregistré')
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }
  const saveLimit = async (key: string, value: string) => {
    try {
      const r = await rpc('control_set_limit', { p_key: key, p_value: Number(value) || 0 })
      if (r?.success === false) throw new Error(r.error)
      flash('Enregistré')
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const exportCsv = async (kind: string) => {
    try {
      const rows: any[] = (await rpc('control_export', { p_kind: kind, p_days: 90 })) || []
      if (rows.length === 0) return flash('Rien à exporter', false)
      const cols = Object.keys(rows[0])
      const esc = (v: unknown) => `"${String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"`
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
      const native = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
      if (native) {
        await navigator.clipboard.writeText(csv)
        return flash(`${rows.length} lignes copiées : colle-les dans un tableur`)
      }
      const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `xafearn-${kind}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      flash(`${rows.length} lignes exportées`)
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const purge = async () => {
    if (!confirm('Supprimer les anciennes données techniques (erreurs > 14 j, livre > 180 j, alertes résolues > 60 j) ?')) return
    try {
      const r = await rpc('control_purge_now')
      flash(`Nettoyé : ${r.errors} erreurs, ${r.ledger} lignes du livre, ${r.alerts} alertes`)
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  if (!t || !ledger || !eco) return <Loading />
  const L = t.liabilities
  const rate = Number(simRate) || 0
  const simCoins = Number(L.coins) * rate
  const debt = Number(L.balance) + simCoins + Number(L.bonus) + Number(L.withdrawals_pending)
  const net = Number(t.totals.deposits) - Number(t.totals.processed)
  const maxDay = Math.max(1, ...t.days.map((d: any) => Math.max(Number(d.deposits), Number(d.processed))))
  const todayBySrc = Object.fromEntries((eco.today || []).filter((x: any) => x.kind).map((x: any) => [`${x.source}|${x.kind}`, Number(x.credited) || 0]))

  return (
    <div className="space-y-4">
      <Card title="Trésorerie (30 jours)">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Entrées LeekPay" value={`${fmt(t.totals.deposits)} F`} tone="emerald" />
          <Stat label="Retraits traités" value={`${fmt(t.totals.processed)} F`} tone="red" />
          <Stat label="Net estimé" value={`${fmt(net)} F`} tone={net >= 0 ? 'emerald' : 'red'} />
        </div>
        <div className="flex items-end gap-[3px] h-24" aria-label="Entrées et sorties par jour">
          {t.days.map((d: any) => (
            <div key={d.day} className="flex-1 flex items-end gap-px h-full" title={`${d.day} : +${fmt(d.deposits)} / -${fmt(d.processed)}`}>
              <div className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${(Number(d.deposits) / maxDay) * 100}%` }} />
              <div className="flex-1 bg-red-400 rounded-t" style={{ height: `${(Number(d.processed) / maxDay) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Vert : entrées · Rouge : retraits traités. « Net » = entrées LeekPay − retraits traités depuis le début.</p>
      </Card>

      <Card title="Ce que tu dois à tes utilisateurs">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="Soldes FCFA" value={`${fmt(L.balance)} F`} />
          <Stat label={`Jetons (${fmt(L.coins)})`} value={`${fmt(simCoins)} F`} />
          <Stat label="Bonus parrainage" value={`${fmt(L.bonus)} F`} />
          <Stat label="Retraits en attente" value={`${fmt(L.withdrawals_pending)} F`} tone="amber" />
        </div>
        <div className="flex items-center justify-between bg-slate-900 text-white rounded-xl p-3 mb-3">
          <span className="text-xs font-bold">Dette totale estimée</span>
          <span className="text-lg font-black">{fmt(debt)} F</span>
        </div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1">Simulateur : valeur d&apos;un jeton (FCFA)</label>
        <input type="number" inputMode="decimal" step="0.05" value={simRate} onChange={(e) => setSimRate(e.target.value)} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base" />
        <p className="text-[10px] text-slate-400 mt-1">Change la valeur pour voir combien tes jetons en circulation te coûteraient si tout le monde les convertissait.</p>
        <p className="text-[11px] text-slate-500 mt-2">Marge déjà prélevée sur les conversions : <strong>{fmt(t.conversion_margin)}</strong></p>
      </Card>

      <Card title="Grand livre — dernières 24 h" right={<span className="text-[10px] text-slate-400">d&apos;où vient chaque mouvement</span>}>
        {ledger.by_source.length === 0 ? <Empty text="Aucun mouvement enregistré pour l'instant (le livre se remplit à partir de maintenant)." /> : (
          <div className="divide-y divide-slate-100">
            {ledger.by_source.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-2 text-xs">
                <span className="flex-1 font-bold text-slate-800">{srcLabel(r.source)} <span className="text-slate-400 font-normal">· {r.kind === 'fcfa' ? 'FCFA' : 'jetons'}</span></span>
                <span className="text-emerald-600 font-bold">+{fmt(r.credits)}</span>
                <span className="text-red-500 font-bold w-16 text-right">-{fmt(r.debits)}</span>
              </div>
            ))}
          </div>
        )}
        {ledger.unknown.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-black text-amber-800 mb-1">⚠️ Crédits d&apos;origine inconnue</p>
            <p className="text-[10px] text-amber-700 mb-2">Soldes modifiés sans passer par une fonction connue (écriture directe ou fonction non étiquetée).</p>
            {ledger.unknown.map((u: any, i: number) => (
              <button key={i} onClick={() => openUser(u.user_id)} className="w-full flex justify-between py-1.5 text-xs text-left">
                <span className="font-bold text-slate-800">{u.full_name || 'Utilisateur'}</span>
                <span className="text-amber-800 font-bold">+{fmt(u.credited)} {u.kind === 'fcfa' ? 'F' : 'jetons'}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Plafonds journaliers" right={<span className="text-[10px] text-slate-400">budget max par jour</span>}>
        <p className="text-[11px] text-slate-500 mb-3">Quand le total gagné aujourd&apos;hui grâce à une fonction atteint le plafond, elle s&apos;arrête jusqu&apos;à demain pour tout le monde.</p>
        {(eco.caps || []).map((c: any) => (
          <div key={`${c.source}${c.kind}`} className="flex items-center gap-2 py-2 border-b border-slate-100 text-xs">
            <span className="flex-1 font-bold text-slate-800">{srcLabel(c.source)} <span className="text-slate-400 font-normal">({c.kind === 'fcfa' ? 'F' : 'jetons'})</span></span>
            <span className="text-slate-500">{fmt(todayBySrc[`${c.source}|${c.kind}`] || 0)} / {fmt(c.daily_max)}</span>
            <button onClick={() => saveCap(c.source, c.kind, Number(c.daily_max), !c.enabled)} className={`px-2.5 py-1.5 rounded-lg font-bold ${c.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.enabled ? 'Actif' : 'Off'}</button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <select value={capForm.source} onChange={(e) => setCapForm({ ...capForm, source: e.target.value })} className="col-span-2 h-11 px-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
            {CAPPABLE.map((s) => <option key={s} value={s}>{srcLabel(s)}</option>)}
          </select>
          <select value={capForm.kind} onChange={(e) => setCapForm({ ...capForm, kind: e.target.value })} className="h-11 px-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
            <option value="coins">jetons</option>
            <option value="fcfa">FCFA</option>
          </select>
          <input type="number" inputMode="numeric" placeholder="Plafond par jour" value={capForm.max} onChange={(e) => setCapForm({ ...capForm, max: e.target.value })} className="col-span-2 h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base" />
          <button onClick={() => capForm.max && saveCap(capForm.source, capForm.kind, Number(capForm.max), true)} className="h-11 rounded-xl bg-slate-900 text-white text-sm font-bold">Ajouter</button>
        </div>
      </Card>

      <Card title="Limites de retrait et gel automatique">
        {([['user', 'Max par utilisateur et par jour (F)', limits.user, 'user_daily'], ['global', 'Max pour tous les utilisateurs par jour (F)', limits.global, 'global_daily'], ['auto', 'Geler les retraits d\'un compte dont le score dépasse', limits.auto, 'auto_hold_score']] as [string, string, string, string][]).map(([k, label, val, key]) => (
          <div key={k} className="mb-3">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">{label} <span className="font-normal">(0 = désactivé)</span></label>
            <div className="flex gap-2">
              <input type="number" inputMode="numeric" value={val} onChange={(e) => setLimits({ ...limits, [k]: e.target.value })} className="flex-1 h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base" />
              <button onClick={() => saveLimit(key, val)} className="px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">OK</button>
            </div>
          </div>
        ))}
      </Card>

      <Card title="Données">
        <p className="text-[11px] text-slate-500 mb-3">Exporte régulièrement tes données : le plan gratuit n&apos;offre pas de sauvegarde automatique complète.</p>
        <div className="grid grid-cols-2 gap-2">
          {[['users', 'Utilisateurs & soldes'], ['withdrawals', 'Retraits'], ['payments', 'Paiements'], ['ledger', 'Grand livre'], ['audit', 'Journal admin']].map(([k, l]) => (
            <button key={k} onClick={() => exportCsv(k)} className="py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">⬇ {l}</button>
          ))}
          <button onClick={purge} className="py-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold">🧹 Nettoyer</button>
        </div>
      </Card>
    </div>
  )
}

/* ───────────────────────── FILE DES RETRAITS ───────────────────────── */
export function WithdrawalsTab({ rpc, flash, openUser, version, bump, adminId }: Ctx) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRows((await rpc('control_withdrawal_queue', { p_limit: 80 })) || [])
    } catch (e) {
      flash((e as Error).message, false)
      setRows([])
    }
  }, [rpc, flash])
  useEffect(() => {
    void load()
  }, [load, version])

  const process = async (w: any, action: 'approve' | 'reject') => {
    if (!confirm(`${action === 'approve' ? 'Approuver' : 'Rejeter et rembourser'} le retrait de ${fmt(w.amount)} F de ${w.full_name || 'cet utilisateur'} ?`)) return
    setBusy(w.id)
    try {
      const data = await rpc('admin_process_withdrawal', { p_withdrawal_id: w.id, p_admin_id: adminId, p_action: action })
      if (data && data.success === false) throw new Error(data.error)
      flash(action === 'approve' ? 'Retrait approuvé' : 'Retrait rejeté et remboursé')
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
    setBusy(null)
  }
  const freeze = async (w: any) => {
    try {
      await rpc('control_set_restriction', { p_user_ids: [w.user_id], p_feature: 'withdraw', p_enable: true, p_reason: 'Vérification en cours', p_until: null })
      flash('Retraits de ce compte gelés')
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  if (!rows) return <Loading />
  const tone = (l: string) => (l === 'high' ? 'bg-red-500' : l === 'medium' ? 'bg-amber-500' : 'bg-emerald-500')
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Retraits en attente, les plus risqués d&apos;abord. Vérifie avant d&apos;approuver.</p>
      {rows.length === 0 && <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">Aucun retrait en attente 🎉</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((w) => (
          <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 shrink-0 rounded-xl text-white font-black flex items-center justify-center ${tone(w.level)}`}>{w.score}</div>
              <div className="min-w-0 flex-1">
                <button onClick={() => openUser(w.user_id)} className="font-black text-slate-900 text-sm truncate block max-w-full text-left">{w.full_name || 'Utilisateur'}</button>
                <p className="text-lg font-black text-slate-900">{fmt(w.amount)} F</p>
                <p className="text-[11px] text-slate-500">{w.method || '—'} · {w.phone || 'pas de numéro'} · {ago(w.created_at)}</p>
                <p className="text-[11px] text-slate-400">Solde restant : {fmt(w.user_balance)} F</p>
              </div>
            </div>
            {w.reasons.length > 0 && (
              <ul className="mt-3 space-y-1">
                {w.reasons.map((r: string, i: number) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className={w.level === 'high' ? 'text-red-500' : 'text-amber-500'}>●</span>{r}</li>)}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button disabled={busy === w.id} onClick={() => process(w, 'reject')} className="py-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold disabled:opacity-50">Rejeter</button>
              <button disabled={busy === w.id} onClick={() => process(w, 'approve')} className="py-3 rounded-lg bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">Approuver</button>
            </div>
            <button onClick={() => freeze(w)} className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200">Geler les retraits de ce compte</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────── ALERTES ───────────────────────────── */
export function AlertsTab({ rpc, flash, openUser, version, bump }: Ctx) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [resolved, setResolved] = useState(false)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows((await rpc('control_alerts_list', { p_resolved: resolved })) || [])
    } catch (e) {
      flash((e as Error).message, false)
      setRows([])
    }
  }, [rpc, flash, resolved])

  const analyse = useCallback(async (silent = false) => {
    setRunning(true)
    try {
      const r = await rpc('control_run_rules')
      if (!silent) flash(`${r.created} nouvelle(s) alerte(s)${r.frozen ? ` · ${r.frozen} compte(s) gelé(s)` : ''}`)
    } catch (e) {
      if (!silent) flash((e as Error).message, false)
    }
    setRunning(false)
    void load()
  }, [rpc, flash, load])

  useEffect(() => {
    void analyse(true)
  }, [version]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load()
  }, [load])

  const resolve = async (id: string) => {
    try {
      await rpc('control_resolve_alert', { p_id: id })
      setRows((r) => (r || []).filter((x) => x.id !== id))
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }
  const digest = async () => {
    try {
      await rpc('control_digest_now')
      flash('Résumé envoyé dans tes notifications')
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const icon: Record<string, string> = { critical: '🔴', warning: '🟠', info: '🔵' }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => analyse(false)} disabled={running} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60">{running ? 'Analyse…' : '🔍 Analyser maintenant'}</button>
        <button onClick={digest} className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold">Résumé du jour</button>
      </div>
      <div className="flex gap-2">
        {[[false, 'Ouvertes'], [true, 'Résolues']].map(([v, l]) => (
          <button key={String(l)} onClick={() => { setRows(null); setResolved(v as boolean) }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${resolved === v ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{l as string}</button>
        ))}
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">{resolved ? 'Aucune alerte résolue.' : 'Tout est calme 🎉'}</div> : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {rows.map((a) => (
            <div key={a.id} className="p-3 flex gap-3">
              <span>{icon[a.severity]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{a.message}</p>
                <p className="text-[11px] text-slate-400">{ago(a.created_at)}</p>
                <div className="flex gap-2 mt-2">
                  {a.user_id && <button onClick={() => openUser(a.user_id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">Voir la fiche</button>}
                  {!a.resolved && <button onClick={() => resolve(a.id)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">Marquer résolue</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-[11px] text-sky-900 leading-relaxed">
        <p className="font-black mb-1">Alertes automatiques</p>
        Les alertes critiques t&apos;arrivent aussi en notification (et en notification push une fois Firebase configuré). Pour une analyse toute seule toutes les 10 minutes et un résumé chaque matin, active <strong>pg_cron</strong> dans Supabase (voir les dernières lignes de <code>11_argent_alertes_croissance.sql</code>). Sans cela, l&apos;analyse se fait à l&apos;ouverture de cet onglet.
      </div>
    </div>
  )
}

/* ───────────────────────── CROISSANCE & CAMPAGNES ───────────────────────── */
export function GrowthTab({ rpc, flash, openUser, version }: Ctx) {
  const [g, setG] = useState<any>(null)
  const [c, setC] = useState<any>(null)
  const [ip, setIp] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const [gg, cc, ii] = await Promise.all([rpc('control_growth', { p_days: 30 }), rpc('control_campaign_stats'), rpc('control_ip_clusters')])
        setG(gg)
        setC(cc)
        setIp(ii || [])
      } catch (e) {
        flash((e as Error).message, false)
      }
    })()
  }, [rpc, flash, version])

  if (!g || !c) return <Loading />
  const f = g.funnel
  const steps: [string, number][] = [['Inscrits', f.signups], ['Ont tenté une tâche', f.with_task], ['Premium', f.premium], ['Ont demandé un retrait', f.withdrew]]
  const maxDay = Math.max(1, ...g.signups_by_day.map((d: any) => Number(d.n)))

  return (
    <div className="space-y-4">
      <Card title="Entonnoir — inscrits des 30 derniers jours">
        {steps.map(([label, n]) => (
          <div key={label} className="mb-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1"><span>{label}</span><span>{fmt(n)} · {f.signups ? Math.round((Number(n) / Number(f.signups)) * 100) : 0} %</span></div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-sky-500 rounded-full" style={{ width: `${f.signups ? (Number(n) / Number(f.signups)) * 100 : 0}%` }} /></div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Stat label="Reviennent après 1 jour" value={g.retention.d1 == null ? '—' : `${g.retention.d1} %`} />
          <Stat label="Reviennent après 7 jours" value={g.retention.d7 == null ? '—' : `${g.retention.d7} %`} />
        </div>
      </Card>

      <Card title="Inscriptions par jour">
        {g.signups_by_day.length === 0 ? <Empty text="Aucune inscription sur la période." /> : (
          <div className="flex items-end gap-[3px] h-24">
            {g.signups_by_day.map((d: any) => (
              <div key={d.day} className="flex-1 bg-sky-400 rounded-t" style={{ height: `${(Number(d.n) / maxDay) * 100}%`, minHeight: 3 }} title={`${d.day} : ${d.n}`} />
            ))}
          </div>
        )}
      </Card>

      <Card title="Meilleurs parrains">
        {g.top_referrers.length === 0 ? <Empty text="Pas encore de parrainage." /> : g.top_referrers.map((r: any, i: number) => (
          <button key={r.id} onClick={() => openUser(r.id)} className="w-full flex items-center gap-3 py-2 border-b border-slate-100 text-left">
            <span className="w-6 text-xs font-black text-slate-400">{i + 1}</span>
            <span className="flex-1 text-sm font-bold text-slate-900 truncate">{r.full_name || 'Utilisateur'}</span>
            <span className="text-xs text-slate-500">{r.referrals} filleuls · <strong className={Number(r.active) < Number(r.referrals) / 2 ? 'text-amber-600' : 'text-emerald-600'}>{r.active} actifs</strong></span>
          </button>
        ))}
      </Card>

      <Card title="Campagnes et diffusions">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="Budget vendu" value={`${fmt(c.budget_total)} F`} />
          <Stat label="Vues achetées" value={fmt(c.views_purchased)} />
          <Stat label="Vues validées" value={fmt(c.views_validated)} tone="emerald" />
          <Stat label="Campagnes" value={Object.entries(c.campaigns_by_status).map(([k, v]) => `${v} ${k}`).join(' · ') || '—'} />
        </div>
        <p className="text-[11px] font-black text-slate-500 uppercase mb-1">Meilleurs diffuseurs</p>
        {c.top_diffusers.length === 0 ? <Empty text="Aucune diffusion validée." /> : c.top_diffusers.map((d: any) => (
          <button key={d.id} onClick={() => openUser(d.id)} className="w-full flex justify-between py-1.5 text-xs text-left"><span className="font-bold text-slate-800">{d.full_name || 'Utilisateur'}</span><span className="text-slate-500">{d.validated} validées · {fmt(d.views)} vues</span></button>
        ))}
        {c.click_anomalies.length > 0 && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-black text-red-700 mb-1">⚠️ Clics anormaux (clics bien supérieurs aux vues)</p>
            {c.click_anomalies.map((d: any) => (
              <button key={d.id + d.clicks} onClick={() => openUser(d.id)} className="w-full flex justify-between py-1 text-xs text-left"><span className="font-bold text-slate-800">{d.full_name || 'Utilisateur'}</span><span className="text-red-700">{d.clicks} clics / {d.views} vues</span></button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Comptes qui partagent la même adresse IP">
        {ip.length === 0 ? <Empty text="Aucun groupe détecté (ou information non disponible)." /> : ip.map((x) => (
          <div key={x.ip} className="py-2 border-b border-slate-100 text-xs">
            <p className="font-bold text-slate-900">{x.ip} <span className="text-amber-600">· {x.accounts} comptes</span></p>
            <p className="text-slate-500 truncate">{(x.names || []).join(', ')}</p>
          </div>
        ))}
        <p className="text-[10px] text-slate-400 mt-2">Attention : sur mobile, plusieurs vrais utilisateurs peuvent partager la même IP d&apos;opérateur. À croiser avec les autres signaux.</p>
      </Card>
    </div>
  )
}

/* ───────────────────────── COMMUNICATION ───────────────────────── */
const AUDIENCES = [['all', 'Tout le monde'], ['premium', 'Comptes Premium'], ['new7', 'Nouveaux (7 jours)'], ['inactive7', 'Inactifs depuis 7 jours'], ['restricted', 'Comptes restreints']]
export function CommsTab({ rpc, flash, version, bump }: Ctx) {
  const [list, setList] = useState<any[] | null>(null)
  const [ann, setAnn] = useState({ title: '', message: '', audience: 'all', level: 'info', days: '3' })
  const [bc, setBc] = useState({ title: '', message: '', audience: 'all' })

  useEffect(() => {
    ;(async () => {
      try {
        setList((await rpc('control_announcements_list')) || [])
      } catch (e) {
        flash((e as Error).message, false)
        setList([])
      }
    })()
  }, [rpc, flash, version])

  const saveAnn = async () => {
    try {
      const expires = ann.days === '0' ? null : new Date(Date.now() + Number(ann.days) * 86400e3).toISOString()
      const r = await rpc('control_announcement_save', { p_title: ann.title, p_message: ann.message, p_audience: ann.audience, p_level: ann.level, p_expires_at: expires })
      if (r?.success === false) throw new Error(r.error)
      flash('Annonce publiée')
      setAnn({ ...ann, title: '', message: '' })
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }
  const toggle = async (id: string, active: boolean) => {
    try {
      await rpc('control_announcement_toggle', { p_id: id, p_active: active })
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }
  const send = async () => {
    const aud = AUDIENCES.find((a) => a[0] === bc.audience)?.[1]
    if (!confirm(`Envoyer ce message à « ${aud} » ? Il arrivera en notification (et en push) sur chaque compte.`)) return
    try {
      const r = await rpc('control_broadcast', { p_audience: bc.audience, p_title: bc.title, p_message: bc.message })
      if (r?.success === false) throw new Error(r.error)
      flash(`Message envoyé à ${r.sent} compte(s)`)
      setBc({ ...bc, title: '', message: '' })
    } catch (e) {
      flash((e as Error).message, false)
    }
  }

  const input = 'w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400'
  return (
    <div className="space-y-4">
      <Card title="Bandeau d'annonce dans l'app et sur le site">
        <div className="space-y-2">
          <input className={input} placeholder="Titre (ex. Maintenance ce soir)" value={ann.title} maxLength={120} onChange={(e) => setAnn({ ...ann, title: e.target.value })} />
          <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400" rows={3} maxLength={600} placeholder="Message" value={ann.message} onChange={(e) => setAnn({ ...ann, message: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <select className={input} value={ann.level} onChange={(e) => setAnn({ ...ann, level: e.target.value })}><option value="info">Info</option><option value="warning">Important</option><option value="maintenance">Maintenance</option></select>
            <select className={input} value={ann.audience} onChange={(e) => setAnn({ ...ann, audience: e.target.value })}>{AUDIENCES.filter((a) => a[0] !== 'inactive7').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select className={input} value={ann.days} onChange={(e) => setAnn({ ...ann, days: e.target.value })}><option value="1">1 jour</option><option value="3">3 jours</option><option value="7">7 jours</option><option value="0">Jusqu&apos;à retrait</option></select>
          </div>
          <button onClick={saveAnn} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold">Publier le bandeau</button>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {(list || []).map((a) => (
            <div key={a.id} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{a.title}</p><p className="text-[11px] text-slate-500 truncate">{AUDIENCES.find((x) => x[0] === a.audience)?.[1]} · {a.level}{a.expires_at ? ` · jusqu'au ${new Date(a.expires_at).toLocaleDateString('fr-FR')}` : ''}</p></div>
              <button onClick={() => toggle(a.id, !a.active)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{a.active ? 'Actif' : 'Retiré'}</button>
            </div>
          ))}
          {list && list.length === 0 && <Empty text="Aucune annonce." />}
        </div>
      </Card>

      <Card title="Message à un groupe (notification + push)">
        <div className="space-y-2">
          <select className={input} value={bc.audience} onChange={(e) => setBc({ ...bc, audience: e.target.value })}>{AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input className={input} placeholder="Titre (ex. Ton bonus t'attend)" value={bc.title} maxLength={80} onChange={(e) => setBc({ ...bc, title: e.target.value })} />
          <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400" rows={3} maxLength={300} placeholder="Message" value={bc.message} onChange={(e) => setBc({ ...bc, message: e.target.value })} />
          <button onClick={send} className="w-full py-3 rounded-xl bg-sky-500 text-white text-sm font-bold">Envoyer</button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Maximum 5 000 destinataires par envoi. Les administrateurs sont exclus.</p>
      </Card>
    </div>
  )
}

/* ───────────────────────── ERREURS DE L'APP ───────────────────────── */
export function ErrorsTab({ rpc, flash, version, bump }: Ctx) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        setRows((await rpc('control_errors', { p_hours: 72 })) || [])
      } catch (e) {
        flash((e as Error).message, false)
        setRows([])
      }
    })()
  }, [rpc, flash, version])
  const clear = async () => {
    if (!confirm('Effacer toutes les erreurs enregistrées ?')) return
    try {
      await rpc('control_errors_clear')
      bump()
    } catch (e) {
      flash((e as Error).message, false)
    }
  }
  if (!rows) return <Loading />
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Plantages et erreurs remontés automatiquement par l&apos;app et le site (72 h).</p>
        {rows.length > 0 && <button onClick={clear} className="shrink-0 ml-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Effacer</button>}
      </div>
      {rows.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">Aucune erreur 🎉</div> : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {rows.map((r, i) => (
            <details key={i} className="p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 min-w-8 text-center text-xs font-black bg-red-100 text-red-700 rounded-md px-1.5 py-0.5">{r.n}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 break-words">{r.message}</p>
                    <p className="text-[11px] text-slate-500">{r.route || '—'} · {r.platform || 'web'} · {r.users} utilisateur(s) · {ago(r.last_at)}</p>
                  </div>
                </div>
              </summary>
              {r.stack && <pre className="mt-2 text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{r.stack}</pre>}
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
