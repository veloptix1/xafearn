import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price, role } = await req.json()

    if (!product || !city) {
      return NextResponse.json({ error: 'Produit et ville requis' }, { status: 400 })
    }

    // 1. Génération du texte avec Groq (Llama 3)
    const prompt = `Tu es un expert en marketing digital sur WhatsApp en Afrique. 
Génère un texte de statut WhatsApp très accrocheur pour vendre ce produit : "${product}". 
La cible est à ${city}. ${price ? `Le prix est de ${price} FCFA.` : ''}
Le texte doit :
- Utiliser des emojis pertinents.
- Avoir un titre accrocheur en majuscules.
- Décrire le produit avec des puces courtes (3 max).
- Se terminer par un appel à l'action avec [LIEN_TRACKING] (ne pas inventer de lien).
- Maximum 500 caractères.
Ne réponds qu'avec le texte du statut, rien d'autre.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
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

    // 2. Génération de l'image avec Pollinations (Gratuit et sans clé)
    const imagePrompt = `High quality advertising photo for ${product}, professional product photography, vibrant colors, studio lighting, 4k, no text`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000)}`

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
