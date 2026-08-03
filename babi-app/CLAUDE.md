# Babi.App — Proje Hafızası

🐾 Babi 10 yaşında, kırmızı montlu, terk edilmişti, veterinerde bulunup sahiplenildi. Uygulamanın ismi ondan geliyor.

## Proje Tanımı

**Babi** — köpek sahiplerinin köpeklerini sosyalleştirmesi (Tinder benzeri swipe/eşleştirme), sağlık takibi yapması, bakım bilgisi edinmesi, etkinlik/park keşfetmesi VE köpek hizmeti veren işletmelerle (otel, pet kuaför, gezdirme) buluşması için bir mobil uygulama.

**Şirket:** Babi.App
**Geliştirici:** Ubeyd Özdemir — İşletme mezunu (YTÜ), Payten'de Application Support & Operations Specialist, sanal POS admini. Kod yazmayı AI ile öğreniyor, mimari/ürün kararlarını kendisi veriyor. Linux'a aşina (iş yerinde), geliştirme ortamı Windows.

## Teknik Stack

| Katman | Teknoloji |
|---|---|
| Frontend | React Native + Expo (SDK 56), Expo Router, dosya bazlı route, 6 sekmeli tab bar |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), eu-west-1 (Ireland) |
| Auth | Email OTP (6 haneli kod) — şifre yok |
| Mail | Resend (custom SMTP), domain: babiapp.net, doğrulanmış, sender: noreply@babiapp.net |
| Push | Expo Notifications, Android: Firebase FCM v1 (proje: babi-f24ea), iOS: APNs (EAS otomatik push key oluşturdu) |
| AI (kütüphane) | Groq API (llama-3.3-70b-versatile), Supabase Edge Function üzerinden |
| Harita | Google Maps (ücretsiz, deep-link ile, API key gerektirmiyor) |
| Versiyon kontrolü | GitHub: `ubeydoz/stackblitz-starters-1kmy2wy1` |
| Build | EAS Build/Submit |
| Web sitesi | Statik HTML/CSS (babiapp-site klasörü, ayrı proje), Vercel'de host, babiapp.net'e bağlı |

