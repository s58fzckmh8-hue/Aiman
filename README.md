# Kafe Miaw 🐾

Prototaip game pengurusan kafe kucing 2D, dibina dengan Phaser 3 dan Vite.

## Main pada PC

Perlu Node.js 22.12+ (Node 24 LTS disyorkan). Dalam terminal pada folder projek:

```sh
npm ci
npm run dev
```

Buka alamat yang dipaparkan oleh Vite dalam browser. Laragon, PHP dan pangkalan data tidak diperlukan.

## Cara bermain

- Klik **Buka kafe**. Setiap hari berlangsung selama 60 saat aktif; permainan berhenti sementara apabila tab disembunyikan.
- Klik pelanggan atau **Layan pelanggan** untuk hidangkan kopi sebelum bar sabar habis.
- Klik kucing untuk belai; beri makan untuk menambah kegembiraan. Kucing gembira memberikan bonus tip.
- Beli hiasan untuk menaikkan nilai menu, atau ambil kucing baharu (maksimum empat).
- Kemajuan disimpan secara automatik dalam localStorage browser; **Mula semula** memadam kemajuan selepas pengesahan.

## Semakan dan build

```sh
npm test
npm run build
npm run preview
```

Build pengeluaran berada di `dist/`. Ini prototaip, belum dihantar atau diluluskan oleh CrazyGames. Integrasi SDK, ujian prestasi peranti sasaran dan keperluan penerbitan CrazyGames masih perlu dibuat sebelum penghantaran. Grafik dilukis melalui kod; font Google adalah pilihan dengan fallback sans-serif. Tiada akaun, iklan, pembayaran atau backend.
