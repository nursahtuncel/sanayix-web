# 🚀 Sonraki Adımlar - PWA Son Konfigürasyon

## ✅ Frontend Hazır!

Test etmek için:
```bash
npm run dev
```

Tarayıcıda kontrol:
- DevTools → Application → Service Workers → "active and running" görmeli
- DevTools → Application → Manifest → metadata görmeli

---

## 🔑 VAPID Keys (Ready to Use!)

**Public Key (Frontend):**
```
BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU
```

**Private Key (Supabase Secret Only):**
```
yO3rN42-yqo0axiNDryjs7d50Hv85lh9-1r8Er8DEe4
```

---

## 📝 Adım 1: .env.local Dosyasını Güncelle

Proje kökünde `.env.local` dosyasını aç veya oluştur:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU
```

---

## 🔐 Adım 2: Supabase Secrets Setup

1. Supabase Dashboard açık → Proje seç
2. Settings → Secrets
3. Şu 3 secret'ı ekle:

```
Name: VAPID_PRIVATE_KEY
Value: yO3rN42-yqo0axiNDryjs7d50Hv85lh9-1r8Er8DEe4

Name: VAPID_PUBLIC_KEY
Value: BKp0L1cpZGZq85Xi6P6mRBzstn_lqaLRKP3Yyni-gooqIEd6f9BvbIcp08Byz-V5DyaTm1wyICgXqaR4luc67AU

Name: VAPID_SUBJECT
Value: mailto:admin@sanayix.com
```

---

## 🗄️ Adım 3: Database Migration

### Option A: CLI (Recommended)

```bash
npm install -g supabase
supabase link --project-ref your-project-id
supabase db push
```

### Option B: Manual Dashboard

1. Supabase Dashboard → SQL Editor
2. Yeni query oluştur
3. Bu dosyayı kopyala-yapıştır:
   - `supabase/migrations/20260429_create_push_subscriptions.sql`
4. Çalıştır (Run)
5. İkinci dosyayı da kopyala-yapıştır:
   - `supabase/migrations/20260429_push_notification_triggers.sql`
6. Çalıştır (Run)

---

## ⚡ Adım 4: Edge Function Deploy

### Option A: CLI

```bash
supabase functions deploy send-push-notification
```

### Option B: Manual Dashboard

1. Supabase Dashboard → Functions
2. "Create a new function" tıkla
3. Name: `send-push-notification`
4. File: `supabase/functions/send-push-notification/index.ts` kopyala
5. Deploy
6. Function settings → Environment Variables:
   - Secrets'dan (Adım 2'de oluşturduğun) otomatik inject edilecek

---

## 🧪 Adım 5: Test Et

### 1. Service Worker
```
DevTools (F12) → Application → Service Workers
Status: "active and running"
```

### 2. Install Prompt
```
Chrome: "SanayiX'i Kur" banner görmeli
Safari: "Paylaş → Ana Ekrana Ekle"
```

### 3. Offline Mode
```
DevTools → Network → uncheck "Enable network"
Refresh page → Hala açılmalı (cache'den)
```

### 4. Push Subscriptions (Optional)
```javascript
// Browser Console'da:
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription()
    .then(sub => console.log("Subscription:", sub))
)
```

Supabase Dashboard → push_subscriptions tablosu → kontrol et

---

## 📋 Verilen Dosyalar

```
supabase/
├── migrations/
│   ├── 20260429_create_push_subscriptions.sql
│   └── 20260429_push_notification_triggers.sql
├── functions/
│   └── send-push-notification/
│       ├── index.ts
│       └── deno.json

Docs:
├── PWA_SETUP_GUIDE.md
├── PWA_FEATURES.md
├── PWA_CHECKLIST.md
├── NEXT_STEPS.md (bu dosya)
└── .env.example
```

---

## 🎯 Timeline

- **5 dakika:** .env.local update + Supabase Secrets
- **2 dakika:** Database migration (CLI veya SQL)
- **1 dakika:** Edge Function deploy
- **5 dakika:** Test

**Total: ~13 dakika!**

---

## ✨ Tamamlandığında

✅ PWA installable (Ana ekrana eklenebilir)
✅ Offline mode (Cache desteği)
✅ Push notifications (Mesaj/teklif bildirimleri)
✅ Lighthouse PWA audit geçer
✅ ~100KB ek boyut (minimal)

---

## 🆘 Problem Olursa

- `PWA_SETUP_GUIDE.md` → Troubleshooting section
- DevTools → Console → hatayı oku
- Service Worker'ı clear et: Storage → Clear
- Secrets doğru mu kontrol et

---

**Başlamaya hazır mısın? 🚀**

Sorun çıkarsa sora, biz yanındayız!
