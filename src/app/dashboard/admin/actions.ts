'use server'
import { createClient } from '@/lib/supabase/server'
import { sendValidationEmail } from '@/lib/email/send'
import { createNotification } from '@/lib/notifications/create'

export async function validateSubmission(submissionId: string, views: number) {
  const supabase = await createClient()
  
  const { data: sub } = await supabase.from('ad_submissions').select('*, profiles(balance, level, email, full_name)').eq('id', submissionId).single()
  
  if (sub && sub.profiles) {
    const gainPerView = sub.profiles.level === 1 ? 0.50 : sub.profiles.level === 2 ? 1.25 : 1.75
    const totalGain = gainPerView * views
    
    await supabase.from('profiles').update({ balance: (sub.profiles.balance || 0) + totalGain }).eq('id', sub.user_id)
    await supabase.from('ad_submissions').update({ status: 'validated', views_count: views }).eq('id', submissionId)
    
    // Notification interne
    await createNotification(sub.user_id, 'Diffusion validée ✅', `Ta diffusion a été validée. Tu as gagné ${totalGain.toFixed(2)} FCFA.`, '/dashboard')
    
    // Email
    await sendValidationEmail(sub.profiles.email, sub.profiles.full_name, views, totalGain)
  }
  
  return { success: true }
}
