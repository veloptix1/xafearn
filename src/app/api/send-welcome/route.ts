import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()
    
    if (!email || !name) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // On attend l'envoi de l'email avant de renvoyer la réponse
    const result = await sendWelcomeEmail(email, name)
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
