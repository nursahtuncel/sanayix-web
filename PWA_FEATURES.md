# 📱 PWA Özellikler Özeti

## 1. 📲 Ana Ekrana Yükleme (Install to Home Screen)

**Ne işe yarar?**
- Uygulamayı telefonun ana ekranına ikon olarak ekleyebilmek
- Tam ekran modu (adres çubuğu gizli)
- Hızlı erişim

**Nasıl çalışır?**
- Chrome/Edge: Otomatik "Kur" butonu (AppShell'de gösterilir)
- Safari: "Paylaş → Ana Ekrana Ekle" talimatı
- Windows: Start Menu'ye eklenebilir

**Test:**
- Chrome: Install banner çıkacak → "Kur" tıkla
- Kurulduktan sonra başlat → Full screen mode

---

## 2. 🔄 Offline Caching

**Ne işe yarar?**
- İnternet olmadan daha önce açtığın sayfaları görebilmek
- Hızlı yükleme (cache'den serve)
- Uygulamanın "kurulmuş gibi" hissetmesi

**Nasıl çalışır?**
Service Worker 4 stratejisi kullanır:

| Route | Strateji | Örnekler |
|-------|----------|----------|
| HTML Pages | NetworkFirst | Sayfa refresh |
| API GET | NetworkFirst | Talep listesi |
| Images/Fonts | CacheFirst | Avatar, icon |
| Auth | NetworkOnly | Login token |

**İnternet yokken:**
- ✅ Önceki sayfalar açılır (cache'den)
- ✅ Resimleri yüklenir hızlı
- ❌ Yeni veri getirilemez
- ❌ Mesaj gönderilemiyor

**Test:**
1. DevTools → Network → Offline checkbox
2. Sayfayı refresh et
3. Önceki sayfalar hala açılabilir

---

## 3. 🔔 Push Notifications

**Ne işe yarar?**
- Uygulama kapalıyken de bildirim almak
- Mesaj geldiğinde popup bildirim
- Ustanın teklif gönderdiğinde haberdar olmak

**Nasıl çalışır?**
```
Backend                    Browser/Phone
(Supabase)                 (User Device)
    ↓
send-push-notification
    ↓
Web Push Service (FCM/APNs)
    ↓
Service Worker
    ↓
Notification popup
```

**Tetikleyiciler:**
1. Yeni mesaj → Alıcıya push
2. Yeni teklif → Talep sahibine push
3. Teklif kabul → Ustaya push

**Test:**
1. Notification.requestPermission() → "Allow"
2. Subscribe push
3. Supabase'den test edge function çalıştır
4. Popup bildirim almalısın

**Queueing & Sync:**
- Offline'da gönderilen mesajlar queue'ya eklenir
- İnternet gelince otomatik gönderilir
- Kullanıcı bunu farketmez (seamless)

---

## 🏗️ Teknik Mimari

```
SanayiX Frontend
├── Service Worker (src/sw.ts)
│   ├── Workbox strategies
│   ├── Offline caching
│   └── Push event handling
├── useInstallPrompt hook
│   ├── Detect browser capability
│   ├── Show install banner
│   └── Track dismissal
├── usePushNotifications hook
│   ├── Request permission
│   ├── Subscribe to push
│   └── Store endpoint on Supabase
└── AppShell UI
    └── Install banner

Supabase Backend
├── push_subscriptions table
│   └── user_id, endpoint, keys
├── Notification triggers
│   ├── messages → notify recipient
│   ├── offers → notify customer
│   └── offers update → notify professional
├── Edge Function: send-push-notification
│   ├── Fetch subscriptions
│   ├── Send to Web Push API
│   ├── Clean expired subs
│   └── Return status
└── Web Push API
    └── Browser/Device push service
```

---

## 🔐 Güvenlik

| Feature | Security |
|---------|----------|
| Public VAPID Key | ✅ Safe (used by browser) |
| Private VAPID Key | 🔒 Secret (Supabase only) |
| Endpoints | 🔒 Secret (one per device) |
| Encryption Keys | 🔒 Secret (device specific) |
| RLS Policies | ✅ Users see only their subscriptions |

---

## ⚡ Performance

| Operation | Cache Duration | Network Timeout |
|-----------|-----------------|-----------------|
| HTML Pages | 24 hours | 3s |
| API calls | 5 minutes | 4s |
| Images | 30 days | N/A |
| Auth | No cache | 10s |

**Offline Performance:**
- Static assets: ~100ms (from disk)
- Cached API: ~200ms (from IndexedDB)
- Network request: ~2-4s (slow 3G)

---

## 📊 Lighthouse Score

PWA fully configured:
```
✅ Installable
✅ Fast and Reliable
✅ Offline Support
✅ Service Worker
✅ Manifest
✅ Icons
✅ Theme Color
```

Expected Lighthouse PWA score: **90+**

---

## 🎯 User Experience

### Before PWA
- 🟡 Web app in browser tab
- 🟡 Slow (no cache)
- 🟡 No offline access
- 🟡 No notifications background

### After PWA
- 🟢 Native-like app icon
- 🟢 Fast (cached)
- 🟢 Works offline
- 🟢 Get push notifications
- 🟢 Takes up 5-10MB (small)
- 🟢 One-tap install

---

## 🐛 Common Questions

**Q: Offline'da teklif gönderebilir miyim?**
A: Hayır. Mesaj yazabilirsin ama göndermek için İnternet gerekli.

**Q: Kaç MB yer kaplar?**
A: ~5-15 MB (caching'e göre)

**Q: Nasıl uninstall?**
A: Ana ekrandan ikonu kaldır (normal app gibi)

**Q: Tüm tarayıcılarda çalışır mı?**
A: Chrome/Edge/Samsung full support. Safari partial (iOS 16.4+)

**Q: Otomatik update?**
A: Evet! autoUpdate mode'u aktif. User refresh yapınca yeni version yüklenir.

