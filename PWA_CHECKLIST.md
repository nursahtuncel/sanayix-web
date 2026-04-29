# ✅ PWA Kurulum Kontrol Listesi

## 🟢 Tamamlanan (Frontend)

- [x] `npm install vite-plugin-pwa`
- [x] `vite.config.ts` güncellendi
- [x] `index.html` meta tag'ler eklendi
- [x] PWA ikonları oluşturuldu (`public/pwa-*.png`)
- [x] Service Worker (`src/sw.ts`) oluşturuldu
- [x] SW registration (`src/main.tsx`) eklendi
- [x] Install prompt hook oluşturuldu
- [x] Push notifications hook oluşturuldu
- [x] AppShell'e banner UI eklendi

---

## 🔵 Yapılacak (Supabase & Deployment)

### 1️⃣ VAPID Keys Setup
```bash
# Adım 1: Keys oluştur (zaten yaptık!)
# Public Key: BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU
# Private Key: yO3rN42-yqo0axiNDryjs7d50Hv85lh9-1r8Er8DEe4

# Adım 2: .env.local dosyasına ekle
VITE_VAPID_PUBLIC_KEY=BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU
```

### 2️⃣ Supabase Secrets Setup
Supabase Dashboard → Project Settings → Secrets:

```
Name: VAPID_PRIVATE_KEY
Value: yO3rN42-yqo0axiNDryjs7d50Hv85lh9-1r8Er8DEe4

Name: VAPID_PUBLIC_KEY  
Value: BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU

Name: VAPID_SUBJECT
Value: mailto:admin@sanayix.com
```

### 3️⃣ Database Migration
**Option A: Supabase CLI (Recommended)**
```bash
supabase db push
```

**Option B: Manual Dashboard**
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/20260429_create_push_subscriptions.sql` kopyala → Run
3. `supabase/migrations/20260429_push_notification_triggers.sql` kopyala → Run

### 4️⃣ Edge Function Deploy
```bash
supabase functions deploy send-push-notification
```

Or manually:
1. Supabase Dashboard → Functions → Create New
2. Name: `send-push-notification`
3. Copy code from `supabase/functions/send-push-notification/index.ts`
4. Deploy

### 5️⃣ Test Offline Mode
```bash
npm run dev
# DevTools → Network → Offline checkbox
# Page refresh → hala çalışmalı
```

### 6️⃣ Test Install Prompt
- Chrome: "SanayiX'i Kur" butonu görmeli
- Safari: Banner görmeli

### 7️⃣ Test Push Notifications (Optional)
```javascript
// Browser console'da:
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(sub => console.log(sub))
)
```

---

## 📋 Dosyalar

**Oluşturulanlar:**
- `src/sw.ts` - Service Worker
- `src/core/pwa/useInstallPrompt.ts` - Install hook
- `src/core/pwa/usePushNotifications.ts` - Push hook
- `supabase/migrations/20260429_create_push_subscriptions.sql`
- `supabase/migrations/20260429_push_notification_triggers.sql`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/send-push-notification/deno.json`
- `.env.example` - Example environment variables
- `PWA_SETUP_GUIDE.md` - Detailed setup guide

**Değiştirilenler:**
- `vite.config.ts` - VitePWA plugin eklendi
- `index.html` - Meta tag'ler eklendi
- `src/main.tsx` - SW registration eklendi
- `src/shared/components/AppShell.tsx` - Banner UI eklendi

---

## 🚀 Production Deploy

```bash
# Build et
npm run build

# Dist folder'ı hostla (Vercel, Netlify, etc.)
# Service worker otomatik serve edilecek (/sw.js)
```

---

## 📞 Common Issues

| Problem | Çözüm |
|---------|-------|
| "VITE_VAPID_PUBLIC_KEY not found" | `.env.local` dosyasında kontrol et |
| "Service Worker not registered" | DevTools → Console → errors kontrol et |
| "Offline page not loading" | SW cache'i clear et: DevTools → Storage → Clear |
| "Push notification not received" | Supabase secrets, Edge Function, browser permission kontrol et |

---

## ✨ Tamamlandı!

Tüm adımlar tamamlandığında:
- ✅ PWA installable
- ✅ Offline caching
- ✅ Push notifications
- ✅ Lighthouse PWA audit geçer

Hoş geldiniz, Progressive Web App! 🎉
