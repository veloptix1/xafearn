import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { product, city, price } = await req.json()

    if (!product || !city) {
      return NextResponse.json({ error: 'Produit et ville requis' }, { status: 400 })
    }

    // 1. Demander à Groq de générer le texte ET un prompt d'image ULTRA structuré
    const prompt = `Tu es un expert en marketing digital et en génération d'images par IA.
Je vends ce produit : "${product}". La cible est à ${city}. ${price ? `Le prix est de ${price} FCFA.` : ''}

Fais deux choses :
1. Génère un texte de statut WhatsApp très vendeur en français (max 350 caractères) avec des emojis, un titre en majuscules, et termine par [LIEN_TRACKING].
2. Génère un prompt en ANGLAIS pour une IA d'image (Pollinations Flux). Ce prompt doit être extrêmement descriptif et suivre EXACTEMENT cette structure :
   [SUBJECT] + [DETAILS] + [LIGHTING] + [STYLE] + [TECHNICAL]
   Exemple : "A luxurious modern villa in Yaoundé, large glass windows, infinity pool, golden hour lighting, architectural photography, 8k, photorealistic, no text, no humans"
   Sois très précis sur le produit pour éviter les hallucinations. Ajoute TOUJOURS "no text, no humans" à la fin.

Réponds EXACTEMENT dans ce format JSON :
{
  "text": "le texte de vente ici",
  "imagePrompt": "the detailed english image prompt here"
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
      throw new Error('Erreur de génération de texte')
    }

    const groqData = await groqRes.json()
    let content = groqData.choices[0].message.content.trim()
    content = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(content)

    // 2. Générer l'image avec Pollinations (optimisé)
    const finalPrompt = parsed.imagePrompt
    
    // On ajoute enhance=true pour que Pollinations améliore le prompt
    // On ajoute un seed aléatoire pour éviter le cache
    const seed = Math.floor(Math.random() * 1000000)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=768&nologo=true&model=flux&enhance=true&seed=${seed}`

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
