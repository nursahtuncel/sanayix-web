# 🚀 SanayiX PWA Setup Guide

Bu rehber PWA özelliğini (install, offline, push notifications) tamamen ayarlamak için gerekli adımları içerir.

## ✅ Frontend Tamamlandı

- ✓ Service Worker (`src/sw.ts`)
- ✓ Install Prompt Hook (`src/core/pwa/useInstallPrompt.ts`)
- ✓ Push Notifications Hook (`src/core/pwa/usePushNotifications.ts`)
- ✓ UI Banner (AppShell'de)
- ✓ PWA Icons (`public/pwa-*.png`)

**Test etmek için:**
```bash
npm run dev
# Tarayıcı: Chrome DevTools → Application → Service Workers/Manifest
```

---

## 🔧 Supabase Kurulumu (Gerekli)

### 1. VAPID Keys Oluştur

Komut satırında çalıştır:
```bash
npx web-push generate-vapid-keys
```

Çıktı:
```
Public Key:  BExx...xx
Private Key: xxxx...xx
```

Bunları sakla!

### 2. `.env.local` Dosyasına Ekle

```env
VITE_VAPID_PUBLIC_KEY=BExx...xx
```

### 3. Supabase Secrets Set Et

Supabase Dashboard → Project Settings → Secrets:
```
VAPID_PRIVATE_KEY = xxxxx...xxxxx
VAPID_PUBLIC_KEY = BExx...xx  
VAPID_SUBJECT = mailto:admin@sanayix.com
```

### 4. Supabase Migration Uygula

**Seçenek A: Supabase CLI Kullan (Önerilen)**

```bash
# Supabase CLI kurunuz (eğer kurulu değilse)
npm install -g supabase

# Migrate et
supabase db push
```

**Seçenek B: Manuel Supabase Dashboard'da Uygula**

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20260429_create_push_subscriptions.sql` dosyasındaki SQL'i kopyala
3. Yapıştır → Run
4. Aynısını `20260429_push_notification_triggers.sql` için yapla

### 5. Edge Function Deploy Et

**Terminal'de:**
```bash
# Supabase CLI ile deploy
supabase functions deploy send-push-notification

# Veya doğrudan dashboard'da:
# Supabase Dashboard → Functions → Create New Function
# Dosya: supabase/functions/send-push-notification/index.ts
```

**Secrets'ı set et (Edge Function ayarlarından):**
```
VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY
VAPID_SUBJECT
```

---

## 📲 Push Notifications Tetikleme

### Seçenek 1: Supabase Triggers Kullan (Otomatik)

Migrations uygulandıktan sonra, yeni mesaj/teklif otomatik bildirim oluşturur.

### Seçenek 2: Client-Side Çağırma (Manuel)

```typescript
// Frontend'den
await fetch('https://project-id.functions.supabase.co/functions/v1/send-push-notification', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase_service_role_key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: recipient_user_id,
    title: 'Başlık',
    body: 'İçerik',
    url: '/path',
    tag: 'notification-type'
  })
})
```

---

## 🧪 Test Etme

### 1. Service Worker
```
DevTools → Application → Service Workers
→ "active and running" görmeli
```

### 2. Install Prompt
```
Chrome: "SanayiX'i Kur" butonu çıkmalı
Safari: "Paylaş → Ana Ekrana Ekle" görmeli
```

### 3. Offline Mode
```
DevTools → Network → Offline
→ Sayfayı refresh et → hala açılmalı (cache'den)
```

### 4. Push Notifications
```
1. Uygulamayı aç
2. Notification.requestPermission() → Allow
3. usePushNotifications().subscribe() çalıştır
4. Supabase push_subscriptions tablosu kontrol et
5. send-push-notification function çalıştır (test)
```

---

## 📊 Database Şeması

```sql
push_subscriptions:
  - id (uuid, primary key)
  - user_id (uuid, FK to auth.users)
  - endpoint (text, unique per user+device)
  - p256dh (text, encryption key)
  - auth (text, encryption key)
  - user_agent (text, device info)
  - created_at, updated_at (timestamptz)
```

RLS enabled: Kullanıcılar sadece kendi subscription'larını görebilir.

---

## 🐛 Troubleshooting

### "VAPID_PUBLIC_KEY not found"
→ `.env.local` dosyasında `VITE_VAPID_PUBLIC_KEY` olmalı (npm env'ye expose edilmiş)

### "push subscription failed"
→ Tarayıcı notification permission check et: `Notification.permission`

### "service worker not registering"
→ DevTools → Application → Service Workers → error logu kontrol et

### "offline page not loading"
→ Service Worker cache kontrol et:
   - DevTools → Application → Cache Storage
   - "navigations" cache'de index.html olmalı

---

## 🚀 Production Deployment

1. `npm run build` → `dist/` folder
2. `supabase functions deploy send-push-notification`
3. Supabase secrets configured
4. Database migrations applied
5. Deploy `dist/` to hosting (Vercel, Netlify, etc.)

---

## 📚 Kaynaklar

- [Web Push Protocol](https://www.rfc-editor.org/rfc/rfc8291)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Workbox Caching](https://developers.google.com/web/tools/workbox)
- [PWA Audit](https://web.dev/lighthouse-pwa/)
