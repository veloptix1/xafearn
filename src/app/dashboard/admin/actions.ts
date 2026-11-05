'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Fonction pour rafraîchir toutes les pages admin après une action
export async function refreshAdminPages() {
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/annonces')
  revalidatePath('/dashboard/admin/preuves')
  revalidatePath('/dashboard/admin/utilisateurs')
  revalidatePath('/dashboard/admin/retraits')
  revalidatePath('/dashboard/admin/retraits-jetons')
  revalidatePath('/dashboard/admin/taches')
}