**Kimlikler:**
- EAS slug: `babi-app` (⚠️ app.json'daki slug ile EAS'taki proje slug'ı birebir eşleşmeli, `babi` değil `babi-app`)
- EAS project ID: `9adea62a-1eb5-4952-b5ce-81e4fa06d1ce`
- Bundle/Package: `com.ubeydoz.babiapp` (iOS & Android aynı)
- Supabase URL: `https://chvmmfruytmddxxgkiet.supabase.co`
- Apple Developer Team: X5SQVBG92P (Individual)
- App Store Connect App ID: 6797022858
- Proje yolu (Windows): `C:\Users\Ubeyd\stackblitz-starters-1kmy2wy1\babi-app`

## Veritabanı Şeması (özet)

**Köpek sahibi tarafı:** `profiles`, `dogs`, `dog_photos` (position sıralı, sürükle-bırak destekli), `swipes` (shown_photo_id ile "en beğenilen foto" takibi), `matches`, `messages`, `library_articles`, `health_records`, `blocks`, `reports`

**İşletme tarafı (ticari üyelik):** `business_profiles` (business_type: otel/timar_bakim/gezdirme — ⚠️ DB'de hâlâ `timar_bakim`, UI'da "Pet Kuaför" olarak gösteriliyor, kasıtlı ayrım), `business_photos`, `business_reviews` (rating 1-5 + yorum, unique(business_id, reviewer_id))

**Önemli:** Aynı hesap/e-posta hem köpek sahibi hem işletme profiline sahip olabilir. Mod değiştirme/switch UI'ı YOK — Profil ekranından "İşletmelerimi Yönet" ile ayrı bir giriş noktası var, otomatik yönlendirme yok.

**RPC fonksiyonları:** `get_dogs_nearby` (PostGIS mesafe+filtre), `get_businesses_nearby` (aynı mantık, işletmeler için, ortalama puan+yorum sayısı dahil)

## Ekran Yapısı

```
src/app/
  index.tsx                → Splash (patiler buluşma animasyonu, kalp esintili yastık şekli)
  login.tsx, terms.tsx
  register/
    account-type.tsx       → "Köpek Sahibiyim" / "İşletme Sahibiyim" seçimi (en başta)
    step1.tsx, verify.tsx  → accountType parametresini taşır, business ise step2'yi atlayıp business/create'e gider
    step2.tsx               → köpek bilgisi, ırk (arama+~130 ırk), kilo, takvimli doğum tarihi
    permissions.tsx, photos.tsx
  (tabs)/
    home.tsx                → swipe, çoklu foto gezinme, hasBusiness ise farklı mesaj+yönlendirme
    matches.tsx, chat.tsx   → block/report entegre
    events.tsx              → park/gezdirme GPS + "İşletmeleri Keşfet" girişi
    library.tsx, health.tsx, profile.tsx
  business/
    create.tsx, manage.tsx (liste), [id].tsx (detay/düzenle/yorum), discover.tsx (arama/filtre/mesafe)
lib/supabase.ts
```

## Mevcut Durum (1 Ağustos 2026 itibarıyla)

**MVP tamamlandı ve App Store'a gönderildi** (inceleme bekleniyor, ~48 saat). Google Play hesabı kurulum/kimlik doğrulama aşamasında.

Tamamlanan büyük özellikler: push notification (iOS+Android), block/report, profil+köpek fotoğraf yönetimi (avatar, galeri, sürükle-bırak sıralama, en beğenilen foto rozeti), takvimli doğum tarihi, genişletilmiş ırk listesi, kilo alanı, **tam bir ticari üyelik/marketplace sistemi** (işletme kaydı, yönetim, keşif, değerlendirme), özel domain + e-posta, kurumsal web sitesi, uygulama ikonu (turuncu zemin + beyaz kalp-pati tasarımı, Expo varsayılanının yerine).

**Rakip farkındalığı:** Türkiye'de SocialPups ve Petner doğrudan rakip. Babi'nin farkı: işletme marketplace + değerlendirme sistemi, AI kütüphane, sağlık takibi hepsi bir arada.

## Çalışma Tarzı (ÖNEMLİ)

1. **Türkçe konuş.** Uygulama içeriği tamamen Türkçe.
2. **Kod değişikliklerinde tüm dosyayı gönder**, parça diff değil — kullanıcı kopyala-yapıştırla çalışıyor.
3. **Her değişiklikten sonra commit komutu ver** (`git add . / commit / push`).
4. **Adım adım ilerle**, aynı anda birden fazla değişiklik önerme.
5. Kullanıcı bazen API key/token yapıştırabilir — böyle durumda nazikçe uyar.
6. Kullanıcı azimli, hızlı öğreniyor, teknik detayı açıklamaktan çekinme ama gereksiz teoriye boğma.
7. Büyük/riskli özellik istekleri geldiğinde (örn. yeni bir alt-sistem) önce kapsamı netleştir, MVP'ye etkisini dürüstçe belirt, sonra uygula.

## Bilinen Teknik Tuzaklar / Öğrenimler

- `expo-image-picker` web'de `blob:` URI döndürüyor — dosya uzantısını URI'den değil, **`asset.mimeType`**'tan çıkar (`mimeType.split('/')[1]`). Bu hatayı birden fazla dosyada (`profile.tsx`, `photos.tsx`) düzelttik, yeni fotoğraf yükleme kodu yazılırken hep bu desene uy.
- Supabase Storage upload'ı `.blob()` yerine **`response.arrayBuffer()`** ile yap, native'de daha güvenilir.
- Git kimliği ayarlanmadan commit sessizce başarısız olabilir: `git config --global user.name/email` gerekiyor.
- `react-native-calendars` varsayılan İngilizce — kök `_layout.tsx`'te `LocaleConfig` ile Türkçeleştirildi, yeni takvim eklenirse bu ayar zaten global.
- Windows'ta Android emulator için **Windows Hypervisor Platform (WHPX)** etkinleştirilmeli, yoksa emulator açılmaz/donar.
- Yeni route dosyası eklenince VS Code TypeScript sunucusu bazen tanımıyor — `npx expo start -c` + "TypeScript: Restart TS Server" gerekebilir.
- `react-native-reanimated` için ayrı `babel.config.js` gerekmiyor (SDK 56'da `babel-preset-expo` otomatik algılıyor), ama `react-native-gesture-handler` için kök layout'u `GestureHandlerRootView` ile sarmak şart.
- iOS ikon: Expo'nun yeni "Icon Composer" (`.icon` paketi, Mac-only) yerine düz PNG kullanılabiliyor, `ios.icon` alanına doğrudan `.png` yolu yazmak yeterli.
- App Store Connect açıklama metninde emoji bazen "invalid characters" hatası veriyor — düz metin kullan.
- Apple screenshot boyutu hesap/uygulamaya göre değişebiliyor (6.5" = 1284×2778, 6.9" = 1320×2868) — hangi sekmedeysen ona göre üret.

## Yol Haritasında Kalanlar

- Google Play: kimlik doğrulama + telefon doğrulama bekleniyor, sonra 12 kişilik/14 günlük zorunlu kapalı test süreci başlayacak
- Hesap silme özelliği (KVKK zorunluluğu, şu an sadece destek e-postasıyla)
- Çok dilli destek (TR/EN/ES/FR/NL/DE) — MVP sonrası, demo sonrası planlanan
- v2: TR SMS + e-Devlet, barınak senkronu, anlaşmalı veteriner (Zailo.ai potansiyel ortaklık), reklam sistemi, süper like, mesaj okundu bilgisi
