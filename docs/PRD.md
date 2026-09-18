# Product Requirements Document (PRD) — SoalPintar SD

| | |
|---|---|
| **Nama Produk** | SoalPintar SD |
| **Versi Dokumen** | 0.2 |
| **Status** | Diselaraskan dengan implementasi saat ini |
| **Pemilik Produk** | Tim SoalPintar SD |
| **Terakhir diperbarui** | 2026-09-10 |

## 1. Latar Belakang & Masalah

Guru dan orang tua siswa Sekolah Dasar (SD) di Indonesia sering menghadapi kendala berikut:

- **Membuat soal latihan berkualitas memakan waktu.** Guru harus menyusun soal secara manual sesuai mata pelajaran, kelas, dan tingkat kesulitan, sering kali dari nol setiap kali akan mengadakan ulangan atau latihan.
- **Variasi soal terbatas.** Bank soal yang tersedia sering berulang, tidak disesuaikan dengan Kurikulum Merdeka/kurikulum nasional, atau tidak mencakup semua level kognitif (mengingat, memahami, menerapkan, menganalisis).
- **Sulit memantau perkembangan siswa secara individual.** Orang tua dan guru kesulitan mengetahui topik mana yang belum dikuasai seorang siswa untuk memberikan latihan tambahan yang tepat sasaran.
- **Koreksi soal manual memakan waktu**, terutama untuk kelas dengan jumlah siswa banyak.

**SoalPintar SD** hadir sebagai platform yang membantu **membuat soal latihan secara cepat (dibantu AI), mengelola bank soal per mata pelajaran/kelas, memberikan latihan kepada siswa, serta mengoreksi dan melaporkan hasil secara otomatis.**

## 2. Tujuan Produk (Goals)

1. Memudahkan guru/orang tua membuat soal latihan yang relevan dengan kurikulum SD (kelas 1–6) dalam waktu singkat.
2. Menyediakan bank soal terstruktur berdasarkan mata pelajaran, kelas, topik/bab, dan tingkat kesulitan.
3. Memungkinkan siswa mengerjakan latihan soal secara mandiri (online) dengan koreksi otomatis dan penjelasan jawaban.
4. Memberikan laporan progres belajar (per siswa, per topik) kepada guru/orang tua agar dapat menindaklanjuti kelemahan siswa.
5. Menjadi produk yang mudah digunakan oleh pengguna dengan literasi digital dasar (guru SD, orang tua, siswa usia 6–12 tahun).

### Non-Goals (Di luar lingkup versi awal)

- Bukan pengganti sistem manajemen sekolah (SIS/LMS) penuh (misalnya presensi, administrasi keuangan sekolah).
- Bukan platform video pembelajaran/tatap muka virtual.
- Tidak menangani ujian resmi berskala nasional (misalnya ANBU/ujian sekolah resmi) pada versi awal.

## 3. Target Pengguna & Persona

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Guru SD** | Guru kelas/mata pelajaran di SD, mengelola 1 atau lebih rombongan belajar. | Membuat soal cepat, mengelola bank soal, memberi tugas ke kelas, melihat rekap nilai kelas. |
| **Orang Tua** | Orang tua/wali siswa yang ingin memberi latihan tambahan di rumah. | Memilih topik latihan sesuai kelas anak, memantau progres anak. |
| **Siswa SD (kelas 1–6)** | Pengguna akhir yang mengerjakan soal. | Antarmuka sederhana, ramah anak, umpan balik langsung (benar/salah + penjelasan), motivasi (skor, lencana/badge). |
| **Admin Sekolah** *(opsional, fase lanjut)* | Mengelola akun guru dan kelas dalam satu sekolah. | Manajemen pengguna, lisensi, dan laporan agregat sekolah. |

## 4. Lingkup Fitur (Scope)

### 4.1 Fitur Inti (Must-Have — Versi 1)

1. **Pembuatan Soal Berbasis AI**
   - Guru/orang tua memasukkan parameter: mata pelajaran, kelas, topik/bab (satu bab atau rentang bab), tingkat kesulitan, komposisi jumlah soal per jenis, dan bobot skor per jenis.
   - Jenis soal yang didukung: **pilihan ganda**, **isian singkat**, **esai/soal cerita** (benar/salah opsional pada seed/template).
   - Sistem menghasilkan draf soal beserta kunci jawaban dan penjelasan yang dapat ditinjau sebelum disimpan.
   - Opsional: soal dapat menyematkan **gambar** (lihat F8).
