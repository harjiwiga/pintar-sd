# SoalPintar SD

Platform web untuk **guru** dan **orang tua** membuat soal latihan SD (Kurikulum Merdeka) dengan bantuan AI, mengelola bank soal, memberi tugas ke kelas, serta latihan pribadi yang bisa dikerjakan **offline** (setelah paket disimpan).

Dokumen produk:
- [`docs/PRD.md`](./docs/PRD.md) — kebutuhan produk
- [`docs/TSD.md`](./docs/TSD.md) — spesifikasi teknis

---

## Stack singkat

| Lapisan | Teknologi |
|--------|-----------|
| App | Next.js 14 (App Router), TypeScript, Tailwind |
| Auth | Auth.js / NextAuth v5 |
| DB | PostgreSQL + Prisma (`pgvector` untuk RAG) |
| AI | LLM API (generate soal) + opsional Gemini Vision (OCR stylus) |
| Offline latihan | IndexedDB + PWA (Serwist; aktif di production) |

---

## Prasyarat

- **Node.js** 18+ (disarankan 20 LTS)
- **npm**
- **Docker** + Docker Compose (untuk Postgres lokal)
- Kunci API LLM (OpenAI / DeepSeek / dll.)
- Opsional: `VISION_API_KEY` (Gemini) untuk baca tulisan pena lebih akurat

---

## Setup lokal (langkah demi langkah)

### 1. Clone & install

```bash
git clone <url-repo-anda>
cd pintar-sd
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` minimal:

| Variabel | Keterangan |
|----------|------------|
| `DATABASE_URL` | Sesuai Docker Compose (lihat `.env.example`) |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `LLM_PROVIDER` / `LLM_MODEL` / `LLM_API_KEY` | Generate soal |
| `EMBEDDING_*` | Jika `RAG_ENABLED=true` |
| `VISION_*` | Opsional, OCR stylus |

**Jangan commit** file `.env` / `.env.local` (sudah di `.gitignore`).

### 3. Database

```bash
docker compose up -d
npx prisma migrate deploy
# atau development pertama kali: npx prisma db push
npm run prisma:seed
```

> **Production (Railway, dll.):** `npm start` menjalankan `prisma migrate deploy` otomatis agar kolom seperti `UserMaterial.contentHash` ikut terbuat. Pastikan folder `prisma/migrations/` ikut ter-push ke Git.

Seed mengisi mata pelajaran & topik SD.

### 4. (Opsional) Index RAG kurikulum

```bash
npm run rag:index
```

Sumber: `docs/kurikulum/` (isi dokumen kurikulum jika ingin retrieval aktif).

### 5. Jalankan development

```bash
npm run dev
```

Buka **http://localhost:3000**  
Dari tablet di Wi‑Fi yang sama: `http://<IP-PC>:3000` (`AUTH_TRUST_HOST=true`).

---

## Production / uji PWA offline

Service worker **tidak aktif** di `npm run dev`. Untuk offline + PWA:

```bash
npm run build
npm start
```

Lalu buka ulang di browser (HTTPS atau localhost).

**Alur latihan offline (pribadi):**
1. Online → halaman Soal → **Simpan offline** per mapel  
2. Offline → kerjakan & **Hitung skor** (skor di perangkat)  
3. **Tugas dari guru ke murid tetap butuh online**  
4. Stylus/OCR Vision tetap butuh online; ketik manual tetap bisa offline  

---

## Skrip npm

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Development (port 3000, `0.0.0.0`) |
| `npm run build` | Build production + bundle Serwist SW |
| `npm start` | Jalankan hasil build |
| `npm test` | Unit test (Vitest) |
| `npm run test:e2e` | E2E Playwright |
| `npm run prisma:seed` | Seed DB |
| `npm run rag:index` | Index embedding kurikulum |
| `npm run lint` | ESLint |

---

## Alur penggunaan singkat

1. **Daftar / login** sebagai Guru atau Orang tua  
2. **Unggah materi** (PDF) di menu Materi  
3. **Buat soal AI** dari materi / topik → simpan ke bank soal  
4. **Latihan** di menu Soal (bisa simpan offline)  
5. **Guru:** buat kelas, undang siswa, buat tugas  
6. **Siswa:** login siswa → kerjakan tugas (online)

---

## Struktur folder (ringkas)

```
pintar-sd/
├── app/                 # Halaman & API Route Handlers
├── components/          # UI (quiz, material, class, …)
├── lib/                 # grader, RAG, OCR, offline practice, …
├── prisma/              # schema.prisma, seed, migrations
├── docs/                # PRD, TSD, kurikulum
├── public/              # aset statis (+ SW hasil build, di-ignore)
├── uploads/             # file user (lokal, di-ignore)
├── tests/               # unit & e2e
├── docker-compose.yml   # Postgres + pgvector
└── .env.example         # template env (aman di-commit)
```

---

## Deploy singkat (uji ~20 orang)

Karena ada folder `uploads/`, PDF/OCR, dan pgvector, paling sederhana:

- **VPS kecil** atau **Railway / Render** (bukan shared hosting), atau  
- Vercel + Neon **hanya jika** storage dipindah ke Blob/S3

Set `NEXTAUTH_URL` ke URL publik, jalankan migrasi/`db push`, seed, lalu `build` + `start`.

---

## Troubleshooting

| Gejala | Cek |
|--------|-----|
| Gagal login / session | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST` |
| DB error | `docker compose ps`, `DATABASE_URL` |
| Generate soal gagal | `LLM_API_KEY`, provider/model, kuota API |
| OCR pena buruk / error | set `VISION_PROVIDER=google` + `VISION_API_KEY` |
| Offline tidak jalan | pakai `build`+`start`, pernah **Simpan offline**, kunjungi halaman saat online dulu |
| Upload gagal | izin tulis folder `uploads/`, `MAX_UPLOAD_SIZE_MB` |

---

## Kontribusi / catatan git

- Commit `.env.example`, **jangan** commit secret  
- `uploads/`, `.next/`, `node_modules/`, data Tesseract `*.traineddata`, dan service worker hasil build **tidak** ikut di-push (lihat `.gitignore`)
