'use server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'

// L'email de bienvenue est envoyé automatiquement par le webhook /api/webhooks/new-user.
// Cette action ne sert plus qu'à la notification d'accueil, et uniquement pour l'utilisateur connecté.
export async function onUserSignup(userId: string, _email?: string, _name?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return

  await createNotification(userId, 'Bienvenue sur XAFEARN !', "Ton compte est prêt. Commence à gagner de l'argent avec tes statuts.", '/dashboard')
}
