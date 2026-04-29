import { useState, useCallback } from 'react'
import { supabase } from '@/core/supabase/client'
import { useAuthStore } from '@/core/auth/authStore'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

type PushState = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error'

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user)
  const [pushState, setPushState] = useState<PushState>(() => {
    if (!('PushManager' in window)) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'
    return 'idle'
  })

  const subscribe = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported')
      return
    }

    setPushState('loading')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushState('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = subscription.toJSON()

      // Upsert into push_subscriptions table
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint!,
          p256dh: (subJson.keys as Record<string, string>).p256dh,
          auth: (subJson.keys as Record<string, string>).auth,
          user_agent: navigator.userAgent.slice(0, 255),
        },
        {
          onConflict: 'user_id,endpoint',
          ignoreDuplicates: false,
        }
      )

      if (error) throw error

      setPushState('subscribed')
    } catch (err) {
      console.error('Push subscription failed:', err)
      setPushState('error')
    }
  }, [user])

  const unsubscribe = useCallback(async () => {
    if (!user) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
      setPushState('idle')
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    }
  }, [user])

  return { pushState, subscribe, unsubscribe }
}
