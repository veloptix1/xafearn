import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ✅ Nouvelle clé publique
const PUBLIC_VAPID_KEY = 'BGNN44c6l_PfBNVxnFI4WbHL3Hrw8UgGIOFCKEMwKnOlPwaVkehwE-NG2y-3V2-cHFmYGYUlOtRGzjkBloSeDIs'

export function usePushNotifications() {
  const supabase = createClient()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Erreur SW:', error)
    } finally {
      setLoading(false)
    }
  }

  async function subscribe() {
    if (!isSupported) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Tu dois autoriser les notifications dans les paramètres de ton navigateur.')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      })

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('push_subscriptions').upsert({
          user_id: session.user.id,
          subscription: subscription.toJSON()
        }, { onConflict: 'user_id' })
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('Erreur souscription:', error)
      alert('Erreur lors de l\'activation des notifications.')
    } finally {
      setLoading(false)
    }
  }

  return { isSupported, isSubscribed, loading, subscribe }
}