2. **Bank Soal & Manajemen Konten**
   - Simpan, kategorikan (mapel/kelas/topik/kesulitan), cari, edit, dan hapus soal.
   - Setiap soal menyimpan `source` (AI/Manual), `weight` (bobot), dan opsional `figureId` (gambar).
3. **Manajemen Kelas & Penugasan**
   - Guru membuat kelas/rombongan belajar dengan **kode kelas (joinCode)** agar siswa dapat bergabung.
   - Guru membuat penugasan dari bank soal ke kelas, dengan tenggat opsional.
4. **Pengerjaan Latihan oleh Siswa**
   - Login siswa via **username + PIN**.
   - Antarmuka latihan (praktik mandiri dari bank soal milik guru/ortu) dan pengerjaan **tugas kelas**.
   - Untuk esai/isian: dukungan **kanvas stylus/tulisan tangan** dengan OCR (Tesseract lokal dan/atau Gemini Vision bila dikonfigurasi).
5. **Koreksi Otomatis & Umpan Balik**
   - Penilaian otomatis untuk pilihan ganda dan isian singkat (normalisasi teks).
   - Skor berbobot: benar semua = 100; kesalahan mengurangi proporsi bobot soal.
   - Penjelasan jawaban ditampilkan setelah submit.
6. **Laporan & Progres** *(sebagian)*
   - Dasar skor per submission tersedia; dashboard analitik kelas/topik masih dapat diperdalam.
7. **Autentikasi & Peran Pengguna**
   - Pendaftaran/login email+password untuk guru dan orang tua.
   - Akun siswa tanpa email (username + PIN); registrasi siswa dengan kode kelas.
8. **Pustaka Materi Bersama & User-Driven RAG** *(sudah diimplementasikan — sebelumnya Nice-to-Have)*
   - Guru/orang tua mengunggah PDF atau gambar (JPG/PNG/WEBP) sebagai referensi generate soal.
   - Deduplikasi lintas pengguna via `contentHash` (SHA-256); dokumen yang sama tidak diunggah ulang.
   - Teks diekstrak (`pdf-parse` / OCR Tesseract), di-chunk, dipakai sebagai konteks LLM bersama RAG kurikulum.
   - Storage lokal `uploads/` pada MVP (bukan wajib cloud).
9. **Gambar pada Soal** *(sebagian dari multimedia — sudah diimplementasikan)*
   - Saat tinjau draf generate: pilih crop otomatis dari dokumen referensi (**Level 2**: render halaman + deteksi region), **atau unggah gambar manual**.
   - Gambar ditampilkan di latihan praktik dan tugas siswa.

### 4.2 Fitur Tambahan (Nice-to-Have — Belum / Sebagian)

- Gamifikasi (lencana, papan peringkat kelas, streak harian).
- Rekomendasi latihan adaptif berdasarkan kelemahan siswa.
- Mode latihan offline / cetak PDF soal.
- **Audio** pada soal (multimedia penuh); gambar sudah tersedia (lihat F8/F9).
- Integrasi Kurikulum Merdeka lebih rinci (CP/ATP per fase) — RAG kurikulum dasar sudah ada.
- Aplikasi mobile native.
- Manajemen sekolah multi-tenant dengan admin sekolah.
- Generate gambar AI otomatis untuk soal (ditunda; preferensi: crop materi + upload manual).
- Crop manual interaktif (gambar rectangle) di atas preview halaman — peningkatan UX di atas auto-detect.
- Dashboard laporan kelas/topik yang lebih lengkap (heatmap kelemahan, filter rentang waktu).
- Impor/ekspor bank soal CSV.

#### User Story (materi & gambar — sudah relevan di versi ini)
- Sebagai **guru**, saya ingin mengunggah LKS/buku paket agar soal AI merujuk materi yang diajarkan.
- Sebagai **guru**, saya ingin memilih atau mengunggah gambar untuk soal agar siswa melihat diagram/ilustrasi yang sama dengan buku.
- Sebagai **orang tua**, saya ingin memakai pustaka materi bersama tanpa mengunggah ulang file yang sudah ada.
- Sebagai **siswa**, saya ingin menjawab esai dengan stylus dan melihat gambar pada soal jika guru menyematkannya.

## 4b. Acceptance Criteria per Fitur Inti

