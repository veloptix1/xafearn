import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { record } = await req.json()
    if (!record || !record.conversation_id) {
      return NextResponse.json({ error: 'Invalid record' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', record.conversation_id)
      .single()

    if (!conv) return NextResponse.json({ error: 'No conv' }, { status: 404 })

    const receiverId = conv.user1_id === record.sender_id ? conv.user2_id : conv.user1_id

    const { data: sender } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', record.sender_id)
      .single()

    const baseUrl = new URL(req.url).origin
    await fetch(`${baseUrl}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId,
        title: `💬 ${sender?.full_name || 'Nouveau message'}`,
        body: record.content || '📎 Fichier',
        url: `/dashboard/messages/${record.conversation_id}`
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
