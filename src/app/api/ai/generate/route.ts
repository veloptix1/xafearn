import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink, template } = await req.json()

    if (!product) {
      return NextResponse.json({ error: 'Produit requis.' }, { status: 400 })
    }

    const hfToken = process.env.HF_TOKEN
    if (!hfToken) {
      return NextResponse.json({ error: 'Token Hugging Face manquant.' }, { status: 500 })
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
    const prompt = `Professional advertising poster for "${product}" in ${city}, ${style} style, high quality commercial photography, vibrant colors, no text, photorealistic, 4k, vertical 9:16 format`

    // 🚀 Utilise le Router Hugging Face (plus fiable)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90s timeout

    try {
      const response = await fetch(
        'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: prompt }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        console.error('Erreur HF:', response.status, errText)
        return NextResponse.json({ 
          error: `Erreur Hugging Face (${response.status}): ${errText.substring(0, 200)}` 
        }, { status: 500 })
      }

      const imageBuffer = await response.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const imageUrl = `data:image/jpeg;base64,${base64Image}`

      const adText = `🔥 ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous : ${trackingLink}\n\n#${product.replace(/\s/g, '')} #${city.replace(/\s/g, '')} #Promo`

      return NextResponse.json({ image: imageUrl, text: adText })
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        return NextResponse.json({ error: 'Délai dépassé. Le modèle met trop de temps à répondre. Réessaie.' }, { status: 504 })
      }
      throw err
    }
  } catch (err: any) {
    console.error('Erreur API generate:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
