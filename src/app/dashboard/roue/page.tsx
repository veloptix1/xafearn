'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const SEGMENTS = [
  { label: '10', type: 'coins', amount: 10, color: '#0ea5e9' },
  { label: 'Perdu', type: 'nothing', amount: 0, color: '#64748b' },
  { label: '25', type: 'coins', amount: 25, color: '#3b82f6' },
  { label: 'Perdu', type: 'nothing', amount: 0, color: '#64748b' },
  { label: '100', type: 'coins', amount: 100, color: '#f59e0b' },
  { label: 'Perdu', type: 'nothing', amount: 0, color: '#64748b' },
  { label: '10', type: 'coins', amount: 10, color: '#0ea5e9' },
  { label: '500', type: 'coins', amount: 500, color: '#ef4444' },
]

export default function WheelPage() {
  const supabase = createClient()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [canSpin, setCanSpin] = useState<any>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: spinCheck } = await supabase.rpc('can_spin_wheel', { p_user_id: user.id })
      setCanSpin(spinCheck)

      setLoading(false)
    }
    load()
  }, [supabase, router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = 320, center = size / 2, radius = center - 10, anglePerSegment = (2 * Math.PI) / SEGMENTS.length

    ctx.clearRect(0, 0, size, size)
    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * anglePerSegment, endAngle = startAngle + anglePerSegment
      ctx.beginPath(); ctx.moveTo(center, center); ctx.arc(center, center, radius, startAngle, endAngle); ctx.closePath()
      ctx.fillStyle = seg.color; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke()
      ctx.save(); ctx.translate(center, center); ctx.rotate(startAngle + anglePerSegment / 2)
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial'
      ctx.fillText(seg.label, radius - 20, 6); ctx.restore()
    })
    ctx.beginPath(); ctx.arc(center, center, 30, 0, 2 * Math.PI); ctx.fillStyle = '#0f172a'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(center, 10); ctx.lineTo(center - 10, 30); ctx.lineTo(center + 10, 30); ctx.closePath(); ctx.fillStyle = '#0f172a'; ctx.fill()
  }, [])

  const spin = async () => {
    if (!profile || isSpinning || !canSpin?.can_spin) return
    if (!canSpin.free && (profile.coins_balance || 0) < canSpin.cost) return showToast(`Il te faut ${canSpin.cost} jetons.`, 'error')

    setIsSpinning(true); setResult(null)
    try {
      const { data, error } = await supabase.rpc('spin_wheel', { p_user_id: profile.id })
      if (error) throw error

      const finalRotation = rotation + 360 * 5 + Math.random() * 360
      setRotation(finalRotation)

      setTimeout(async () => {
        setResult(data); setIsSpinning(false)
        const { data: newProf } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
        setProfile(newProf)
        const { data: spinCheck } = await supabase.rpc('can_spin_wheel', { p_user_id: profile.id })
        setCanSpin(spinCheck)
        if (data.prize_type === 'coins') showToast(`🎉 +${data.prize_amount} jetons !`, 'success')
        else showToast('😢 Perdu...', 'info')
      }, 4000)
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error'); setIsSpinning(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  if (canSpin && !canSpin.can_spin) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-lg">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Roue désactivée</h2>
          <p className="text-slate-500 text-sm mb-6">La roue est momentanément indisponible. Reviens plus tard !</p>
          <Link href="/dashboard" className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl inline-block">Retour</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Roue de la Fortune</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 mb-6 text-white shadow-lg flex justify-between">
          <div><p className="text-xs font-bold text-amber-100 uppercase mb-1">Jetons</p><p className="text-2xl font-black">🪙 {profile?.coins_balance || 0}</p></div>
          <div className="text-right"><p className="text-xs font-bold text-amber-100 uppercase mb-1">Crédits IA</p><p className="text-2xl font-black">🤖 {profile?.credits_ia || 0}</p></div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: '4s', transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            <canvas ref={canvasRef} className="w-80 h-80 drop-shadow-2xl" />
          </div>
        </div>

        <div className="text-center">
          {result && !isSpinning && (
            <div className={`mb-4 p-4 rounded-2xl ${result.prize_type === 'nothing' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {result.prize_type === 'coins' ? <p className="text-lg font-black">🎉 +{result.prize_amount} Jetons !</p> : <p className="text-lg font-black">😢 Perdu... Réessaie !</p>}
            </div>
          )}

          <button onClick={spin} disabled={isSpinning} className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-[0.98] transition disabled:opacity-50">
            {isSpinning ? 'La roue tourne...' : canSpin?.free ? `🎯 TOURNER GRATUITEMENT (${canSpin.remaining_free} restant(s))` : `💰 TOURNER (${canSpin?.cost} jetons)`}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 mt-6">
          <h3 className="font-bold text-slate-900 mb-2 text-sm">📋 Règles</h3>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Tours gratuits aujourd'hui : {canSpin?.remaining_free || 0}</li>
            <li>• Prix après épuisement : {canSpin?.cost || 5} jetons</li>
            <li>• Jackpot : 500 jetons</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
