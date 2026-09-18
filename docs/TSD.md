# Technical Specification Document (TSD) — SoalPintar SD

| | |
|---|---|
| **Nama Produk** | SoalPintar SD |
| **Versi Dokumen** | 0.2 |
| **Status** | Diselaraskan dengan implementasi saat ini |
| **Dokumen Terkait** | [`PRD.md`](./PRD.md) |
| **Terakhir diperbarui** | 2026-09-10 |

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
│   Assignments, Submissions, Answers,                        │
│   UserMaterials, MaterialChunks, MaterialFigures            │
└──────────────────────────────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Penyedia LLM (API)  │
                 │  generate soal       │
                 │  (+ opsional Vision  │
                 │   untuk OCR stylus)  │
                 └──────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Storage lokal MVP   │
                 │  uploads/ (materi &  │
                 │  figure crop/upload) │
                 └──────────────────────┘
```

## 3. Tumpukan Teknologi (Tech Stack)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Frontend | **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui** | Konsisten dengan default proyek web, mendukung SSR/SSG untuk performa, komponen siap pakai untuk mempercepat UI yang ramah pengguna termasuk siswa SD. |
| Backend/API | **Next.js Route Handlers** (`app/api/**/route.ts`) | Menghindari kebutuhan layanan backend terpisah pada versi awal; cukup untuk skala aplikasi edukasi ini. |
| Basis Data | **PostgreSQL** dengan **Prisma ORM** | Relasional cocok untuk struktur data terhubung (kelas–siswa–soal–jawaban); Prisma memudahkan migrasi skema. |
| Autentikasi | **Auth.js (NextAuth)** dengan strategi kredensial (email/password) untuk guru & orang tua. Siswa login via **username + PIN 4 digit** (tanpa email) menggunakan endpoint terpisah `/api/auth/student-login`; lihat §6 untuk detail mekanisme. | Menghindari kebutuhan data pribadi anak sesuai batasan privasi pada PRD. |
| Pembuatan Soal AI | **API LLM eksternal** (misalnya OpenAI/Anthropic — dikonfigurasi via environment variable, dapat diganti) | Modul generator soal dipisahkan sebagai layanan (`lib/questionGenerator.ts`) sehingga penyedia LLM dapat diganti tanpa mengubah logika aplikasi. |
| Validasi | **Zod** | Validasi skema input di API dan formulir. |
| State/Data Fetching Klien | **TanStack Query** (opsional) atau Server Components + Server Actions | Mengurangi boilerplate fetching data. |
| Deployment | **Vercel** (frontend+API) & **PostgreSQL managed** (misalnya Neon/Supabase) | Cocok dengan Next.js, minim konfigurasi infrastruktur. |
| Dev Database | **Docker Compose** (`docker-compose.yml` di root proyek) | Menjalankan PostgreSQL lokal untuk pengembangan; lihat §10. |
| Materi PDF/gambar | **`pdf-parse`**, **`tesseract.js`**, **`mupdf`**, **`sharp`** | Ekstrak teks; render halaman PDF; crop region & kompres WebP. |
| OCR jawaban stylus | **Tesseract** (default) + opsional **Gemini Vision** (`VISION_*`) | Tulisan tangan siswa pada esai/isian. |
| Testing | **Vitest** (unit), **Playwright** (E2E) | Standar modern untuk proyek TypeScript/Next.js. |

> Catatan: Jika ada kredensial/API key LLM yang belum tersedia saat implementasi, modul generator soal harus memiliki **mode fallback** (misalnya template soal statis) agar aplikasi tetap dapat didemokan tanpa API key aktif.

## 4. Struktur Folder Proyek

```
pintar-sd/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: halaman autentikasi
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group: halaman setelah login
│   │   ├── layout.tsx            # Layout dengan sidebar & navbar
│   │   ├── dashboard/page.tsx    # Redirect ke /guru atau /ortu sesuai peran
│   │   ├── guru/
│   │   │   ├── page.tsx          # Dashboard guru
│   │   │   ├── kelas/
│   │   │   │   ├── page.tsx      # Daftar kelas
│   │   │   │   └── [id]/page.tsx # Detail kelas + daftar siswa
│   │   │   ├── soal/
│   │   │   │   ├── page.tsx      # Bank soal
│   │   │   │   ├── buat/page.tsx # Generate soal AI / buat manual
│   │   │   │   └── [id]/page.tsx # Edit soal
│   │   │   └── tugas/
│   │   │       ├── page.tsx      # Daftar penugasan
│   │   │       └── [id]/page.tsx # Detail penugasan + rekap nilai
│   │   ├── ortu/
│   │   │   ├── page.tsx          # Dashboard orang tua
│   │   │   └── anak/[id]/page.tsx # Progres anak
│   │   └── siswa/
│   │       ├── page.tsx          # Daftar tugas siswa
│   │       └── latihan/[id]/page.tsx # Halaman pengerjaan soal
│   ├── api/                      # Route Handlers (backend)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── subjects/route.ts
│   │   ├── classes/
│   │   │   ├── route.ts
│   │   │   └── [id]/students/route.ts
│   │   ├── questions/
│   │   │   ├── route.ts
│   │   │   ├── generate/route.ts
│   │   │   └── [id]/route.ts
│   │   ├── assignments/
│   │   │   ├── route.ts
│   │   │   └── [id]/submissions/route.ts
│   │   ├── submissions/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── answers/route.ts
│   │   │       └── finish/route.ts
│   │   └── reports/
│   │       ├── class/[id]/route.ts
│   │       └── student/[id]/route.ts
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── components/                   # Komponen React yang dapat digunakan ulang
│   ├── ui/                       # Komponen shadcn/ui (auto-generated)
│   ├── question/
│   │   ├── QuestionCard.tsx      # Tampilan satu soal (untuk siswa)
│   │   ├── QuestionEditor.tsx    # Form edit soal (untuk guru)
│   │   └── DraftReviewer.tsx     # UI tinjau draf soal AI
│   ├── assignment/
│   │   ├── AssignmentList.tsx
│   │   └── AssignmentForm.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Navbar.tsx
│
├── lib/                          # Logika bisnis & utilitas
│   ├── questionGenerator.ts      # Modul utama integrasi LLM
│   ├── llmClient.ts              # Abstraksi LLMClient (interface + implementasi)
│   ├── grader.ts                 # Modul penilaian otomatis
│   ├── auth.ts                   # Konfigurasi Auth.js
│   ├── prisma.ts                 # Singleton Prisma Client
│   ├── validations/              # Skema Zod untuk validasi input API
│   │   ├── question.ts
│   │   ├── assignment.ts
│   │   └── submission.ts
│   └── questionTemplates/        # Fallback soal statis per mapel & kelas
│       ├── matematika-kelas-4.json
│       └── ...
│
├── prisma/
│   ├── schema.prisma             # Skema database
│   ├── migrations/               # Riwayat migrasi
│   └── seed.ts                   # Data awal (Subject, Topic)
│
├── types/                        # TypeScript type definitions global
│   └── index.ts
│
├── public/                       # Aset statis
│   └── avatars/                  # Avatar siswa bawaan
│
├── tests/
│   ├── unit/                     # Test unit (Vitest)
│   │   ├── questionGenerator.test.ts
│   │   └── grader.test.ts
│   └── e2e/                      # Test E2E (Playwright)
│       ├── guru-generate-soal.spec.ts
│       └── siswa-kerjakan-latihan.spec.ts
│
├── docker-compose.yml
├── .env.local                    # (tidak di-commit) variabel environment lokal
├── .env.example                  # Template env (di-commit)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 5. Model Data (Skema Utama)

