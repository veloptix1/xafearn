import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-server'

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
      .select('user1_id, user2_id, is_group')
      .eq('id', record.conversation_id)
      .single()

    if (!conv) return NextResponse.json({ error: 'No conv' }, { status: 404 })

    // Destinataires : l'autre personne (1 à 1) ou tous les membres sauf l'expéditeur (groupe)
    let receiverIds: string[] = []
    if (conv.is_group) {
      const { data: members } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', record.conversation_id)
      receiverIds = (members ?? []).map((m) => m.user_id as string).filter((id) => id !== record.sender_id)
    } else {
      const other = conv.user1_id === record.sender_id ? conv.user2_id : conv.user1_id
      if (other) receiverIds = [other]
    }

    const { data: sender } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', record.sender_id)
      .single()

    const body =
      record.message_type === 'image' ? '📷 Image' : record.message_type === 'audio' ? '🎤 Message vocal' : record.content || '📎 Fichier'

    await Promise.all(
      receiverIds.map((receiverId) =>
        sendPushToUser(receiverId, {
          title: `💬 ${sender?.full_name || 'Nouveau message'}`,
          body,
          url: `/dashboard/messages/${record.conversation_id}`, // site web
          appUrl: '/dashboard/messages', // app Android
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
