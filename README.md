# 📋 WP Planner — AI-Powered WhatsApp Task Manager

<div align="center">

**Kendine WhatsApp mesajı at, AI görevlerini yönetsin.**

WhatsApp + Gemini AI + Akıllı Planlama = Üretkenlik

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

</div>

---

## ✨ Özellikler

### 🤖 WhatsApp AI Asistanı
- **Doğal dil ile görev oluşturma** — *"yarın 16'da toplantı"*, *"3 gün içinde mail gönder"*
- **Konuşma bağlamı** — *"bunu yarına taşı"* gibi referanslı komutlar
- **Anlamsız mesaj filtresi** — *"12321"*, *"asdas"* gibi mesajlar görev oluşturmaz
- **Self-chat** — Sadece kendine attığın mesajları işler, başkalarıyla konuşmalar özel kalır

### 📍 Konum Bazlı Görevler
- *"Kadıköy'de fatura öde"* → 📍 Kadıköy tag'i ile görev oluşturur
- *"Kadıköy'e gidiyorum, işim var mı?"* → O konumdaki görevleri bulur ve bugüne taşır

### 💡 Akıllı Öneri Motoru
- *"Ne yapabilirim?"* deyince:
  - 🚨 Gecikmiş görevleri gösterir
  - 🗺️ Konum bazlı gruplama — *"Kadıköy'de 3 iş var, gitmişken hepsini halledebilirsin!"*
  - ⏳ Bugün boşsa esnek görevleri çekmeyi önerir

### 📅 Esnek Görev Planlaması
- *"Bu hafta motoru bakıma götür"* → En boş güne otomatik atar
- *"3 gün içinde mail gönder"* → Deadline'a göre en uygun güne yerleştirir
- Yoğun günlere yüklenmez, iş yükünü dengeler

### ⏰ Akıllı Hatırlatmalar
- Saatli görevlerde **30 dk önce** WhatsApp hatırlatması
- **Gün başı** mesajı: Bugünkü görevlerin listesi
- **Gün sonu** mesajı: Bitmemiş görevler için uyarı
- Tekrarlayan görevler: günlük, haftalık, aylık, X günde bir

### 🌐 Modern Web Arayüzü
- Dashboard, görev listesi, takvim görünümü
- Profil ayarları: çalışma saatleri, Gemini API key
- **WhatsApp bağlantı yönetimi** — QR kodu web'den tarayın
- Dark mode, glassmorphism, micro-animations

---

## 🚀 Kurulum

### Gereksinimler
- **Node.js** 18+
- **npm** veya **yarn**
- **Google Gemini API Key** — [ai.google.dev](https://ai.google.dev) üzerinden ücretsiz alınabilir

### 1. Repoyu klonla

```bash
git clone https://github.com/YOUR_USERNAME/wp-planner.git
cd wp-planner
```

### 2. Backend kurulumu

```bash
cd backend
npm install
```

`.env` dosyası oluştur:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

Veritabanını oluştur:

```bash
npx prisma migrate dev
```

### 3. Frontend kurulumu

```bash
cd ../frontend
npm install
```

### 4. Çalıştır

İki terminal aç:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### 5. WhatsApp Bağlantısı

1. `http://localhost:5173` adresine git
2. Kayıt ol ve giriş yap
3. **Ayarlar** sayfasına git
4. QR kodu WhatsApp'tan tara: **Bağlı Cihazlar → Cihaz Bağla**
5. Kendine mesaj atarak test et!

---

## 💬 WhatsApp Komutları

| Mesaj | Sonuç |
|-------|-------|
| `yarın 16'da toplantı` | ✅ Saatli görev + 30 dk hatırlatma |
| `45 günde bir backup kontrolü yap` | 🔁 Tekrarlayan görev |
| `bu hafta motoru bakıma götür` | ⏳ Esnek görev, en boş güne atar |
| `3 gün içinde mail gönder` | ⏳ Deadline'lı esnek görev |
| `Kadıköy'de fatura öde` | 📍 Konumlu görev |
| `Kadıköy'e gidiyorum, işim var mı?` | 📍 Konum sorgusu + bugüne taşır |
| `bugün neler var?` | 📋 Bugünkü görevler |
| `yarın ne var?` | 📋 Yarınkı görevler |
| `görevlerimi listele` | 📋 Tüm görevler |
| `toplantı tamamlandı` | ✅ Görevi tamamlar |
| `ne yapabilirim?` | 💡 Akıllı öneri motoru |
| `bunu yarına taşı` | 📅 Konuşma bağlamıyla günceller |

---

## 🏗️ Mimari

```
wp-planner/
├── backend/
│   ├── prisma/              # Veritabanı şeması ve migration'lar
│   ├── src/
│   │   ├── config/          # Ortam değişkenleri
│   │   ├── controllers/     # HTTP controller'ları
│   │   ├── middlewares/     # JWT auth middleware
│   │   ├── routes/          # API route'ları
│   │   └── services/
│   │       ├── gemini.service.ts           # AI mesaj analizi
│   │       ├── whatsapp-client.service.ts  # WhatsApp bağlantısı
│   │       ├── scheduler.service.ts        # Zamanlanmış hatırlatmalar
│   │       ├── task.service.ts             # Görev CRUD
│   │       └── auth.service.ts             # Kimlik doğrulama
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React bileşenleri
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── services/        # API client
│   │   └── index.css        # Tasarım sistemi
│   └── package.json
├── TODO.md                  # Gelecek özellikler
├── LICENSE                  # MIT Lisansı
└── README.md
```

### Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Veritabanı** | SQLite + Prisma ORM |
| **AI** | Google Gemini 2.5 Flash |
| **WhatsApp** | whatsapp-web.js (Puppeteer) |
| **Auth** | JWT (jsonwebtoken, bcryptjs) |

---

## 📝 Roadmap

- [ ] 🎤 Ses mesajı ile görev oluşturma (Speech-to-Text)
- [ ] 🖼️ Resim ile görev oluşturma (Gemini Vision)
- [ ] 🌍 Çoklu dil desteği
- [ ] 📱 PWA desteği
- [ ] 🏷️ Görev kategorileri ve etiketler
- [ ] 📊 Haftalık/aylık verimlilik raporu

---

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı altında yayınlanmıştır.
