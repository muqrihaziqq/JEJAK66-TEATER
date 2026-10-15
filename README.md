# 🎭 Sistem Pembelian Tiket Pementasan Teater "JEJAK66"

Sistem web lengkap dan responsif untuk pengurusan tempahan dan pembelian tiket pementasan teater **JEJAK66** (18 November 2026) pada harga **RM 2.00** setiap tiket.

---

## 🚀 Panduan Memulakan Sistem (Cara Run)

### 1. Pelayan Tempatan (Local Server)
Pelayan backend dan frontend boleh dijalankan dengan:
- **Cara Pantas:** Klik dua kali (double-click) pada fail `start.bat`
- Atau melalui terminal PowerShell:
  ```powershell
  cd "C:\Users\User\.gemini\antigravity\scratch\jejak66-ticketing"
  node server.js
  ```

### 2. Pautan Laman Web (Akses Pelayar):
- **Laman Utama & Tempahan Tiket:** [http://localhost:3000](http://localhost:3000)
- **Semakan Status Tempahan Pembeli:** [http://localhost:3000/status.html](http://localhost:3000/status.html)
- **Portal Pentadbir (Admin):** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🔐 Maklumat Log Masuk Pentadbir (Admin)
- **Kata Laluan Lalai:** `admin123`
*(Boleh ditukar pada bila-bila masa di tab "Tetapan Pementasan" dalam portal admin)*

---

## ✨ Ciri-Ciri Utama Sistem

### 1. Bahagian Pembeli (Orang Awam):
- **Paparan Pementasan:** Info teater "JEJAK66", tarikh 18/11/2026, 8:30 malam, countdown timer secara langsung.
- **Borang Tempahan Interaktif:** Kiraan jumlah automatik (RM 2 × Bilangan Tiket).
- **Pembayaran Kod QR:** Paparan Kod QR DuitNow / Bank beserta butiran penerima.
- **Muat Naik Bukti Bayaran:** Pratonton imej resit / slip bayaran sebelum dihantar.
- **Semakan Status:** Pembeli boleh menyemak status menggunakan No. Telefon atau Kod Rujukan (cth: `J66-11000`).
- **E-Tiket & Invois Automatik:** Sebaik sahaja disahkan oleh admin, pembeli boleh membuka, memuat turun, atau mencetak E-Tiket (bersama Kod QR Masuk) dan Invois Rasmi.

### 2. Bahagian Pentadbir (Admin):
- **Dashboard Statistik:** Jumlah tiket terjual, kutipan tunai (RM), tempahan menunggu kelulusan, dan jumlah keseluruhan.
- **Semakan Bukti Bayaran:** Pop-up resolusi tinggi untuk memeriksa slip pemindahan atau gambar resit pembeli.
- **Tindakan 1-Klik:** 
  - ✅ **Sahkan (Approve):** Meluluskan tiket secara automatik.
  - ❌ **Tolak (Reject):** Memasukkan sebab penolakan jika resit tidak sah.
  - 🎫 **Lihat E-Tiket:** Membuka paparan tiket teater dengan kod QR imbasan pintu panggung.
  - 📄 **Lihat Invois:** Membuka invois rasmi dengan format percetakan PDF.
  - 📱 **Hantar WhatsApp:** Membuka WhatsApp secara automatik dengan mesej rasmi pengesahan dan pautan terus ke E-Tiket & Invois pembeli.
- **Tukar Kod QR Pembayaran:** Admin boleh memuat naik imej Kod QR DuitNow / TNG rasmi terus dari pelayar web tanpa perlu mengubah kod.
- **Kemas Kini Maklumat Acara:** Tukar lokasi dewan, masa persembahan, nama akaun bank dan maklumat penganjur.

---

## 📁 Struktur Fail Projek
```text
jejak66-ticketing/
├── server.js            # Pelayan Express API & Pengendali Muat Naik
├── package.json         # Konfigurasi Pakej Node.js
├── start.bat            # Skrip mudah untuk memulakan pelayan
├── data/
│   ├── event.json       # Konfigurasi acara, harga & kata laluan admin
│   └── tickets.json     # Pangkalan data rekod tempahan
├── uploads/
│   ├── receipts/        # Fail bukti pembayaran pembeli
│   └── qr/              # Gambar Kod QR pembayaran penganjur
└── public/
    ├── index.html       # Laman tempahan tiket teater awam
    ├── status.html      # Laman semakan status tempahan
    ├── ticket.html      # Paparan E-Tiket & Invois (boleh dicetak/PDF)
    ├── admin.html       # Portal pengurusan pentadbir
    ├── css/style.css    # Reka bentuk tema teater gelap & emas
    └── js/
        ├── app.js       # Logik frontend tempahan awam
        └── admin.js     # Logik frontend portal pentadbir
```