### F1 — Pembuatan Soal Berbasis AI
- [x] Guru/orang tua dapat memilih mata pelajaran, kelas (1–6), bab/rentang bab, tingkat kesulitan, dan komposisi jumlah soal (PG/isian/esai, total 1–20).
- [x] Sistem mengembalikan draf soal (target beberapa detik; tergantung LLM).
- [x] Setiap soal draf wajib memiliki: teks soal, pilihan (jika PG), kunci/jawaban model, dan pembahasan; bobot per jenis soal dapat diatur.
- [ ] Guru dapat mengedit teks soal, pilihan, kunci, dan pembahasan inline sebelum menyimpan *(sebagian: tinjau + simpan; editor penuh masih bisa diperdalam)*.
- [x] Guru dapat menyimpan soal per item atau semua dari draf.
- [x] Jika LLM gagal, ada jalur fallback soal template.
- [x] Soal tidak tersimpan tanpa aksi eksplisit "Simpan".

### F2 — Bank Soal & Manajemen Konten
- [x] Daftar/filter bank soal dasar tersedia.
- [ ] Edit soal tersimpan end-to-end di UI (endpoint PUT ada; kelengkapan UX bervariasi).
- [ ] Hapus soal dengan konfirmasi di UI.
- [x] Kolom `source` (AI/Manual) pada model data.
- [x] Pencarian berdasarkan kata kunci prompt (API filter `search`).

### F3 — Manajemen Kelas & Penugasan
- [x] Guru dapat membuat kelas (nama, tingkat) + `joinCode`.
- [x] Siswa dapat bergabung/daftar dengan kode kelas.
- [x] Guru dapat membuat penugasan dari bank soal ke kelas.
- [x] Tenggat waktu opsional.
- [x] Siswa melihat daftar tugas & mengerjakan; status submission tersimpan.

### F4 — Pengerjaan Latihan oleh Siswa
- [x] Login username + PIN.
- [x] Daftar penugasan untuk kelas siswa.
- [x] Latihan praktik mandiri dari bank soal pembuat.
- [x] Jawaban esai/isian via teks dan/atau kanvas tulisan tangan + OCR.
- [x] Tampilan responsif untuk tablet (fokus LAN/WSL didukung).

### F5 — Koreksi Otomatis & Umpan Balik
- [x] Benar/salah + pembahasan setelah selesai (praktik/tugas).
- [x] Skor berbobot (total bobot → skala 100).
- [x] Isian singkat dinilai case-insensitive / trim.

### F6 — Laporan & Progres
- [ ] Dashboard guru rekap per siswa/topik lengkap.
- [ ] Topik dengan kesalahan tertinggi di kelas.
- [ ] Dashboard ortu riwayat anak end-to-end (tautkan anak masih perlu penguatan).
- [ ] Filter laporan rentang waktu.

### F7 — Autentikasi & Peran
- [x] Guru/ortu daftar & login email+password (hash bcrypt).
- [x] Proteksi rute yang memerlukan login.
- [x] Isolasi data kelas antar guru (dasar).
- [ ] Ortu hanya melihat anak terhubung — sebagian; tautkan anak perlu verifikasi produk.

### F8 — Pustaka Materi & User-Driven RAG
- [x] Upload PDF/JPG/PNG/WEBP; status PROCESSING → READY/FAILED.
- [x] Ekstraksi teks + chunk; dipakai saat generate dengan `materialId`.
- [x] Pustaka bersama guru & ortu; dedupe `contentHash`.
- [x] Hanya pengunggah yang boleh hapus dokumen.
- [x] Storage lokal `uploads/` (MVP).

### F9 — Gambar pada Soal
- [x] Auto-crop region dari PDF/gambar materi (Level 2: MuPDF render + deteksi region).
- [x] Pilih gambar terkait di UI draf generate (ranking teks halaman vs prompt).
- [x] Unggah gambar manual per soal saat tinjau draf (`POST /api/figures/upload`).
- [x] Gambar tampil di praktik & tugas siswa (`/api/figures/:id`).
- [ ] Crop manual drag-rectangle di preview halaman.
- [ ] Generate gambar AI otomatis.

## 5. User Stories Utama

