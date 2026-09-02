# Technical Specification Document (TSD) — SoalPintar SD

| | |
|---|---|
| **Nama Produk** | SoalPintar SD |
| **Versi Dokumen** | 0.1 (Draft) |
| **Status** | Draft untuk ditinjau |
| **Dokumen Terkait** | [`PRD.md`](./PRD.md) |

## 1. Tujuan Dokumen

Dokumen ini menjabarkan arsitektur teknis, tumpukan teknologi, model data, desain API, dan pertimbangan non-fungsional untuk membangun **SoalPintar SD** sesuai kebutuhan yang dijelaskan pada `PRD.md`.

## 2. Ringkasan Arsitektur

SoalPintar SD dibangun sebagai **aplikasi web full-stack** dengan tiga lapisan utama:

```
┌──────────────────────────────────────────────────────────┐
│                     Klien (Browser)                       │
│   Next.js (React) + TypeScript + Tailwind CSS + shadcn/ui │
│   - Antarmuka Guru / Orang Tua (dashboard)                │
│   - Antarmuka Siswa (mode latihan, ramah anak)            │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTPS (REST/JSON via Route Handlers)
┌───────────────────────────▼────────────────────────────────┐
│                  Aplikasi Server (Next.js)                 │
│   - Route Handlers (app/api/**)                            │
│   - Autentikasi & otorisasi (session/JWT)                   │
│   - Modul Generator Soal (integrasi LLM)                    │
│   - Modul Penilaian Otomatis                                 │
└───────────────────────────┬────────────────────────────────┘
                            │ ORM (Prisma)
┌───────────────────────────▼────────────────────────────────┐
│                     Basis Data (PostgreSQL)                │
│   Users, Classes, Subjects, Topics, Questions,              │
│   Assignments, Submissions, Answers                         │
└──────────────────────────────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Penyedia LLM (API)  │
                 │  (generate soal &    │
                 │   pembahasan)        │
                 └──────────────────────┘
```

## 3. Tumpukan Teknologi (Tech Stack)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Frontend | **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui** | Konsisten dengan default proyek web, mendukung SSR/SSG untuk performa, komponen siap pakai untuk mempercepat UI yang ramah pengguna termasuk siswa SD. |
| Backend/API | **Next.js Route Handlers** (`app/api/**/route.ts`) | Menghindari kebutuhan layanan backend terpisah pada versi awal; cukup untuk skala aplikasi edukasi ini. |
| Basis Data | **PostgreSQL** dengan **Prisma ORM** | Relasional cocok untuk struktur data terhubung (kelas–siswa–soal–jawaban); Prisma memudahkan migrasi skema. |
| Autentikasi | **Auth.js (NextAuth)** dengan strategi kredensial (email/password) untuk guru & orang tua; akun siswa berupa profil turunan (child profile) yang dikelola oleh guru/orang tua tanpa email. | Menghindari kebutuhan data pribadi anak (email) sesuai batasan privasi pada PRD. |
| Pembuatan Soal AI | **API LLM eksternal** (misalnya OpenAI/Anthropic — dikonfigurasi via environment variable, dapat diganti) | Modul generator soal dipisahkan sebagai layanan (`lib/questionGenerator.ts`) sehingga penyedia LLM dapat diganti tanpa mengubah logika aplikasi. |
| Validasi | **Zod** | Validasi skema input di API dan formulir. |
| State/Data Fetching Klien | **TanStack Query** (opsional) atau Server Components + Server Actions | Mengurangi boilerplate fetching data. |
| Deployment | **Vercel** (frontend+API) & **PostgreSQL managed** (misalnya Neon/Supabase) | Cocok dengan Next.js, minim konfigurasi infrastruktur. |
| Testing | **Vitest** (unit), **Playwright** (E2E) | Standar modern untuk proyek TypeScript/Next.js. |

> Catatan: Jika ada kredensial/API key LLM yang belum tersedia saat implementasi, modul generator soal harus memiliki **mode fallback** (misalnya template soal statis) agar aplikasi tetap dapat didemokan tanpa API key aktif.

## 4. Model Data (Skema Utama)

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // hashed
  role      Role     // TEACHER | PARENT | ADMIN
  createdAt DateTime @default(now())

  classes   ClassRoom[]      @relation("TeacherClasses")
  children  StudentProfile[] @relation("ParentChildren")
  questions Question[]
}

enum Role {
  TEACHER
  PARENT
  ADMIN
}

model StudentProfile {
  id        String   @id @default(cuid())
  name      String
  grade     Int      // 1..6
  avatarKey String?
  parentId  String?
  parent    User?    @relation("ParentChildren", fields: [parentId], references: [id])
  classId   String?
  classRoom ClassRoom? @relation(fields: [classId], references: [id])

  submissions Submission[]
}

