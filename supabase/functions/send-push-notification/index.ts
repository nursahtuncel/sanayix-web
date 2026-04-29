import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Verify authorization
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.slice(7)
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const { user_id, title, body, url, tag } = await req.json() as {
      user_id: string
      title: string
      body: string
      url?: string
      tag?: string
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id)

    if (error || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ sent: 0, reason: error?.message ?? 'no_subscriptions' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url ?? '/notifications',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag ?? 'sanayix',
    })

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          {
            TTL: 60 * 60 * 24,
            urgency: 'normal',
          }
        )
      )
    )

    // Collect expired/invalid endpoints to delete
    const expiredEndpoints: string[] = []
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const error = result.reason as { statusCode?: number }
        // 410 Gone = subscription expired; 404 = not found
        if (error.statusCode === 410 || error.statusCode === 404) {
          expiredEndpoints.push(subscriptions[i].endpoint)
        }
      }
    })

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id)
        .in('endpoint', expiredEndpoints)
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total: subscriptions.length,
        cleaned: expiredEndpoints.length
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