> Skema lengkap ini dituliskan ke `prisma/schema.prisma`.

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
  username  String   @unique  // auto-generate, e.g. "budi-kelas4a", digunakan untuk login
  pin       String            // hashed PIN 4 digit (bcrypt), diset oleh guru/orang tua
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
  joinCode  String   @unique // kode gabung siswa
  teacherId String
  teacher   User     @relation("TeacherClasses", fields: [teacherId], references: [id])
  createdAt DateTime @default(now())

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
  type         QuestionType // MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER | ESSAY
  prompt       String
  choices      Json?        // MULTIPLE_CHOICE: [{ key: "A", text: "..." }, ...]
  correctKey   String?
  correctText  String?
  explanation  String
  difficulty   Difficulty
  topicId      String
  topic        Topic        @relation(fields: [topicId], references: [id])
  createdById  String
  createdBy    User         @relation(fields: [createdById], references: [id])
  source       QuestionSource
  weight       Int          @default(1) // bobot skor relatif
  figureId     String?      // opsional: gambar dari MaterialFigure
  figure       MaterialFigure? @relation(fields: [figureId], references: [id], onDelete: SetNull)
  createdAt    DateTime     @default(now())

  assignmentQuestions AssignmentQuestion[]
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
  ESSAY
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

model LLMLog {
  id           String   @id @default(cuid())
  userId       String                // siapa yang memicu generate
  provider     String                // "openai" | "anthropic" | "google"
  model        String                // e.g. "gpt-4o-mini"
  subject      String
  grade        Int
  topic        String
  difficulty   String
  questionType String
  count        Int                   // jumlah soal diminta
  status       LLMLogStatus          // SUCCESS | FAILED | FALLBACK
  durationMs   Int                   // lama pemanggilan dalam ms
  inputTokens  Int?                  // token input (jika dilaporkan provider)
  outputTokens Int?                  // token output
  errorMessage String?               // pesan error jika gagal
  createdAt    DateTime @default(now())
}