- Sebagai **guru**, saya ingin membuat 10 soal matematika kelas 4 tentang "pecahan" dengan tingkat kesulitan sedang dalam waktu kurang dari 2 menit, agar saya dapat langsung menugaskannya sebagai latihan rumah.
- Sebagai **guru**, saya ingin melihat topik mana yang paling banyak dijawab salah oleh kelas saya, agar saya bisa mengulang materi tersebut.
- Sebagai **orang tua**, saya ingin memberi latihan tambahan sesuai kelas anak saya tanpa harus membuat soal sendiri.
- Sebagai **siswa**, saya ingin mengerjakan latihan dengan tampilan yang menyenangkan dan langsung tahu jika jawaban saya benar atau salah.
- Sebagai **siswa**, saya ingin melihat pembahasan ketika saya menjawab salah agar saya mengerti letak kesalahannya.

## 6. Metrik Keberhasilan (Success Metrics)

- **Waktu pembuatan soal**: rata-rata < 3 menit untuk menghasilkan 10 soal siap pakai (dari input hingga disimpan ke bank soal).
- **Tingkat penggunaan bank soal**: jumlah soal tersimpan dan digunakan kembali per guru per bulan.
- **Tingkat penyelesaian latihan siswa**: persentase penugasan latihan yang diselesaikan siswa tepat waktu.
- **Retensi pengguna**: persentase guru/orang tua aktif yang kembali menggunakan aplikasi dalam 30 hari.
- **Kepuasan pengguna**: skor kepuasan (survei sederhana) dari guru dan orang tua terhadap kualitas soal yang dihasilkan.

## 6b. Konten Mata Pelajaran — Topik/Bab per Kelas (Seed Data Awal)

Daftar ini digunakan sebagai data awal (`prisma/seed.ts`) dan sebagai referensi parameter topik pada prompt LLM. Berdasarkan **Kurikulum Merdeka** jenjang SD.

### Matematika

| Kelas | Topik |
|---|---|
| 1 | Bilangan 1–10, Penjumlahan & Pengurangan Dasar, Mengenal Bentuk Bangun Datar, Pengukuran Panjang Sederhana |
| 2 | Bilangan sampai 100, Penjumlahan & Pengurangan 2 Angka, Perkalian Dasar (1–5), Mengenal Waktu (jam) |
| 3 | Bilangan sampai 1.000, Perkalian & Pembagian (1–10), Pecahan Sederhana (½, ⅓, ¼), Keliling Bangun Datar |
| 4 | Bilangan sampai 10.000, Pecahan Biasa & Campuran, Desimal, KPK & FPB, Luas Bangun Datar |
| 5 | Bilangan Bulat Negatif, Pecahan & Operasinya, Persen, Skala & Perbandingan, Volume Kubus & Balok |
| 6 | Operasi Hitung Campuran, Lingkaran (luas & keliling), Statistika Sederhana (rata-rata, modus), Pola Bilangan |

### Bahasa Indonesia

| Kelas | Topik |
|---|---|
| 1 | Mengenal Huruf & Membaca Suku Kata, Kalimat Sederhana, Menulis Nama & Alamat |
| 2 | Membaca Teks Pendek, Kosakata Sehari-hari, Menulis Kalimat Lengkap, Huruf Kapital & Tanda Titik |
| 3 | Teks Narasi Sederhana, Kalimat Tanya & Perintah, Sinonim & Antonim, Paragraf |
| 4 | Teks Deskripsi & Eksposisi, Kalimat Majemuk, Ejaan (EYD/PUEBI), Membaca Pemahaman |
| 5 | Teks Laporan & Persuasi, Pantun, Kata Baku & Tidak Baku, Ide Pokok Paragraf |
| 6 | Pidato & Teks Argumentasi, Majas Sederhana, Surat Resmi, Ringkasan & Parafrase |

### IPAS (Ilmu Pengetahuan Alam dan Sosial)

| Kelas | Topik |
|---|---|
| 1 | Tubuh Manusia (anggota tubuh & fungsinya), Lingkungan Sekitar, Siang & Malam, Cuaca |
| 2 | Hewan & Tumbuhan di Sekitar Kita, Benda Padat/Cair/Gas, Kondisi Lingkungan, Keluarga & Masyarakat |
| 3 | Pertumbuhan Makhluk Hidup, Sumber Daya Alam, Perubahan Cuaca & Musim, Peta Lingkungan Sekitar |
| 4 | Ekosistem & Rantai Makanan, Gaya & Gerak, Perubahan Wujud Benda, Keragaman Suku & Budaya Indonesia |
| 5 | Sistem Organ Manusia, Listrik & Magnet, Perkembangbiakan Makhluk Hidup, Sejarah Kerajaan Nusantara |
| 6 | Tata Surya, Perpindahan Panas, Bioteknologi Sederhana, Proklamasi Kemerdekaan & Kehidupan Berbangsa |

