import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price } = await req.json()

    if (!product || !city) {
      return NextResponse.json({ error: 'Produit et ville requis' }, { status: 400 })
    }

    // 1. Demander à Groq de générer le texte ET la description de l'image en anglais
    const prompt = `Tu es un expert en marketing digital.
Je vends ce produit : "${product}". La cible est à ${city}. ${price ? `Le prix est de ${price} FCFA.` : ''}

Fais deux choses :
1. Génère un texte de statut WhatsApp très vendeur en français (max 400 caractères) avec des emojis, un titre en majuscules, et termine par [LIEN_TRACKING].
2. Génère un prompt en ANGLAIS (très descriptif) pour une IA d'image qui doit créer une photo publicitaire de ce produit. Sois extrêmement précis sur le produit (ex: "A luxurious modern house", "A pair of blue leather shoes"). Ne mets pas d'humains dans le prompt.

Réponds EXACTEMENT dans ce format JSON :
{
  "text": "le texte de vente ici",
  "imagePrompt": "the english image prompt here"
}`

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
        response_format: { type: "json_object" }
      })
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error('Groq Error:', err)
      throw new Error('Erreur de génération de texte')
    }

    const groqData = await groqRes.json()
    let content = groqData.choices[0].message.content.trim()
    
    // Nettoyage du JSON (au cas où l'IA ajoute des backticks)
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(content)

    // 2. Générer l'image avec Pollinations (modèle Flux beaucoup plus précis)
    const finalImagePrompt = `${parsed.imagePrompt}, professional product photography, high quality, 4k, cinematic lighting, no humans, no text`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalImagePrompt)}?width=800&height=600&nologo=true&model=flux&seed=${Math.floor(Math.random() * 10000)}`

    return NextResponse.json({ 
      success: true, 
      text: parsed.text, 
      image: imageUrl 
    })

  } catch (error: any) {
    console.error('AI Error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération. Réessaie.' }, { status: 500 })
  }
}
