'use server'
import { createClient } from '@/lib/supabase/server'

export async function onUserSignup(userId: string, email: string, name: string) {
  const supabase = await createClient()
  
  // 1. Créer la notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Bienvenue sur XAFERAN !',
    message: 'Ton compte est prêt. Commence à gagner de l\'argent avec tes statuts dès maintenant.',
  })

  // 2. Marquer l'email comme envoyé (on le fera vraiment depuis le client)
  await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', userId)
}
