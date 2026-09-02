# Product Requirements Document (PRD) — SoalPintar SD

| | |
|---|---|
| **Nama Produk** | SoalPintar SD |
| **Versi Dokumen** | 0.1 (Draft) |
| **Status** | Draft untuk ditinjau |
| **Pemilik Produk** | Tim SoalPintar SD |

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
   - Guru/orang tua memasukkan parameter: mata pelajaran, kelas, topik/bab, tingkat kesulitan, jumlah soal, jenis soal (pilihan ganda, isian singkat, benar/salah).
   - Sistem menghasilkan draf soal beserta kunci jawaban dan penjelasan (pembahasan) yang dapat ditinjau/diedit sebelum disimpan.
2. **Bank Soal & Manajemen Konten**
   - Simpan, kategorikan (mapel/kelas/topik/kesulitan), cari, edit, dan hapus soal.
   - Impor/ekspor soal (misalnya dari/ke format CSV atau dokumen).
3. **Manajemen Kelas & Penugasan**
   - Guru membuat kelas/rombongan belajar dan menambahkan siswa.
   - Guru membuat "paket latihan" (kumpulan soal) dan menugaskannya ke kelas/siswa tertentu, dengan tenggat waktu opsional.
4. **Pengerjaan Latihan oleh Siswa**
   - Antarmuka ramah anak untuk mengerjakan soal (satu per satu atau dalam satu halaman), dengan navigasi mudah.
   - Timer opsional untuk latihan bergaya kuis.
5. **Koreksi Otomatis & Umpan Balik**
   - Penilaian otomatis untuk pilihan ganda, benar/salah, dan isian singkat yang cocok dengan pola jawaban.
   - Penjelasan jawaban ditampilkan setelah siswa submit.
6. **Laporan & Progres**
   - Dashboard guru: rekap nilai per siswa, per kelas, per topik (untuk mengidentifikasi topik yang lemah).
   - Dashboard orang tua/siswa: riwayat latihan, skor, dan topik yang perlu diperkuat.
7. **Autentikasi & Peran Pengguna**
   - Pendaftaran/login untuk guru dan orang tua.
   - Akun siswa sederhana (dapat dibuat oleh guru/orang tua, tanpa memerlukan email untuk siswa usia dini).

### 4.2 Fitur Tambahan (Nice-to-Have — Versi Berikutnya)

- Gamifikasi (lencana, papan peringkat kelas, streak harian).
- Rekomendasi latihan adaptif berdasarkan kelemahan siswa (personalisasi berbasis riwayat jawaban).
- Mode latihan offline / cetak PDF soal untuk dikerjakan di kertas.
- Dukungan multimedia pada soal (gambar, audio untuk soal literasi/mendengarkan).
- Integrasi dengan Kurikulum Merdeka secara lebih rinci (capaian pembelajaran per fase).
- Aplikasi mobile (Android/iOS) native.
- Manajemen sekolah multi-guru/multi-kelas dengan admin sekolah.

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

Alih-alih target waktu kalender, pengembangan dibagi menjadi fase berdasarkan kompleksitas dan dependensi:

1. **Fase 1 — Fondasi**: autentikasi, manajemen mata pelajaran/kelas/topik, model data bank soal.
2. **Fase 2 — Pembuatan Soal AI**: integrasi layanan AI untuk generate soal + alur tinjau/edit.
3. **Fase 3 — Penugasan & Pengerjaan Siswa**: alur guru menugaskan latihan, antarmuka siswa mengerjakan soal.
4. **Fase 4 — Koreksi Otomatis & Laporan**: penilaian otomatis, dashboard progres guru/orang tua.
5. **Fase 5 — Penyempurnaan**: gamifikasi ringan, ekspor/impor soal, peningkatan UX berdasarkan umpan balik pengguna.

Rincian teknis setiap fase dijelaskan lebih lanjut pada [`TSD.md`](./TSD.md).