model ClassRoom {
  id        String   @id @default(cuid())
  name      String   // contoh: "Kelas 4A"
  grade     Int
  teacherId String
  teacher   User     @relation("TeacherClasses", fields: [teacherId], references: [id])

  students    StudentProfile[]
  assignments Assignment[]
}

model Subject {
  id     String  @id @default(cuid())
  name   String  // Matematika, Bahasa Indonesia, IPAS, PPKn
  topics Topic[]
}

model Topic {
  id        String    @id @default(cuid())
  name      String    // contoh: "Pecahan", "Kalimat Majemuk"
  grade     Int
  subjectId String
  subject   Subject   @relation(fields: [subjectId], references: [id])
  questions Question[]
}

model Question {
  id           String       @id @default(cuid())
  type         QuestionType // MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER
  prompt       String
  choices      Json?        // untuk MULTIPLE_CHOICE: [{ key: "A", text: "..." }, ...]
  correctKey   String?      // kunci jawaban untuk pilihan ganda/benar-salah
  correctText  String?      // jawaban benar untuk isian singkat
  explanation  String       // pembahasan
  difficulty   Difficulty   // EASY | MEDIUM | HARD
  topicId      String
  topic        Topic        @relation(fields: [topicId], references: [id])
  createdById  String
  createdBy    User         @relation(fields: [createdById], references: [id])
  source       QuestionSource // AI_GENERATED | MANUAL
  createdAt    DateTime     @default(now())

  assignmentQuestions AssignmentQuestion[]
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum QuestionSource {
  AI_GENERATED
  MANUAL
}

model Assignment {
  id          String   @id @default(cuid())
  title       String
  classId     String
  classRoom   ClassRoom @relation(fields: [classId], references: [id])
  dueDate     DateTime?
  createdAt   DateTime @default(now())

  questions   AssignmentQuestion[]
  submissions Submission[]
}

model AssignmentQuestion {
  id           String     @id @default(cuid())
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id])
  questionId   String
  question     Question   @relation(fields: [questionId], references: [id])
  order        Int
}

model Submission {
  id           String     @id @default(cuid())
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id])
  studentId    String
  student      StudentProfile @relation(fields: [studentId], references: [id])
  startedAt    DateTime   @default(now())
  submittedAt  DateTime?
  score        Float?

  answers Answer[]
}

