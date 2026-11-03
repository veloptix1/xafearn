'use server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function onUserSignup(userId: string, email: string, name: string) {
  const supabase = await createClient()
  
  await sendWelcomeEmail(email, name)

  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Bienvenue sur XAFERAN !',
    message: 'Ton compte est prêt. Commence à gagner de l\'argent avec tes statuts dès maintenant.',
  })

  await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', userId)
}
