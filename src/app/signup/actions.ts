'use server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'
import { createNotification } from '@/lib/notifications/create'

export async function onUserSignup(userId: string, email: string, name: string) {
  const supabase = await createClient()
  
  await createNotification(userId, 'Bienvenue sur XAFEARN !', 'Ton compte est prêt. Commence à gagner de l\'argent avec tes statuts.', '/dashboard')
  await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', userId)
  await sendWelcomeEmail(email, name)
}
