import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink, template } = await req.json()

    if (!product) {
      return NextResponse.json({ error: 'Produit requis.' }, { status: 400 })
    }

    // 🎨 Prompt optimisé
    const styleMap: Record<string, string> = {
      elegant: 'elegant luxury advertising poster, purple and gold colors, sophisticated',
      flash: 'energetic flash sale poster, bright yellow and orange colors, dynamic',
      pro: 'professional business advertising, dark blue and white, clean modern',
      luxe: 'premium luxury product photography, dark background, gold accents',
      fun: 'colorful fun advertising, bright pink and blue, playful modern',
      minimal: 'minimalist clean advertising, white background, simple elegant',
    }
    const style = styleMap[template || 'elegant'] || styleMap.elegant
    const prompt = `Professional advertising poster for "${product}" in ${city}, ${style} style, high quality commercial photography, vibrant colors, no text, photorealistic, 4k`

    // 🆓 Utilise le modèle flux (gratuit) avec ta clé API
    const apiKey = process.env.POLLINATIONS_API_KEY
    const seed = Math.floor(Math.random() * 1000000)
    
    // Construction de l'URL avec la clé (si disponible)
    let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1344&seed=${seed}&model=flux&nologo=true`
    if (apiKey) {
      url += `&token=${apiKey}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erreur Pollinations:', response.status, errText)
      return NextResponse.json({ 
        error: `Erreur Pollinations (${response.status}): ${errText.substring(0, 200)}` 
      }, { status: 500 })
    }

    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const imageUrl = `data:image/jpeg;base64,${base64Image}`

    const adText = `🔥 ${product} à ${city} !\n\n💰 Prix : ${price} FCFA\n\n📲 Contacte-nous : ${trackingLink}\n\n#${product.replace(/\s/g, '')} #${city.replace(/\s/g, '')} #Promo`

    return NextResponse.json({ image: imageUrl, text: adText })
  } catch (err: any) {
    console.error('Erreur API generate:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