### PPKn

| Kelas | Topik |
|---|---|
| 1 | Aturan di Rumah & Sekolah, Kebersamaan dalam Keberagaman, Simbol Negara (Garuda Pancasila) |
| 2 | Hak & Kewajiban Siswa, Hidup Rukun, Tata Tertib & Disiplin |
| 3 | Makna Pancasila, Keberagaman Budaya, Gotong Royong |
| 4 | Hak & Kewajiban Warga Negara, Persatuan & Kesatuan, Norma dalam Masyarakat |
| 5 | Nilai-nilai Pancasila dalam Kehidupan, Keberagaman Ras & Agama, NKRI |
| 6 | Demokrasi & Pemilu Sederhana, Hak Asasi Manusia, Peran Indonesia di Tingkat ASEAN |

> Catatan: daftar topik ini bersifat representatif, bukan exhaustive. Tim konten dapat menambah/mengubah topik melalui antarmuka admin atau langsung di database tanpa perubahan kode.

## 7. Batasan & Asumsi

- Versi awal berfokus pada mata pelajaran inti SD: **Matematika, Bahasa Indonesia, IPAS (Ilmu Pengetahuan Alam dan Sosial), dan opsional PPKn**.
- Cakupan kelas: **1 sampai 6 SD**.
- Bahasa antarmuka: **Bahasa Indonesia** sebagai bahasa utama.
- Soal yang dihasilkan AI harus ditinjau oleh guru/orang tua sebelum digunakan (tidak otomatis dipublikasikan tanpa peninjauan), untuk menjaga kualitas dan akurasi konten pendidikan.
- Tidak ada ketergantungan pada integrasi khusus dengan sistem sekolah pemerintah pada versi awal.

## 8. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Soal yang dihasilkan AI kurang akurat atau tidak sesuai kurikulum | Selalu ada tahap tinjau & edit manual sebelum soal disimpan/ditugaskan; sediakan template soal terverifikasi sebagai alternatif. |
| Antarmuka terlalu rumit untuk siswa usia dini | Uji kegunaan (usability test) dengan target usia 6–12 tahun; desain sederhana, ikon besar, minim teks panjang. |
| Privasi data anak | Batasi data pribadi siswa yang dikumpulkan; akun siswa dibuat oleh guru/orang tua tanpa data sensitif; enkripsi data saat disimpan. |

## 9. Fase Pengembangan (Roadmap Kualitatif)

1. **Fase 1 — Fondasi**: autentikasi, mapel/kelas/topik, model bank soal. *(sebagian besar selesai)*
2. **Fase 2 — Pembuatan Soal AI**: generate + tinjau/simpan, RAG kurikulum, komposisi jenis & bobot. *(selesai / iterasi)*
3. **Fase 3 — Penugasan & Pengerjaan Siswa**: tugas kelas, login PIN, praktik mandiri, stylus/OCR. *(selesai / iterasi)*
4. **Fase 4 — Materi & Gambar Soal**: pustaka bersama, User-Driven RAG, crop Level 2, upload gambar manual. *(selesai MVP)*
5. **Fase 5 — Laporan & Penyempurnaan**: dashboard analitik kelas/ortu, gamifikasi ringan, ekspor/impor, crop manual UI, hardening.

Rincian teknis: [`TSD.md`](./TSD.md).

## 10. Catatan Selisih vs PRD 0.1

| Item di PRD 0.1 | Status implementasi |
|---|---|
| Upload materi (Nice-to-Have V2) | **Naik ke inti** — sudah ada |
| Multimedia soal (gambar/audio) | **Gambar MVP ada**; audio belum |
| Cloud storage wajib (S3/Blob) | Diganti **storage lokal** di MVP |
| OCR materi via Vision LLM | Materi memakai **Tesseract**; Vision dipakai jalur **tulisan tangan jawaban** |
| Impor/ekspor CSV | Belum |
| Timer kuis | Belum |
| Dashboard laporan lengkap | Belum / sebagian |
| Jenis soal ESSAY + bobot | **Ada** (tidak eksplisit di PRD 0.1) |
| Kode kelas / daftar siswa mandiri | **Ada** |
| Dedup materi lintas user | **Ada** |
