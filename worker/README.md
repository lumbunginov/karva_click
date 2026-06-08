# karva.click — Cloudflare Worker

Worker ini mem-proxy semua request dari `karva.click` ke `karva.id`, sehingga karva.click menjadi mirror sempurna dari karva.id.

## URL Mapping

| karva.click | karva.id |
|---|---|
| `karva.click/perkap` | `karva.id/page/perkap` |
| `karva.click/app/*` | `karva.id/app/*` (Vue assets) |
| `karva.click/api/*` | `karva.id/api/*` |
| `karva.click/` | redirect → `karva.id` |

## Setup (sekali saja)

### 1. Install wrangler
```bash
cd worker
npm install
```

### 2. Login ke Cloudflare
```bash
npx wrangler login
```

### 3. Isi `wrangler.toml`
Buka Cloudflare dashboard dan isi:
- `account_id` → sidebar kanan bawah di https://dash.cloudflare.com
- `zone_id` → halaman domain karva.click → bagian kanan bawah

### 4. Deploy
```bash
npm run deploy
```

### 5. Verifikasi
Buka `https://karva.click/perkap` — harus identik dengan `https://karva.id/page/perkap`.

## Catatan

- PHP fallback tetap ada di `../index.php` (tidak dihapus)
- Worker berjalan di Cloudflare edge, tidak mempengaruhi server hosting PHP
- Free tier Cloudflare Worker: 100.000 request/hari
