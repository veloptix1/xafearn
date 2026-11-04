import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { treasureId, code } = await req.json()

    if (!treasureId || !code) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // 1. Récupérer le coffre
    const { data: treasure } = await supabase.from('treasures').select('*').eq('id', treasureId).single()
    if (!treasure) return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
    if (treasure.status !== 'active') return NextResponse.json({ error: 'Ce coffre est déjà terminé ou expiré.' }, { status: 400 })

    // 2. Vérifier si l'utilisateur a déjà gagné ce coffre
    const { data: existingWinner } = await supabase.from('treasure_winners').select('*').eq('treasure_id', treasureId).eq('user_id', user.id).single()
    if (existingWinner) return NextResponse.json({ error: 'Tu as déjà gagné ce coffre !' }, { status: 400 })

    // 3. Vérifier les tentatives (max 3)
    const { count: attemptsCount } = await supabase.from('treasure_attempts').select('*', { count: 'exact', head: true }).eq('treasure_id', treasureId).eq('user_id', user.id)
    if ((attemptsCount || 0) >= 3) {
      return NextResponse.json({ error: 'Tu as atteint la limite de 3 tentatives pour ce coffre.' }, { status: 400 })
    }

    // 4. Vérifier le code
    const isCorrect = code.trim().toUpperCase() === treasure.secret_code.toUpperCase()
    
    // Enregistrer la tentative
    await supabase.from('treasure_attempts').insert({
      treasure_id: treasureId,
      user_id: user.id,
      code_entered: code.trim().toUpperCase(),
      is_correct: isCorrect
    })

    if (!isCorrect) {
      return NextResponse.json({ error: `Code incorrect. Il te reste ${2 - (attemptsCount || 0)} tentative(s).` }, { status: 400 })
    }

    // 5. Le code est bon ! On calcule le rang du gagnant.
    const { count: currentWinners } = await supabase.from('treasure_winners').select('*', { count: 'exact', head: true }).eq('treasure_id', treasureId)
    const rank = (currentWinners || 0) + 1

    // Définir les pourcentages selon le palier et le rang
    let percentages: number[] = []
    if (treasure.tier === 'diamant') percentages = [0.40, 0.25, 0.15, 0.10, 0.10]
    else if (treasure.tier === 'or') percentages = [0.50, 0.30, 0.20]
    else if (treasure.tier === 'argent') percentages = [0.70, 0.30]
    else percentages = [1.0]

    if (rank > percentages.length) {
      return NextResponse.json({ error: 'Trop tard, tous les lots ont été distribués !' }, { status: 400 })
    }

    const prizeAmount = treasure.prize_pool * percentages[rank - 1]

    // 6. Créditer le solde du gagnant
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single()
    if (profile) {
      await supabase.from('profiles').update({ balance: (profile.balance || 0) + prizeAmount }).eq('id', user.id)
    }

    // 7. Enregistrer le gagnant
    await supabase.from('treasure_winners').insert({
      treasure_id: treasureId,
      user_id: user.id,
      rank: rank,
      prize_amount: prizeAmount
    })

    // 8. Si tous les lots sont distribués, on ferme le coffre
    if (rank === percentages.length) {
      await supabase.from('treasures').update({ status: 'completed' }).eq('id', treasureId)
    }

    // 9. Notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Trésor trouvé ! 🏆',
      message: `Félicitations ! Tu as trouvé le code du coffre de ${treasure.sponsor_name}. Tu as gagné ${prizeAmount.toFixed(2)} FCFA (Rang ${rank}).`,
      link: '/dashboard/coffres'
    })

    return NextResponse.json({ 
      success: true, 
      prize: prizeAmount, 
      rank,
      message: `Bravo ! Tu es le gagnant n°${rank}. Tu remportes ${prizeAmount.toFixed(2)} FCFA.`
    })

  } catch (error: any) {
    console.error('Erreur claim:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
