import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, trackingLink } = await req.json()

    if (!product || !city) {
      return NextResponse.json({ error: 'Produit et ville requis' }, { status: 400 })
    }

    const linkToUse = trackingLink || '[VOTRE_LIEN_DE_TRACKING]'

    const prompt = `Tu es un copywriter expert en marketing digital sur WhatsApp en Afrique.
Génère un texte de statut WhatsApp très accrocheur pour vendre ce produit : "${product}".
La cible est à ${city}. ${price ? `Le prix est de ${price} FCFA.` : ''}
Le texte doit :
- Utiliser des emojis pertinents.
- Avoir un titre accrocheur en majuscules.
- Décrire le produit avec 3 puces courtes max.
- Se terminer OBLIGATOIREMENT par ce lien exact : ${linkToUse}
- Maximum 400 caractères.
Ne réponds qu'avec le texte du statut, sans introduction ni conclusion.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      })
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error('Groq Error:', err)
      throw new Error('Erreur lors de la génération du texte')
    }

    const groqData = await groqRes.json()
    const generatedText = groqData.choices[0].message.content.trim()

    // Image ultra-réaliste
    const imagePrompt = `High-end commercial photography of ${product}, professional studio lighting, 8k resolution, vibrant colors, clean background, advertising style`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&nologo=true&model=flux&seed=${Math.floor(Math.random() * 10000)}`

    return NextResponse.json({ 
      success: true, 
      text: generatedText, 
      image: imageUrl 
    })

  } catch (error: any) {
    console.error('AI Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
