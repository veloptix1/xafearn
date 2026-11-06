import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink, template } = await req.json()

    if (!product) {
      return NextResponse.json({ error: 'Produit requis.' }, { status: 400 })
    }

    const hfToken = process.env.HF_TOKEN
    if (!hfToken) {
      return NextResponse.json({ error: 'Token Hugging Face manquant sur le serveur.' }, { status: 500 })
    }

    // 🎨 Prompt optimisé pour FLUX.1
    const styleMap: Record<string, string> = {
      elegant: 'elegant luxury advertising poster, purple and gold colors, sophisticated, high-end',
      flash: 'energetic flash sale poster, bright yellow and orange colors, dynamic, urgent',
      pro: 'professional business advertising, dark blue and white, clean modern, corporate',
      luxe: 'premium luxury product photography, dark background, gold accents, exclusive',
      fun: 'colorful fun advertising, bright pink and blue, playful modern, youthful',
      minimal: 'minimalist clean advertising, white background, simple elegant, refined',
    }

    const style = styleMap[template || 'elegant'] || styleMap.elegant
    
    const prompt = `Professional advertising poster for "${product}" in ${city}, ${style} style, high quality commercial photography, beautiful product showcase, vibrant colors, clean composition, no text, no watermark, photorealistic, 4k, vertical 9:16 format`

    // 🚀 Appel à Hugging Face avec FLUX.1-schnell
    const response = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: prompt,
          parameters: {
            width: 768,
            height: 1344, // Format vertical 9:16
          }
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur Hugging Face:', errText)
      
      // Si le modèle est en train de charger, on attend et on réessaie
      if (response.status === 503) {
        return NextResponse.json({ 
          error: 'Le modèle IA est en cours de chargement. Réessaie dans 30 secondes.' 
        }, { status: 503 })
      }
      
      return NextResponse.json({ error: 'Erreur génération: ' + errText }, { status: 500 })
    }

    // Hugging Face renvoie directement l'image en binaire
    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageUrl = `data:image/jpeg;base64,${base64Image}`

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