enum LLMLogStatus {
  SUCCESS
  FAILED
  FALLBACK
}
```

## 6. Desain API (Route Handlers)

Seluruh endpoint berada di bawah `app/api/` dan mengembalikan JSON. Otorisasi berbasis peran (`TEACHER`, `PARENT`, `ADMIN`) diperiksa di setiap handler.

| Endpoint | Metode | Deskripsi |
|---|---|---|
| `/api/auth/*` | — | Ditangani oleh Auth.js (login, register, session). |
| `/api/subjects` | GET | Daftar mata pelajaran & topik yang tersedia. |
| `/api/classes` | GET, POST | Guru melihat/membuat kelas. |
| `/api/classes/:id/students` | GET, POST | Kelola daftar siswa dalam kelas. |
| `/api/questions/generate` | POST | Generate draf soal AI. Body: mapel, kelas, topik/topics, kesulitan, komposisi jumlah & bobot, opsional `materialId`. |
| `/api/questions` | GET, POST | Bank soal / simpan soal (termasuk opsional `figureId`). |
| `/api/questions/:id` | PUT, DELETE | Edit/hapus soal. |
| `/api/assignments` | GET, POST | Guru membuat & melihat penugasan. |
| `/api/assignments/:id/submissions` | GET | Status pengerjaan siswa. |
| `/api/submissions` | POST | Mulai pengerjaan. |
| `/api/submissions/:id/answers` | POST | Kirim jawaban per soal. |
| `/api/submissions/:id/finish` | POST | Selesai & skor. |
| `/api/quiz/questions` | GET | Soal latihan praktik (filter mapel; menyertakan `imageUrl` bila ada figure). |
| `/api/materials` | GET, POST | Pustaka materi bersama (GET) / upload dokumen (POST multipart). |
| `/api/materials/:id` | GET, DELETE | Detail / hapus (hanya pemilik). |
| `/api/materials/:id/figures` | GET | Daftar crop/gambar dari materi; lazy-extract bila belum ada. Query opsional `prompt` untuk ranking. |
| `/api/figures/upload` | POST | Unggah gambar manual untuk soal (JPG/PNG/WEBP → WebP). |
| `/api/figures/:id` | GET | Stream file gambar (auth guru/ortu/siswa). |
| `/api/ocr/handwriting` | POST | OCR tulisan tangan (Gemini Vision bila `VISION_API_KEY`, else Tesseract). |
| `/api/reports/class/:id` | GET | Rekap kelas *(target)*. |
| `/api/reports/student/:id` | GET | Progres siswa *(target)*. |

### Autentikasi Siswa (tanpa email)

Siswa login menggunakan **username + PIN 4 digit**, bukan email/password. Mekanisme ini dikelola terpisah dari Auth.js yang digunakan guru/orang tua.

**Alur pembuatan akun siswa:**
1. Guru/orang tua membuat `StudentProfile` via `POST /api/classes/:id/students`.
2. Server meng-generate `username` secara otomatis: format `{nama-depan}-{nama-kelas}` (lowercase, tanpa spasi), misal `budi-kelas4a`. Jika duplikat, tambahkan angka: `budi-kelas4a-2`.
3. Guru/orang tua menetapkan PIN 4 digit; server menyimpan hasil **hash bcrypt** dari PIN tersebut.
4. Guru/orang tua memberitahu username & PIN ke siswa (lisan / kertas).

**Alur login siswa:**
1. Siswa membuka halaman `/login/siswa`.
2. Siswa mengisi `username` dan `PIN` (4 angka, input type `password`).
3. Server mencari `StudentProfile` berdasarkan `username`, lalu verifikasi PIN dengan `bcrypt.compare()`.
4. Jika valid, buat **session** Auth.js dengan role khusus `STUDENT` dan `studentProfileId`.
5. Siswa diarahkan ke halaman `/siswa` (daftar penugasan).

**Endpoint tambahan untuk manajemen siswa:**

| Endpoint | Metode | Deskripsi |
|---|---|---|
| `/api/students/:id/reset-pin` | POST | Guru/orang tua mereset PIN siswa. Body: `{ newPin: "1234" }`. |
| `/api/auth/student-login` | POST | Login siswa via username + PIN (terpisah dari NextAuth credentials). |

**Perubahan skema `StudentProfile`** (sudah tercermin di §5 Model Data):
- `username String @unique` — digunakan sebagai identitas login.
- `pin String` — bcrypt hash dari PIN 4 digit.

> **Catatan keamanan**: PIN 4 digit memiliki entropi rendah. Terapkan **rate limiting** (max 5 percobaan salah per 10 menit per username) dan **lockout sementara** untuk mencegah brute force.

### Standar Format Response API

Seluruh endpoint menggunakan envelope JSON yang konsisten.

**Response Sukses:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Response Sukses dengan Paginasi:**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 85
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Deskripsi error yang dapat dibaca manusia",
    "details": [ ... ]
  }
}
```

**Daftar Kode Error Standar:**

| HTTP Status | `error.code` | Kapan Digunakan |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Input tidak lolos validasi Zod |
| `401` | `UNAUTHENTICATED` | Tidak ada sesi aktif / token tidak valid |
| `403` | `FORBIDDEN` | Sesi valid tapi peran tidak memiliki akses |
| `404` | `NOT_FOUND` | Resource tidak ditemukan |
| `409` | `CONFLICT` | Duplikasi data (misalnya email sudah terdaftar) |
| `422` | `LLM_INVALID_OUTPUT` | LLM mengembalikan output yang tidak dapat diparse/divalidasi |
| `429` | `RATE_LIMITED` | Melampaui batas 10 request/menit untuk generate soal |
| `503` | `LLM_UNAVAILABLE` | Seluruh retry habis & tidak ada fallback tersedia |
| `500` | `INTERNAL_ERROR` | Error tidak terduga di server |

> Catatan: error `LLM_INVALID_OUTPUT` dan `LLM_UNAVAILABLE` dikembalikan sebagai respons ke klien hanya jika fallback template statis juga tidak tersedia. Jika fallback berhasil, respons tetap `200` dengan `data` berisi soal dari template.

### Modul Generator Soal (`lib/questionGenerator.ts`)

#### 5a. Gambaran Umum

Modul ini bertanggung jawab mengubah parameter input (mata pelajaran, kelas, topik, dll.) menjadi draf soal terstruktur yang siap ditinjau guru. Seluruh interaksi dengan LLM dienkapsulasi di sini agar bagian aplikasi lain tidak perlu mengetahui detail penyedia AI yang digunakan.

#### 5b. Parameter Input

```typescript
interface GenerateQuestionsInput {
  subject:      string;        // e.g. "Matematika"
  grade:        number;        // 1..6
  topic:        string;        // e.g. "Pecahan Sederhana"
  difficulty:   "EASY" | "MEDIUM" | "HARD";
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  count:        number;        // 1..20 (batas maksimum per request untuk menghindari timeout)
  language?:    string;        // default "id" (Bahasa Indonesia)
  curriculum?:  string;        // default "Kurikulum Merdeka"
}
```

#### 5c. Pemilihan Penyedia LLM

Penyedia dikonfigurasi melalui environment variable sehingga dapat diganti tanpa mengubah kode aplikasi.

| Environment Variable | Nilai Default | Keterangan |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai` \| `anthropic` \| `google` \| `openrouter` |
| `LLM_MODEL` | `gpt-4o-mini` | Model spesifik yang digunakan (contoh di bawah) |
| `LLM_API_KEY` | *(wajib diisi)* | API key untuk penyedia yang dipilih |
| `LLM_BASE_URL` | *(opsional)* | Override endpoint, berguna untuk proxy/OpenRouter |
| `LLM_TIMEOUT_MS` | `30000` | Timeout per request dalam milidetik |
| `LLM_MAX_RETRIES` | `2` | Jumlah retry otomatis sebelum fallback |

**Rekomendasi model per penyedia:**

| Penyedia | Model yang Direkomendasikan | Catatan |
|---|---|---|
| OpenAI | `gpt-4o-mini` | Keseimbangan biaya/kualitas; mendukung JSON mode. |
| Anthropic | `claude-3-5-haiku-20241022` | Cepat, biaya rendah, bahasa Indonesia sangat baik. |
| Google | `gemini-1.5-flash` | Kuota gratis tersedia, cocok untuk MVP. |
| OpenRouter | *(pilih model di atas melalui OpenRouter)* | Satu API key untuk multi-provider. |

> **Keputusan awal (lihat §9):** penyedia final belum ditentukan. Implementasi harus menggunakan abstraksi (`LLMClient` interface) agar mudah diganti.

#### 5d. Desain Prompt (Prompt Engineering)

Prompt dibangun secara dinamis dari template yang telah diverifikasi. Struktur prompt menggunakan pendekatan **System + User** untuk model chat-based.

**System Prompt (tetap, tidak bergantung parameter):**
```
Kamu adalah asisten pembuat soal latihan untuk siswa Sekolah Dasar (SD) di Indonesia.
Kamu membuat soal yang:
- Sesuai dengan Kurikulum Merdeka
- Menggunakan Bahasa Indonesia yang baik, jelas, dan sesuai usia siswa
- Akurat secara fakta dan konsep
- Memiliki tingkat kognitif yang sesuai dengan jenjang kelas (Bloom's Taxonomy: C1-C2 untuk EASY, C3 untuk MEDIUM, C4-C5 untuk HARD)
- TIDAK mengandung konten yang tidak pantas, SARA, atau menyesatkan

Kamu HANYA merespons dalam format JSON yang valid sesuai skema yang diminta.
Jangan tambahkan teks, penjelasan, atau markdown di luar JSON.
```

**User Prompt (dibangun dinamis):**
```
Buatkan {count} soal {questionType_label} untuk:
- Mata Pelajaran : {subject}
- Kelas          : {grade} SD
- Topik/Bab      : {topic}
- Tingkat Kesulitan: {difficulty_label}
- Kurikulum      : {curriculum}

Format respons HARUS berupa JSON array dengan struktur berikut:
{JSON_SCHEMA_PLACEHOLDER}
```

**Mapping label:**
- `questionType_label`: `"pilihan ganda"` / `"benar atau salah"` / `"isian singkat"`
- `difficulty_label`: `"mudah (C1-C2)"` / `"sedang (C3)"` / `"sulit (C4-C5)"`

#### 5e. Skema Keluaran LLM (JSON Output Schema)

LLM diwajibkan mengembalikan JSON array. Skema ini juga digunakan sebagai skema validasi Zod.

```typescript
// Skema per soal yang dikembalikan LLM
const LLMQuestionSchema = z.object({
  prompt:       z.string().min(10),   // teks soal
  choices: z.array(z.object({         // hanya untuk MULTIPLE_CHOICE
    key:  z.enum(["A", "B", "C", "D"]),
    text: z.string().min(1),
  })).length(4).optional(),
  correctKey:   z.string().optional(), // "A"/"B"/"C"/"D" atau "BENAR"/"SALAH"
  correctText:  z.string().optional(), // untuk SHORT_ANSWER
  explanation:  z.string().min(10),    // pembahasan wajib ada
});

const LLMResponseSchema = z.array(LLMQuestionSchema).min(1);
```

Contoh keluaran yang valid untuk 1 soal pilihan ganda:
```json
[
  {
    "prompt": "Hasil dari 1/2 + 1/4 adalah ...",
    "choices": [
      { "key": "A", "text": "1/2" },
      { "key": "B", "text": "3/4" },
      { "key": "C", "text": "2/6" },
      { "key": "D", "text": "1/3" }
    ],
    "correctKey": "B",
    "explanation": "Untuk menjumlahkan pecahan berbeda penyebut, samakan penyebutnya terlebih dahulu. 1/2 = 2/4, sehingga 2/4 + 1/4 = 3/4."
  }
]
```

#### 5f. Strategi Pemanggilan & Penanganan Error

Alur pemanggilan LLM mengikuti urutan berikut:

```
Input Parameter
      │
      ▼
Bangun Prompt (System + User)
      │
      ▼
Panggil LLM API ──► [Timeout / Error Jaringan] ──► Retry (max LLM_MAX_RETRIES kali)
      │                                                        │
      ▼                                                        ▼ (habis retry)
Terima Respons Teks                                    Fallback ke Template Statis
      │
      ▼
Parse JSON (JSON.parse)
      │
      ├── [Parse Gagal] ──► Coba ekstrak JSON dari teks (regex) ──► Retry 1x
      │                                                              │ (gagal lagi)
      │                                                              ▼
      │                                                     Fallback ke Template Statis
      ▼
Validasi dengan Zod Schema
      │
      ├── [Validasi Gagal] ──► Log error + Retry 1x dengan instruksi perbaikan
      │                                              │ (gagal lagi)
      │                                              ▼
      │                                     Fallback ke Template Statis
      ▼
Sanitasi Konten (strip HTML/script tags)
      │
      ▼
Kembalikan draf soal ke handler API
```

**Mode Fallback (Template Statis):**  
Tersimpan di `lib/questionTemplates/` sebagai file JSON per mata pelajaran dan kelas. Template ini digunakan apabila LLM tidak tersedia atau gagal setelah semua retry habis. Template berisi soal-soal yang sudah diverifikasi secara konten (bukan hasil generasi otomatis). Jumlah soal yang diminta akan diambil secara acak dari template yang tersedia.

#### 5g. Penggunaan Fitur Model (JSON Mode / Structured Outputs)

Untuk memastikan keluaran LLM selalu berupa JSON valid, aktifkan fitur native model jika tersedia:

| Penyedia | Fitur | Cara Mengaktifkan |
|---|---|---|
| OpenAI | **JSON Mode** | `response_format: { type: "json_object" }` |
| OpenAI (GPT-4o+) | **Structured Outputs** | `response_format: { type: "json_schema", json_schema: { ... } }` |
| Anthropic | *(tidak ada JSON mode native)* | Instruksi kuat di prompt + validasi Zod |
| Google Gemini | **JSON Mode** | `responseMimeType: "application/json"` |

#### 5h. Estimasi Biaya & Token

Estimasi penggunaan token untuk 1 request (generate 10 soal pilihan ganda):

| Komponen | Estimasi Token |
|---|---|
| System Prompt | ~150 token |
| User Prompt (dengan skema) | ~200 token |
| **Total Input** | **~350 token** |
| Output (10 soal × ~120 token/soal) | ~1.200 token |
| **Total per Request** | **~1.550 token** |

Dengan model `gpt-4o-mini` (~$0.15/1M input, ~$0.60/1M output):
- Biaya per request ≈ **~$0.0008** (< 1 sen USD)
- 1.000 request/bulan ≈ **~$0.80/bulan**

> Catatan: estimasi ini bersifat perkiraan; pantau penggunaan aktual melalui dashboard penyedia LLM.

#### 5i. Keamanan & Sanitasi Konten AI

- **Sanitasi HTML**: seluruh teks yang dikembalikan LLM (soal, pilihan, pembahasan) di-escape dengan library seperti `DOMPurify` (sisi server) atau `he` sebelum disimpan ke database, untuk mencegah XSS.
- **Pembatasan panjang**: teks soal dibatasi maksimum 500 karakter; pembahasan 1.000 karakter. Jika melampaui batas, soal tersebut ditandai untuk ditinjau ulang.
- **Content moderation** *(opsional, fase lanjut)*: dapat ditambahkan pengecekan menggunakan OpenAI Moderation API atau filter kata kunci berbahasa Indonesia sebelum soal dikembalikan ke klien.
- **Rate limiting**: endpoint `/api/questions/generate` dibatasi maksimum **10 request per menit per pengguna** untuk mencegah penyalahgunaan dan membatasi biaya API.
- **Audit log**: setiap pemanggilan LLM dicatat (userId, parameter input, durasi, status sukses/gagal/fallback) ke tabel `LLMLog` di database untuk keperluan debugging dan monitoring biaya.

#### 5j. Hasil Bersifat Draf

Keluaran dari modul ini **tidak pernah langsung disimpan** ke tabel `Question`. Seluruh soal dikembalikan sebagai draf sementara ke klien (response body `POST /api/questions/generate`). Guru/orang tua wajib meninjau dan secara eksplisit menyimpan soal yang disetujui melalui `POST /api/questions`. Ini memastikan tidak ada soal yang salah atau tidak relevan masuk ke bank soal tanpa sepengetahuan pengguna.

### Modul RAG — Grounding Soal ke Kurikulum Merdeka (`lib/ragRetriever.ts`)

#### RAG-1. Latar Belakang & Tujuan

Tanpa RAG, LLM menghasilkan soal berdasarkan pengetahuan umum yang bisa saja tidak selaras dengan **Capaian Pembelajaran (CP)** dan **Alur Tujuan Pembelajaran (ATP)** Kurikulum Merdeka yang berlaku. Dengan RAG, setiap prompt generasi soal diperkaya dengan potongan dokumen kurikulum resmi yang relevan, sehingga:

- Soal yang dihasilkan sesuai dengan kompetensi yang ditargetkan per fase/kelas.
- Pembahasan merujuk pada konsep yang memang diajarkan di jenjang tersebut.
- Mengurangi kemungkinan soal terlalu mudah/sulit karena model "menebak" level kognitif.

#### RAG-2. Arsitektur Komponen RAG

```
Dokumen Kurikulum (PDF/Markdown)
  Kemdikbud: CP, ATP, Modul Ajar
         │
         ▼
  ┌─────────────────────┐
  │  Chunking & Parsing │  (offline / saat setup)
  │  lib/ragIndexer.ts  │
  └────────┬────────────┘
           │ teks per chunk (~500 token)
           ▼
  ┌─────────────────────┐
  │  Embedding Model    │  text-embedding-3-small (OpenAI)
  │                     │  atau model lokal (opsional)
  └────────┬────────────┘
           │ vektor float[]
           ▼
  ┌─────────────────────┐
  │  Vector Store       │  pgvector (ekstensi PostgreSQL)
  │  tabel: KurikulumChunk │
  └────────┬────────────┘
           │
           │  (saat runtime — generate soal)
           ▼
  ┌─────────────────────────────────────────┐
  │  Query Embedding                        │
  │  input: "{subject} kelas {grade} {topic}" │
  └────────┬────────────────────────────────┘
           │ similarity search (cosine)
           ▼
  ┌─────────────────────┐
  │  Top-K Chunks       │  k=3..5 potongan paling relevan
  │  (konteks RAG)      │
  └────────┬────────────┘
           │ disisipkan ke User Prompt
           ▼
  ┌─────────────────────┐
  │  LLM (generate soal)│
  └─────────────────────┘
```

#### RAG-3. Model Data Tambahan (pgvector)

Tambahkan ekstensi `pgvector` ke PostgreSQL dan tabel berikut di `schema.prisma`:

```prisma
// Aktifkan ekstensi pgvector di migrasi awal:
// CREATE EXTENSION IF NOT EXISTS vector;

model KurikulumChunk {
  id         String   @id @default(cuid())
  sourceFile String   // nama file dokumen asal, e.g. "CP-Matematika-2022.pdf"
  subject    String   // "Matematika" | "Bahasa Indonesia" | "IPAS" | "PPKn"
  grade      Int?     // null = berlaku semua kelas; 1..6 jika spesifik
  phase      String?  // "Fase A" | "Fase B" | "Fase C" (Kurikulum Merdeka)
  chunkIndex Int      // urutan chunk dalam dokumen
  content    String   // teks chunk (plain text)
  embedding  Unsupported("vector(1536)")?  // dimensi sesuai model embedding
  createdAt  DateTime @default(now())

  @@index([subject, grade])
}
```

> **Catatan migrasi**: karena Prisma belum mendukung tipe `vector` secara native, kolom `embedding` didefinisikan dengan `Unsupported(...)` dan query similarity dilakukan via raw SQL (`$queryRaw`).

#### RAG-4. Proses Indexing (Offline)

Dijalankan satu kali saat setup awal (dan diulangi jika dokumen kurikulum diperbarui):

```bash
# Jalankan script indexing
pnpm tsx lib/ragIndexer.ts --source docs/kurikulum/
```

Alur `ragIndexer.ts`:
1. Baca semua file PDF/Markdown dari folder `docs/kurikulum/`.
2. Parse teks (gunakan `pdf-parse` untuk PDF, atau `remark` untuk Markdown).
3. **Chunking**: potong teks menjadi chunk ~400–500 token dengan overlap 50 token (sliding window) agar konteks tidak terpotong di tengah kalimat.
4. Untuk setiap chunk, panggil **Embedding API** → dapatkan vektor `float[]` 1536 dimensi.
5. Simpan chunk + vektor ke tabel `KurikulumChunk`.

**Struktur folder dokumen kurikulum:**
```
docs/kurikulum/
├── matematika/
│   ├── CP-Matematika-FaseA-B-C.pdf
│   └── ATP-Matematika-Kelas4.pdf
├── bahasa-indonesia/
│   └── CP-BahasaIndonesia-FaseA-B-C.pdf
├── ipas/
│   └── CP-IPAS-FaseB-C.pdf
└── ppkn/
    └── CP-PPKn-FaseA-B-C.pdf
```

#### RAG-5. Proses Retrieval (Runtime)

Di `lib/ragRetriever.ts`, fungsi `retrieveContext()`:

```typescript
async function retrieveContext(
  subject: string,
  grade: number,
  topic: string,
  topK: number = 4
): Promise<string> {
  // 1. Buat query string dari parameter
  const query = `${subject} kelas ${grade} SD ${topic} Kurikulum Merdeka capaian pembelajaran`;

  // 2. Embed query
  const queryEmbedding = await embedText(query); // float[]

  // 3. Similarity search via raw SQL (pgvector cosine distance)
  const chunks = await prisma.$queryRaw<KurikulumChunk[]>`
    SELECT content, source_file, "chunkIndex"
    FROM "KurikulumChunk"
    WHERE subject = ${subject}
      AND (grade IS NULL OR grade = ${grade})
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `;

  // 4. Gabungkan chunk menjadi satu blok konteks
  return chunks.map(c => c.content).join("\n\n---\n\n");
}
```

#### RAG-6. Integrasi ke Prompt Generator

Di `lib/questionGenerator.ts`, sebelum memanggil LLM, ambil konteks RAG dan sisipkan ke User Prompt:

**User Prompt (diperbarui dengan RAG):**
```
Buatkan {count} soal {questionType_label} untuk:
- Mata Pelajaran  : {subject}
- Kelas           : {grade} SD
- Topik/Bab       : {topic}
- Tingkat Kesulitan: {difficulty_label}
- Kurikulum       : Kurikulum Merdeka

=== KONTEKS KURIKULUM (gunakan sebagai acuan kompetensi) ===
{rag_context}
============================================================

Soal harus sesuai dengan Capaian Pembelajaran dan kompetensi
yang tercantum dalam konteks di atas.

Format respons HARUS berupa JSON array dengan struktur berikut:
{JSON_SCHEMA_PLACEHOLDER}
```

#### RAG-7. Konfigurasi Environment Variable Tambahan

| Environment Variable | Nilai Default | Keterangan |
|---|---|---|
| `EMBEDDING_PROVIDER` | `openai` | Provider untuk embedding (`openai` \| `local`) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Model embedding; dimensi 1536 |
| `EMBEDDING_API_KEY` | *(sama dengan `LLM_API_KEY` jika OpenAI)* | API key embedding |
| `RAG_TOP_K` | `4` | Jumlah chunk yang diambil per query |
| `RAG_ENABLED` | `true` | Set `false` untuk menonaktifkan RAG (fallback ke prompt tanpa konteks) |

> Jika `RAG_ENABLED=false` atau tabel `KurikulumChunk` kosong, modul generator tetap berfungsi tanpa konteks kurikulum — tidak ada error, hanya kualitas grounding yang berkurang.

#### RAG-8. Dependency Tambahan

```bash
pnpm add @prisma/client pdf-parse @xenova/transformers
pnpm add -D @types/pdf-parse
```

Juga perlu menambahkan ekstensi pgvector ke `docker-compose.yml`:

```yaml
# Ganti image postgres:16-alpine dengan image yang sudah include pgvector:
image: pgvector/pgvector:pg16
```

#### RAG-9. Estimasi Biaya Embedding

| Operasi | Volume | Estimasi Biaya |
|---|---|---|
| **Indexing awal** (1x setup) | ~500 chunk × 400 token = 200K token | ~$0.004 (sekali) |
| **Retrieval per generate** | 1 query × ~30 token | ~$0.000001 per request |
| **Total embedding/bulan** (1.000 generate) | ~30K token | **< $0.01/bulan** |

> Embedding jauh lebih murah dari generasi teks. Biaya RAG dapat diabaikan dibandingkan biaya pemanggilan LLM utama.

### Modul Penilaian Otomatis

- **Pilihan ganda / Benar-Salah**: pencocokan langsung dengan `correctKey`.
- **Isian singkat**: normalisasi teks (lowercase, trim, hilangkan spasi berlebih) lalu dibandingkan dengan `correctText`; dapat diperluas dengan pencocokan fuzzy sederhana untuk toleransi kesalahan ketik kecil.

## 7. Alur Pengguna Kunci (Sequence Singkat)

**Guru membuat & menugaskan latihan:**

1. Guru memilih mapel/kelas/topik/kesulitan/jumlah soal → `POST /api/questions/generate`.
2. Server memanggil LLM, mengembalikan draf soal ke klien.
3. Guru meninjau/mengedit draf di UI → menyimpan soal terpilih → `POST /api/questions`.
4. Guru membuat penugasan dari soal-soal tersimpan → `POST /api/assignments`.

**Siswa mengerjakan latihan:**

1. Siswa membuka daftar penugasan → memilih satu → `POST /api/submissions` (mulai pengerjaan).
2. Untuk setiap soal, siswa menjawab → `POST /api/submissions/:id/answers` → menerima status benar/salah + pembahasan secara real-time.
3. Setelah semua soal terjawab, siswa menekan "Selesai" → `POST /api/submissions/:id/finish` → skor akhir dihitung & ditampilkan.

## 8. Kebutuhan Non-Fungsional

- **Keamanan**: password di-hash (bcrypt/argon2); validasi input di semua endpoint dengan Zod; sanitasi konten yang dihasilkan AI sebelum ditampilkan (mencegah XSS pada teks soal).
- **Privasi Data Anak**: profil siswa tidak memerlukan email/nomor telepon; data yang dikumpulkan dibatasi pada nama, kelas, dan hasil latihan; akses data siswa hanya oleh guru/orang tua terkait.
- **Aksesibilitas & UX Anak**: kontras warna tinggi, ukuran tombol besar untuk sentuhan, teks singkat, dukungan navigasi keyboard dasar; komponen shadcn/ui dikustomisasi dengan tema ramah anak.
- **Ketersediaan Modul AI**: modul generator harus toleran terhadap kegagalan/timeout API LLM (retry + fallback ke template statis) agar fitur inti lain tetap berfungsi jika layanan AI bermasalah.
- **Kinerja**: hasil generate soal ditargetkan tampil dalam beberapa detik; gunakan indikator loading yang jelas di UI selama menunggu respons LLM.
- **Skalabilitas awal**: arsitektur monolitik Next.js + PostgreSQL cukup untuk skala satu sekolah/beberapa ribu pengguna; pemisahan layanan (misalnya worker terpisah untuk generasi AI) dapat dilakukan di fase lanjut jika diperlukan.

## 9. Rencana Implementasi per Fase (mengacu pada PRD §9)

1. **Fase 1 — Fondasi**: setup Next.js + Prisma + Auth.js + CRUD Subject/Topic/ClassRoom/StudentProfile.
2. **Fase 2 — Pembuatan Soal AI**: `questionGenerator`, generate API, tinjau draf, bank soal, RAG kurikulum.
3. **Fase 3 — Penugasan & Pengerjaan**: Assignment/Submission, UI siswa, skor berbobot, stylus OCR.
4. **Fase 4 — Materi & Gambar Soal**: pustaka bersama, User-Driven RAG, MaterialFigure Level 2, upload gambar manual.
5. **Fase 5 — Laporan & Penyempurnaan**: dashboard analitik, gamifikasi, ekspor/impor, crop UI manual, cloud storage opsional.

## 10. Pengembangan Lokal (Local Development)


### Prasyarat
- **Docker** & **Docker Compose** terinstal di mesin pengembang.
- **Node.js 20+** dan **pnpm** (atau npm/yarn).

### Menjalankan Database Lokal

```bash
# Jalankan PostgreSQL via Docker Compose
docker compose up -d

# Cek status container
docker compose ps

# Hentikan container
docker compose down

# Hentikan & hapus data (reset total)
docker compose down -v
```

### Konfigurasi `.env.local`

Buat file `.env.local` di root proyek dengan isi berikut:

```env
# ── Database (Docker Compose lokal) ──────────────────────────
DATABASE_URL="postgresql://pintar-sd:pintar-sd-123@localhost:5432/pintar-sd"

# ── Auth.js ───────────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ganti-dengan-secret-acak-minimal-32-karakter"

# ── LLM — Generate Soal ───────────────────────────────────────
LLM_PROVIDER="openai"           # openai | anthropic | google | openrouter
LLM_MODEL="gpt-4o-mini"
LLM_API_KEY="sk-..."
LLM_TIMEOUT_MS="30000"
LLM_MAX_RETRIES="2"
# LLM_BASE_URL="https://openrouter.ai/api/v1"   # opsional, untuk OpenRouter

# ── RAG — Embedding & Retrieval Kurikulum ────────────────────
RAG_ENABLED="true"
RAG_TOP_K="4"
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_API_KEY="sk-..."

# ── Materi upload ─────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB="20"

# ── Vision — OCR tulisan tangan (opsional) ────────────────────
# VISION_PROVIDER="google"
# VISION_MODEL="gemini-2.5-flash"
# VISION_API_KEY=""
```

> Storage materi/figure pada MVP: folder lokal `uploads/` (lihat `lib/storageClient.ts`). Migrasi ke Vercel Blob/S3 dapat dilakukan kemudian tanpa mengubah kontrak API publik.
### Setup Awal Setelah Clone

```bash
# 1. Install dependensi
pnpm install

# 2. Jalankan database
docker compose up -d

# 3. Jalankan migrasi Prisma
pnpm prisma migrate dev --name init

# 4. (Opsional) Seed data awal
pnpm prisma db seed

# 5. Jalankan dev server
pnpm dev
```

---

## 12. Upload Dokumen Materi & User-Driven RAG *(Implemented MVP)*

Fitur ini **sudah diimplementasikan** (sebelumnya Nice-to-Have di PRD/TSD 0.1). Guru/orang tua mengunggah PDF atau gambar sebagai konteks generate soal, melengkapi RAG kurikulum (§RAG).

### 12a. Arsitektur Komponen (aktual)

```
Guru/Orang Tua
    │ upload file (PDF / JPG / PNG / WEBP, default maks 20 MB)
    ▼
POST /api/materials
    │
    ├─► Hash SHA-256 (contentHash) → jika dokumen sama sudah READY, reuse
    │
    ├─► Simpan file ke storage lokal: uploads/{userId}/{materialId}.ext
    │   (lib/storageClient.ts)
    │
    ├─► Ekstrak teks
    │   PDF    → pdf-parse
    │   Gambar → tesseract.js (lib/ocrExtractor.ts)
    │
    ├─► Chunking teks (lib/textChunker.ts)
    │
    ├─► Simpan UserMaterial + MaterialChunk; status READY
    │
    └─► (best-effort) Extract figures Level 2
        lib/materialFigureExtractor.ts → MaterialFigure[]

Saat generate soal (POST /api/questions/generate + materialId):
    retrieveUserMaterialContext(materialId)
        → potongan teks materi (+ konteks kurikulum)
        → sisipkan ke prompt LLM
```

### 12b. Model Data

```prisma
model UserMaterial {
  id            String         @id @default(cuid())
  uploadedById  String
  uploadedBy    User           @relation(...)
  fileName      String
  fileUrl       String         // path relatif lokal
  mimeType      String
  contentHash   String?        @unique // SHA-256 isi file
  extractedText String?
  subject       String?
  grade         Int?
  status        MaterialStatus // PROCESSING | READY | FAILED
  createdAt     DateTime       @default(now())
  chunks        MaterialChunk[]
  figures       MaterialFigure[]
}

model MaterialChunk {
  id         String @id @default(cuid())
  materialId String
  material   UserMaterial @relation(..., onDelete: Cascade)
  chunkIndex Int
  content    String
  embedding  Unsupported("vector(1536)")?
  createdAt  DateTime @default(now())
  @@index([materialId])
}
```

> Bucket internal `fileName = "Unggahan gambar soal"` untuk gambar manual soal; **disembunyikan** dari `GET /api/materials`.

### 12c. Endpoint API

| Endpoint | Metode | Deskripsi |
|---|---|---|
| `/api/materials` | GET | Pustaka bersama READY (+ milik sendiri). Dedup `contentHash` / nama. |
| `/api/materials` | POST | Upload multipart: `file`, opsional `subject`, `grade`. |
| `/api/materials/:id` | GET | Detail + excerpt. |
| `/api/materials/:id` | DELETE | Hanya pengunggah; hapus DB + file + figures. |
| `/api/materials/:id/figures` | GET | Lihat §13. |

### 12d. Ekstraksi Teks

| Tipe File | Metode | Library |
|---|---|---|
| PDF | Parse teks | `pdf-parse` |
| Gambar | OCR lokal | `tesseract.js` |

> TSD 0.1 merencanakan Vision LLM untuk OCR **materi**. MVP memakai Tesseract (tanpa biaya API). Vision LLM dipakai jalur **jawaban tulisan tangan** (§14).

### 12e. Integrasi Generate Soal

Parameter opsional `materialId` pada `POST /api/questions/generate`. Jika diisi, prompt mendapat konteks materi pengguna. Tanpa itu, RAG kurikulum tetap dipakai (jika aktif).

### 12f. File terkait

```
lib/materialProcessor.ts
lib/materialText.ts
lib/ocrExtractor.ts
lib/storageClient.ts
lib/textChunker.ts
lib/ragRetriever.ts
components/material/MaterialLibrary.tsx
components/question/GenerateSoalForm.tsx
```

### 12g. Keamanan & Batasan

- Validasi magic-bytes MIME.
- Sanitasi teks ekstraksi.
- Hapus file fisik saat DELETE.
- Dedup lintas user.
- Storage lokal MVP (`uploads/`); cloud opsional kemudian.

---

## 13. Gambar pada Soal *(MaterialFigure — Implemented MVP)*

Melengkapi PRD F9: soal dapat menyematkan gambar dari **crop otomatis materi** atau **unggah manual**.

### 13a. Alur Level 2 — Render halaman + crop region

```
PDF/gambar materi
    │
    ├─ PDF: mupdf render halaman (max 12 halaman, scale ~1.25)
    ├─ Image: decode via sharp
    │
    ├─ Deteksi region (heuristik kepadatan tinta / whitespace)
    │   max 3 region/halaman, max 24 total
    │
    ├─ Crop → WebP (sharp)
    │
    └─ MaterialFigure { pageNumber, bboxJson, fileUrl, nearbyText, areaRatio }
```

Biaya API: **$0** (proses lokal).

### 13b. Model

```prisma
model MaterialFigure {
  id         String   @id @default(cuid())
  materialId String
  material   UserMaterial @relation(..., onDelete: Cascade)
  pageNumber Int      // 0 = unggahan manual; >=1 = halaman sumber
  bboxJson   Json
  fileUrl    String
  width      Int
  height     Int
  nearbyText String?
  areaRatio  Float    @default(0)
  createdAt  DateTime @default(now())
  questions  Question[]
  @@index([materialId])
}
```

`Question.figureId` → FK opsional ke `MaterialFigure` (`onDelete: SetNull`).

### 13c. API & UI

| Endpoint | Peran |
|---|---|
| `GET /api/materials/:id/figures?prompt=` | Lazy extract bila belum ada; ranking vs prompt |
| `POST /api/figures/upload` | Unggah JPG/PNG/WEBP → WebP + MaterialFigure (`pageNumber=0`) |
| `GET /api/figures/:id` | Stream WebP (auth guru/ortu/siswa) |
| `POST /api/questions` + `figureId` | Simpan soal dengan gambar |

**UI** (`GenerateSoalForm`): unggah manual, pilih crop dari dokumen, atau tanpa gambar. Praktik & tugas siswa menampilkan `/api/figures/{id}`.

### 13d. File terkait

```
lib/materialFigureExtractor.ts
app/api/materials/[id]/figures/route.ts
app/api/figures/upload/route.ts
app/api/figures/[id]/route.ts
scripts/backfill-figures.ts
```

### 13e. Batasan & roadmap gambar

| Ada sekarang | Belum |
|---|---|
| Auto-detect region | Crop drag-rectangle manual |
| Upload manual per soal | Generate AI image |
| Ranking teks kasar | Pemilihan figure oleh LLM multimodal |
| Max 12 halaman PDF | Indeks figure seluruh buku |

---

## 14. Jawaban Tulisan Tangan (Stylus / OCR)

Untuk `ESSAY` / `SHORT_ANSWER`, `EssayAnswerInput` menyediakan kanvas stylus.

1. Preferensi: `VISION_PROVIDER=google` + `VISION_API_KEY` → Gemini Vision (`lib/handwritingVision.ts`).
2. Fallback: Tesseract (`lib/handwriting.ts` / `POST /api/ocr/handwriting`).

Ini **bukan** gambar stem soal (§13); ini konversi tinta siswa → teks jawaban.

---

## 15. Hal yang Perlu Diputuskan / Dilanjutkan

- Storage lokal vs migrasi Blob/S3 untuk production.
- Model Vision default setelah deprecation `gemini-2.0-flash` (disarankan `gemini-2.5-flash`).
- Prioritas: dashboard laporan ortu/guru vs crop UI manual.
- Multi-tenant sekolah pada fase berikutnya.
