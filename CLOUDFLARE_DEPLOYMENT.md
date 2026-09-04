# 🚀 Cloudflare Deployment Guide for FreshLane Produce Market

This repository is pre-configured for instant deployment on **Cloudflare Pages** or **Cloudflare Workers**.

---

## 📁 Files Created for Cloudflare

| File | Purpose |
|------|---------|
| `wrangler.toml` | Wrangler configuration file for Cloudflare Workers & Pages. Configures static assets (`dist`), node compatibility, and environment variables. |
| `worker.ts` | Complete Cloudflare Edge Worker handling `/api/*` routes (15 km Tadepalligudem range check, Razorpay order creation, Web Crypto HMAC-SHA256 signature verification, driver telematics, and static assets). |
| `functions/api/[[route]].ts` | Cloudflare Pages Functions adapter that routes all `/api/*` calls through the edge worker on Cloudflare Pages. |
| `public/_redirects` | Single Page Application (SPA) routing fallback (`/* /index.html 200`) so refreshing on sub-paths doesn't 404. |
| `public/_routes.json` | Cloudflare Pages routing optimizer ensuring only `/api/*` invokes serverless functions, keeping asset delivery ultra-fast from Cloudflare CDN edge. |
| `public/_headers` | Security and immutable asset caching headers for Cloudflare edge servers. |

---

## 🔑 Required Environment Variables & Secrets

Configure these in the Cloudflare Dashboard under **Settings → Variables & Secrets**, or via the Wrangler CLI:

| Variable Name | Description | Example / Recommended |
|---|---|---|
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID | `rzp_live_...` or `rzp_test_TXoUBcTgIq9Wfa` |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret | `FHUDLFkILqXAGuSNoARdn76o` *(Set as Secret)* |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini AI API key | `AIzaSy...` *(Set as Secret)* |

---

## 🛠️ Deployment Methods

### Option 1: Cloudflare Pages (Recommended - Git or CLI)

#### Method 1A: Connect with GitHub / GitLab
1. Push this repository to your GitHub account.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your repository.
4. Set Build configuration:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Under **Environment variables**, add:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `GEMINI_API_KEY` (optional)
6. Click **Save and Deploy**. Cloudflare automatically mounts `functions/api/[[route]].ts` for backend APIs!

#### Method 1B: Deploy via Wrangler CLI
```bash
# 1. Install dependencies
npm install

# 2. Build the production client
npm run build

# 3. Deploy dist/ directly to Cloudflare Pages
npx wrangler pages deploy dist --project-name freshlane-produce
```

---

### Option 2: Cloudflare Workers (Single-Command Deploy)

With modern Wrangler asset serving, you can deploy the full-stack worker and frontend together:

```bash
# 1. Build Vite frontend
npm run build

# 2. Set your production secrets in Cloudflare
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put GEMINI_API_KEY

# 3. Deploy to Cloudflare Workers
npx wrangler deploy
```

---

## 🧪 Verifying Your Deployment

After deploying, your Cloudflare URL will be live (e.g. `https://freshlane-produce.pages.dev` or `https://freshlane-produce.workers.dev`). You can test:

1. **Health Check**:
   ```bash
   curl https://<your-domain>/api/health
   ```
   Should return `{"status":"ok","runtime":"Cloudflare Edge Worker","hub":"Tadepalligudem Hub","deliveryRadiusKm":15...}`

2. **15 km Range Check**:
   ```bash
   # In-range test:
   curl -X POST https://<your-domain>/api/delivery/check-range \
     -H "Content-Type: application/json" \
     -d '{"address": "KN Road, Tadepalligudem 534102"}'

   # Out-of-range test:
   curl -X POST https://<your-domain>/api/delivery/check-range \
     -H "Content-Type: application/json" \
     -d '{"address": "Tanuku, West Godavari"}'
   ```

3. **Live Razorpay Order Creation**:
   ```bash
   curl -X POST https://<your-domain>/api/create-order \
     -H "Content-Type: application/json" \
     -d '{"amount": 15000, "address": "KN Road, Tadepalligudem 534102"}'
   ```
