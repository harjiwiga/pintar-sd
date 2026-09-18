import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECTS_DATA = [
  {
    name: "Matematika",
    topics: [
      { grade: 1, name: "Bilangan 1–10" },
      { grade: 1, name: "Penjumlahan & Pengurangan Dasar" },
      { grade: 1, name: "Mengenal Bentuk Bangun Datar" },
      { grade: 1, name: "Pengukuran Panjang Sederhana" },
      { grade: 2, name: "Bilangan sampai 100" },
      { grade: 2, name: "Penjumlahan & Pengurangan 2 Angka" },
      { grade: 2, name: "Perkalian Dasar (1–5)" },
      { grade: 2, name: "Mengenal Waktu (jam)" },
      { grade: 3, name: "Bilangan sampai 1.000" },
      { grade: 3, name: "Perkalian & Pembagian (1–10)" },
      { grade: 3, name: "Pecahan Sederhana (½, ⅓, ¼)" },
      { grade: 3, name: "Keliling Bangun Datar" },
      { grade: 4, name: "Bilangan sampai 10.000" },
      { grade: 4, name: "Pecahan Biasa & Campuran" },
      { grade: 4, name: "Desimal" },
      { grade: 4, name: "KPK & FPB" },
      { grade: 4, name: "Luas Bangun Datar" },
      { grade: 5, name: "Bilangan Bulat Negatif" },
      { grade: 5, name: "Pecahan & Operasinya" },
      { grade: 5, name: "Persen" },
      { grade: 5, name: "Skala & Perbandingan" },
      { grade: 5, name: "Volume Kubus & Balok" },
      { grade: 6, name: "Operasi Hitung Campuran" },
      { grade: 6, name: "Lingkaran (luas & keliling)" },
      { grade: 6, name: "Statistika Sederhana (rata-rata, modus)" },
      { grade: 6, name: "Pola Bilangan" },
    ],
  },
  {
    name: "Bahasa Indonesia",
    topics: [
      { grade: 1, name: "Mengenal Huruf & Membaca Suku Kata" },
      { grade: 1, name: "Kalimat Sederhana" },
      { grade: 1, name: "Menulis Nama & Alamat" },
      { grade: 2, name: "Membaca Teks Pendek" },
      { grade: 2, name: "Kosakata Sehari-hari" },
      { grade: 2, name: "Menulis Kalimat Lengkap" },
      { grade: 2, name: "Huruf Kapital & Tanda Titik" },
      { grade: 3, name: "Teks Narasi Sederhana" },
      { grade: 3, name: "Kalimat Tanya & Perintah" },
      { grade: 3, name: "Sinonim & Antonim" },
      { grade: 3, name: "Paragraf" },
      { grade: 4, name: "Teks Deskripsi & Eksposisi" },
      { grade: 4, name: "Kalimat Majemuk" },
      { grade: 4, name: "Ejaan (EYD/PUEBI)" },
      { grade: 4, name: "Membaca Pemahaman" },
      { grade: 5, name: "Teks Laporan & Persuasi" },
      { grade: 5, name: "Pantun" },
      { grade: 5, name: "Kata Baku & Tidak Baku" },
      { grade: 5, name: "Ide Pokok Paragraf" },
      { grade: 6, name: "Pidato & Teks Argumentasi" },
      { grade: 6, name: "Majas Sederhana" },
      { grade: 6, name: "Surat Resmi" },
      { grade: 6, name: "Ringkasan & Parafrase" },
    ],
  },
  {
    name: "IPAS",
    topics: [
      { grade: 1, name: "Tubuh Manusia (anggota tubuh & fungsinya)" },
      { grade: 1, name: "Lingkungan Sekitar" },
      { grade: 1, name: "Siang & Malam" },
      { grade: 1, name: "Cuaca" },
      { grade: 2, name: "Hewan & Tumbuhan di Sekitar Kita" },
      { grade: 2, name: "Benda Padat/Cair/Gas" },
      { grade: 2, name: "Kondisi Lingkungan" },
      { grade: 2, name: "Keluarga & Masyarakat" },
      { grade: 3, name: "Pertumbuhan Makhluk Hidup" },
      { grade: 3, name: "Sumber Daya Alam" },
      { grade: 3, name: "Perubahan Cuaca & Musim" },
      { grade: 3, name: "Peta Lingkungan Sekitar" },
      { grade: 4, name: "Ekosistem & Rantai Makanan" },
      { grade: 4, name: "Gaya & Gerak" },
      { grade: 4, name: "Perubahan Wujud Benda" },
      { grade: 4, name: "Keragaman Suku & Budaya Indonesia" },
      { grade: 5, name: "Sistem Organ Manusia" },
      { grade: 5, name: "Listrik & Magnet" },
      { grade: 5, name: "Perkembangbiakan Makhluk Hidup" },
      { grade: 5, name: "Sejarah Kerajaan Nusantara" },
      { grade: 6, name: "Tata Surya" },
      { grade: 6, name: "Perpindahan Panas" },
      { grade: 6, name: "Bioteknologi Sederhana" },
      { grade: 6, name: "Proklamasi Kemerdekaan & Kehidupan Berbangsa" },
    ],
  },
  {
    name: "PPKn",
    topics: [
      { grade: 1, name: "Aturan di Rumah & Sekolah" },
      { grade: 1, name: "Kebersamaan dalam Keberagaman" },
      { grade: 1, name: "Simbol Negara (Garuda Pancasila)" },
      { grade: 2, name: "Hak & Kewajiban Siswa" },
      { grade: 2, name: "Hidup Rukun" },
      { grade: 2, name: "Tata Tertib & Disiplin" },
      { grade: 3, name: "Makna Pancasila" },
      { grade: 3, name: "Keberagaman Budaya" },
      { grade: 3, name: "Gotong Royong" },
      { grade: 4, name: "Hak & Kewajiban Warga Negara" },
      { grade: 4, name: "Persatuan & Kesatuan" },
      { grade: 4, name: "Norma dalam Masyarakat" },
      { grade: 5, name: "Nilai-nilai Pancasila dalam Kehidupan" },
      { grade: 5, name: "Keberagaman Ras & Agama" },
      { grade: 5, name: "NKRI" },
      { grade: 6, name: "Demokrasi & Pemilu Sederhana" },
      { grade: 6, name: "Hak Asasi Manusia" },
      { grade: 6, name: "Peran Indonesia di Tingkat ASEAN" },
    ],
  },
];

async function main() {
  console.log("🌱 Mulai seeding database...");

  for (const subjectData of SUBJECTS_DATA) {
    const subject =
      (await prisma.subject.findFirst({ where: { name: subjectData.name } })) ??
      (await prisma.subject.create({ data: { name: subjectData.name } }));

    console.log(`📚 Subject: ${subject.name}`);

    for (const topicData of subjectData.topics) {
      await prisma.topic.upsert({
        where: {
          // unique constraint: name + grade + subjectId
          name_grade_subjectId: {
            name: topicData.name,
            grade: topicData.grade,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          name: topicData.name,
          grade: topicData.grade,
          subjectId: subject.id,
        },
      });
    }

    console.log(`  ✅ ${subjectData.topics.length} topik di-seed`);
  }

  console.log("✅ Seeding selesai!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
