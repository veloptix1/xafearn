file_path = "src/app/dashboard/market/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

old_function = """  const handleContact = async (method: 'whatsapp' | 'telegram' | 'message') => {
    if (!selectedProduct || !profile) return
    setIsProcessing(true)
    try {
      await fetch('/api/market/notify-seller', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, buyer_id: profile.id, contact_method: method })
      })
      if (method === 'whatsapp' && selectedProduct.contact_whatsapp) window.open(`https://wa.me/${selectedProduct.contact_whatsapp.replace(/\\D/g, '')}`, '_blank')
      else if (method === 'telegram' && selectedProduct.contact_telegram) window.open(selectedProduct.contact_telegram, '_blank')
      else router.push('/dashboard/messages')
      showToast('Vendeur notifié.', 'success')
      setSelectedProduct(null)
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }"""

new_function = """  const handleContact = async (method: 'whatsapp' | 'telegram' | 'message') => {
    if (!selectedProduct || !profile) return
    setIsProcessing(true)
    try {
      // 1. Notifier le vendeur par email
      await fetch('/api/market/notify-seller', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, buyer_id: profile.id, contact_method: method })
      })

      // 2. Rediriger selon la méthode
      if (method === 'whatsapp' && selectedProduct.contact_whatsapp) {
        window.open(`https://wa.me/${selectedProduct.contact_whatsapp.replace(/\\D/g, '')}`, '_blank')
        showToast('Redirection vers WhatsApp...', 'success')
      } else if (method === 'telegram' && selectedProduct.contact_telegram) {
        window.open(selectedProduct.contact_telegram, '_blank')
        showToast('Redirection vers Telegram...', 'success')
      } else {
        // 🔥 MESSAGE INTERNE : Créer ou ouvrir la conversation
        const sellerId = selectedProduct.seller_id
        
        // Vérifier si une conversation existe déjà
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${profile.id},user2_id.eq.${sellerId}),and(user1_id.eq.${sellerId},user2_id.eq.${profile.id})`)
          .maybeSingle()

        if (existingConv) {
          // La conversation existe, on l'ouvre
          router.push(`/dashboard/messages/${existingConv.id}`)
        } else {
          // Créer une nouvelle conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
              user1_id: profile.id,
              user2_id: sellerId,
              is_group: false,
              last_message: 'Nouvelle conversation (Market)',
              last_message_at: new Date().toISOString(),
              last_message_sender_id: profile.id
            })
            .select('id')
            .single()

          if (error) throw error

          // Ajouter les participants
          await supabase.from('conversation_participants').insert([
            { conversation_id: newConv.id, user_id: profile.id },
            { conversation_id: newConv.id, user_id: sellerId }
          ])

          router.push(`/dashboard/messages/${newConv.id}`)
        }
      }
      setSelectedProduct(null)
    } catch (err: any) { 
      showToast('Erreur : ' + err.message, 'error') 
    }
    setIsProcessing(false)
  }"""

if old_function in content:
    content = content.replace(old_function, new_function)
    with open(file_path, "w") as f:
        f.write(content)
    print("✅ Fonction handleContact corrigée avec succès !")
else:
    print("❌ Impossible de trouver la fonction exacte. Vérifie le fichier.")
    print("Cherche 'handleContact' et remplace manuellement.")