model Answer {
  id           String     @id @default(cuid())
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id])
  questionId   String
  answerText   String
  isCorrect    Boolean?
}
```

## 5. Desain API (Route Handlers)

Seluruh endpoint berada di bawah `app/api/` dan mengembalikan JSON. Otorisasi berbasis peran (`TEACHER`, `PARENT`, `ADMIN`) diperiksa di setiap handler.

| Endpoint | Metode | Deskripsi |
|---|---|---|
| `/api/auth/*` | — | Ditangani oleh Auth.js (login, register, session). |
| `/api/subjects` | GET | Daftar mata pelajaran & topik yang tersedia. |
| `/api/classes` | GET, POST | Guru melihat/membuat kelas. |
| `/api/classes/:id/students` | GET, POST | Kelola daftar siswa dalam kelas. |
| `/api/questions/generate` | POST | Memanggil modul generator AI dengan parameter (mapel, kelas, topik, kesulitan, jumlah, tipe soal) → mengembalikan draf soal (belum tersimpan). |
| `/api/questions` | GET, POST | Ambil bank soal (dengan filter) / simpan soal (hasil AI yang sudah ditinjau atau soal manual). |
| `/api/questions/:id` | PUT, DELETE | Edit/hapus soal. |
| `/api/assignments` | GET, POST | Guru membuat & melihat penugasan latihan untuk kelas. |
| `/api/assignments/:id/submissions` | GET | Guru melihat status pengerjaan siswa untuk suatu penugasan. |
| `/api/submissions` | POST | Siswa memulai pengerjaan (membuat submission baru). |
| `/api/submissions/:id/answers` | POST | Siswa mengirim jawaban per soal; server menilai otomatis & mengembalikan status benar/salah + pembahasan. |
| `/api/submissions/:id/finish` | POST | Menutup submission, menghitung skor akhir. |
| `/api/reports/class/:id` | GET | Rekap nilai kelas per topik (untuk dashboard guru). |
| `/api/reports/student/:id` | GET | Riwayat & progres individu siswa (untuk dashboard orang tua/siswa). |

### Modul Generator Soal (`lib/questionGenerator.ts`)

- Input: `{ subject, grade, topic, difficulty, questionType, count }`.
- Proses: membangun prompt terstruktur ke penyedia LLM yang meminta keluaran JSON terstandarisasi (pertanyaan, pilihan jawaban jika ada, kunci jawaban, pembahasan).
- Validasi keluaran LLM dengan skema **Zod** sebelum dikembalikan ke klien; jika keluaran tidak valid, lakukan retry terbatas atau fallback ke template soal statis per topik.
- Hasil bersifat **draf**: guru/orang tua wajib meninjau (dan dapat mengedit) sebelum disimpan permanen ke bank soal (`POST /api/questions`).

### Modul Penilaian Otomatis

- **Pilihan ganda / Benar-Salah**: pencocokan langsung dengan `correctKey`.
- **Isian singkat**: normalisasi teks (lowercase, trim, hilangkan spasi berlebih) lalu dibandingkan dengan `correctText`; dapat diperluas dengan pencocokan fuzzy sederhana untuk toleransi kesalahan ketik kecil.

## 6. Alur Pengguna Kunci (Sequence Singkat)

**Guru membuat & menugaskan latihan:**

1. Guru memilih mapel/kelas/topik/kesulitan/jumlah soal → `POST /api/questions/generate`.
2. Server memanggil LLM, mengembalikan draf soal ke klien.
3. Guru meninjau/mengedit draf di UI → menyimpan soal terpilih → `POST /api/questions`.
4. Guru membuat penugasan dari soal-soal tersimpan → `POST /api/assignments`.

**Siswa mengerjakan latihan:**

1. Siswa membuka daftar penugasan → memilih satu → `POST /api/submissions` (mulai pengerjaan).
2. Untuk setiap soal, siswa menjawab → `POST /api/submissions/:id/answers` → menerima status benar/salah + pembahasan secara real-time.
3. Setelah semua soal terjawab, siswa menekan "Selesai" → `POST /api/submissions/:id/finish` → skor akhir dihitung & ditampilkan.

## 7. Kebutuhan Non-Fungsional

- **Keamanan**: password di-hash (bcrypt/argon2); validasi input di semua endpoint dengan Zod; sanitasi konten yang dihasilkan AI sebelum ditampilkan (mencegah XSS pada teks soal).
- **Privasi Data Anak**: profil siswa tidak memerlukan email/nomor telepon; data yang dikumpulkan dibatasi pada nama, kelas, dan hasil latihan; akses data siswa hanya oleh guru/orang tua terkait.
- **Aksesibilitas & UX Anak**: kontras warna tinggi, ukuran tombol besar untuk sentuhan, teks singkat, dukungan navigasi keyboard dasar; komponen shadcn/ui dikustomisasi dengan tema ramah anak.
- **Ketersediaan Modul AI**: modul generator harus toleran terhadap kegagalan/timeout API LLM (retry + fallback ke template statis) agar fitur inti lain tetap berfungsi jika layanan AI bermasalah.
- **Kinerja**: hasil generate soal ditargetkan tampil dalam beberapa detik; gunakan indikator loading yang jelas di UI selama menunggu respons LLM.
- **Skalabilitas awal**: arsitektur monolitik Next.js + PostgreSQL cukup untuk skala satu sekolah/beberapa ribu pengguna; pemisahan layanan (misalnya worker terpisah untuk generasi AI) dapat dilakukan di fase lanjut jika diperlukan.

## 8. Rencana Implementasi per Fase (mengacu pada PRD §9)

1. **Fase 1 — Fondasi**: setup proyek Next.js + TypeScript + Tailwind + shadcn/ui; skema Prisma; autentikasi Auth.js; CRUD dasar untuk Subject/Topic/ClassRoom/StudentProfile.
2. **Fase 2 — Pembuatan Soal AI**: implementasi `lib/questionGenerator.ts`, endpoint `/api/questions/generate`, UI tinjau/edit draf soal, penyimpanan ke bank soal.
3. **Fase 3 — Penugasan & Pengerjaan Siswa**: endpoint Assignment & Submission, UI pengerjaan soal ramah anak.
4. **Fase 4 — Koreksi Otomatis & Laporan**: logika penilaian, endpoint & dashboard laporan guru/orang tua.
5. **Fase 5 — Penyempurnaan**: gamifikasi ringan, ekspor/impor CSV, pengujian usability dengan pengguna nyata, hardening keamanan & performa.

## 9. Hal yang Perlu Diputuskan Sebelum Implementasi

- Penyedia LLM yang akan digunakan (dan ketersediaan API key — lihat catatan pada §3).
- Penyedia hosting basis data PostgreSQL terkelola yang dipilih (Neon, Supabase, atau lainnya).
- Apakah versi awal memerlukan dukungan multi-sekolah (multi-tenant) atau cukup single-tenant per instalasi.
