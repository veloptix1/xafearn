import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink, template, mediaType = 'image' } = await req.json()

    if (!product) {
      return NextResponse.json({ error: 'Produit requis.' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé Pollinations manquante.' }, { status: 500 })
    }

    const styleMap: Record<string, string> = {
      elegant: 'elegant luxury advertising poster, purple and gold colors, sophisticated',
      flash: 'energetic flash sale poster, bright yellow and orange colors, dynamic',
      pro: 'professional business advertising, dark blue and white, clean modern',
      luxe: 'premium luxury product photography, dark background, gold accents',
      fun: 'colorful fun advertising, bright pink and blue, playful modern',
      minimal: 'minimalist clean advertising, white background, simple elegant',
    }
    const style = styleMap[template || 'elegant'] || styleMap.elegant
    const prompt = `Professional advertising for "${product}" in ${city}, ${style} style, high quality, vibrant colors, no text, photorealistic`

    let mediaUrl = ''
    let adText = ''

    // 🖼️ IMAGE (Flux - Gratuit)
    if (mediaType === 'image') {
      const seed = Math.floor(Math.random() * 1000000)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1344&seed=${seed}&model=flux&nologo=true&token=${apiKey}`
      
      const response = await fetch(url)
      if (!response.ok) {
        const errText = await response.text()
        return NextResponse.json({ error: `Erreur Pollinations (${response.status}): ${errText.substring(0, 200)}` }, { status: 500 })
      }
      const imageBuffer = await response.arrayBuffer()
      mediaUrl = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`
      
      adText = `🔥 ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous : ${trackingLink}\n\n#${product.replace(/\s/g, '')} #${city.replace(/\s/g, '')} #Promo`

    // 🎬 VIDÉO (Payant - nécessite du Pollen)
    } else if (mediaType === 'video') {
      const videoPrompt = encodeURIComponent(`${prompt}, cinematic motion, 5 seconds`)
      const url = `https://gen.pollinations.ai/video/${videoPrompt}?model=veo&duration=5&aspectRatio=9:16&key=${apiKey}`
      
      const response = await fetch(url)
      if (!response.ok) {
        const errText = await response.text()
        // Si erreur 402, c'est un manque de pollen
        if (response.status === 402) {
          return NextResponse.json({ error: 'Solde Pollen insuffisant pour la vidéo. Recharge ton compte Pollinations.' }, { status: 402 })
        }
        return NextResponse.json({ error: `Erreur Vidéo (${response.status}): ${errText.substring(0, 200)}` }, { status: 500 })
      }
      
      // Pollinations renvoie directement le fichier vidéo
      const videoBuffer = await response.arrayBuffer()
      mediaUrl = `data:video/mp4;base64,${Buffer.from(videoBuffer).toString('base64')}`
      
      adText = `🎬 ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous : ${trackingLink}\n\n#${product.replace(/\s/g, '')} #${city.replace(/\s/g, '')} #Promo`

    // 🔊 AUDIO (Payant - nécessite du Pollen)
    } else if (mediaType === 'audio') {
      const audioPrompt = `${product} à ${city}, seulement ${price} FCFA. Contactez-nous vite !`
      const url = `https://gen.pollinations.ai/v1/audio/speech`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai-audio',
          voice: 'nova',
          input: audioPrompt,
          format: 'mp3'
        })
      })
      
      if (!response.ok) {
        const errText = await response.text()
        if (response.status === 402) {
          return NextResponse.json({ error: 'Solde Pollen insuffisant pour l\'audio. Recharge ton compte Pollinations.' }, { status: 402 })
        }
        return NextResponse.json({ error: `Erreur Audio (${response.status}): ${errText.substring(0, 200)}` }, { status: 500 })
      }
      
      const audioBuffer = await response.arrayBuffer()
      mediaUrl = `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString('base64')}`
      
      adText = `🔊 Écoute notre pub pour ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous : ${trackingLink}`
    }

    return NextResponse.json({ image: mediaUrl, text: adText })
  } catch (err: any) {
    console.error('Erreur API generate:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
