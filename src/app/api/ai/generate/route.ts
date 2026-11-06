import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink, template } = await req.json()

    if (!product) {
      return NextResponse.json({ error: 'Produit requis.' }, { status: 400 })
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'Clé fal.ai manquante sur le serveur.' }, { status: 500 })
    }

    // 🎨 Prompt optimisé pour FLUX.1 Schnell
    const styleMap: Record<string, string> = {
      elegant: 'elegant luxury advertising poster, purple and gold colors, sophisticated',
      flash: 'energetic flash sale poster, bright yellow and orange colors, dynamic',
      pro: 'professional business advertising, dark blue and white, clean modern',
      luxe: 'premium luxury product photography, dark background, gold accents',
      fun: 'colorful fun advertising, bright pink and blue, playful modern',
      minimal: 'minimalist clean advertising, white background, simple elegant',
    }

    const style = styleMap[template || 'elegant'] || styleMap.elegant
    
    const prompt = `Professional advertising poster for "${product}" in ${city}, ${style} style, high quality commercial photography, beautiful product showcase, vibrant colors, clean composition, no text, no watermark, photorealistic, 4k, vertical 9:16 format`

    // 🚀 Appel à fal.ai avec FLUX.1 Schnell
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'portrait_16_9', // Format vertical pour statut WhatsApp
        num_inference_steps: 4, // Schnell est rapide (4 étapes)
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg',
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur fal.ai:', errText)
      return NextResponse.json({ error: 'Erreur génération image: ' + errText }, { status: 500 })
    }

    const data = await response.json()
    
    // Extraire l'URL de l'image
    const imageUrl = data.images?.[0]?.url
    
    if (!imageUrl) {
      console.error('Pas d\'image dans la réponse:', JSON.stringify(data).substring(0, 500))
      return NextResponse.json({ error: 'Aucune image générée.' }, { status: 500 })
    }

    // Texte de la pub (pour le statut WhatsApp)
    const adText = `🔥 ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous vite : ${trackingLink}\n\n#${product.replace(/\s/g, '')} #${city.replace(/\s/g, '')} #Promo`

    return NextResponse.json({ 
      image: imageUrl,
      text: adText 
    })
  } catch (err: any) {
    console.error('Erreur API generate:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
