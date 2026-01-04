# 🚀 VAMPIR-POLIS CANLIYA ÇIKARMA REHBERİ

## 📋 ÖNKOŞULLAR
- Node.js yüklü olmalı
- .NET 8 SDK yüklü olmalı
- Git yüklü olmalı

---

## 🔧 BACKEND DEPLOY (Railway.app ile - EN KOLAY)

### 1. Railway.app Hesabı Aç
- https://railway.app adresine git
- GitHub ile giriş yap

### 2. Yeni Proje Oluştur
- "New Project" → "Deploy from GitHub repo"
- `VampirPolisGame` repo'sunu seç

### 3. Ayarlar
- Root Directory: `/VampirPolisGame.Server`
- Start Command: `dotnet run`
- Port: 5076 (otomatik algılanır)

### 4. Deploy Et
- Railway otomatik deploy eder
- Backend URL'i not al: `https://vampirpolis-xxxx.railway.app`

---

## 🎨 FRONTEND DEPLOY (Vercel ile - ÇOK KOLAY)

### 1. Vercel CLI Kur
```bash
npm install -g vercel
```

### 2. Frontend Klasörüne Git
```bash
cd vampirpolis-client
```

### 3. .env.production Dosyasını Düzenle
```bash
# Backend URL'ini buraya yaz
VITE_BACKEND_URL=https://vampirpolis-xxxx.railway.app
```

### 4. Build Et
```bash
npm run build
```

### 5. Deploy Et
```bash
vercel --prod
```

Vercel sana bir URL verecek: `https://vampir-polis.vercel.app`

---

## ✅ TEST ET

1. Frontend URL'ini aç: `https://vampir-polis.vercel.app`
2. Oda oluştur
3. Farklı tarayıcılardan/telefonlardan katıl
4. Oyunu test et

---

## 🔐 GÜVENLİK (Opsiyonel)

### Backend'de IP Whitelist
```csharp
// Program.cs'e ekle
policy.WithOrigins(
    "https://vampir-polis.vercel.app",
    "https://your-custom-domain.com"
)
```

---

## 💰 MALİYET

**Railway (Backend):**
- İlk 5$ ücretsiz (ayda ~100 saat)
- Sonrası: $5/ay

**Vercel (Frontend):**
- Tamamen ücretsiz
- Bandwidth: Sınırsız

**Toplam: İlk ay ücretsiz, sonrası ~$5/ay**

---

## 🐛 SORUN GİDERME

### "CORS Error"
→ Backend CORS ayarlarını kontrol et (Program.cs)

### "Connection Failed"
→ Backend URL'ini kontrol et (.env.production)

### "Build Failed"
→ `npm install` yap, tekrar dene

---

## 📞 DESTEK

Sorun yaşarsan:
1. Railway logs: Railway dashboard → Logs
2. Vercel logs: Vercel dashboard → Deployment logs
3. Browser console: F12 → Console tab
