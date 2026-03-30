# REFRAME
**AI-powered image recomposition for every ad and social format.**

Upload a creative. Select your formats. Reframe recomposes it intelligently — preserving headings, logos, and subjects — using Gemini AI.

---

## Stack
- **Next.js 14** App Router
- **Supabase** — auth, database, RLS
- **Gemini** `gemini-3.1-flash-image-preview` — AI recomposition engine
- **Vercel** — deployment
- **hCaptcha** — bot protection on auth

---

## Local Setup

```bash
git clone https://github.com/your-username/reframe
cd reframe
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `GEMINI_DRAFT_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | [hcaptcha.com](https://hcaptcha.com) |
| `HCAPTCHA_SECRET_KEY` | [hcaptcha.com](https://hcaptcha.com) |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |

```bash
npm run dev
```

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Paste and run the contents of `supabase/migrations/001_initial.sql`
4. In **Authentication → Settings**, set your site URL

---

## Fonts

Reframe uses Gotham. Place licensed `.woff2` files in `/public/fonts/`:

```
public/fonts/
├── Gotham-Book.woff2
├── Gotham-Medium.woff2
├── Gotham-Bold.woff2
└── Gotham-Black.woff2
```

Without Gotham, the UI falls back to **Montserrat** (loaded from Google Fonts) — visually close, fully functional.

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all env variables in **Vercel → Project → Settings → Environment Variables**.

**Required Vercel settings:**
- Function max duration: **60s** (image processing)
- Node.js version: **20.x**

---

## How It Works

### Free Tier
- 3 generations per visitor, tracked by browser fingerprint (IP + UA + Accept-Language → SHA-256)
- No signup required
- Uses the `GEMINI_DRAFT_API_KEY` (your key, paid for by you)
- After 3 gens, users are prompted to sign up

### Signed-In / BYOK
- User provides their own Gemini API key
- Key is encrypted with **AES-256-GCM** before storage
- Stored in Supabase, never logged or exposed
- ~$0.07 per run at 1024px, ~$0.10 at higher resolutions

### AI Recomposition
Model: `gemini-3.1-flash-image-preview` (Nano Banana 2)

The system prompt instructs the model to:
1. Analyse the uploaded image (headings, logos, subjects, background)
2. Apply design-principle-based heading placement per format
3. Extend canvas when needed rather than cropping
4. Maintain character and subject quality
5. Output the recomposed image at exact target dimensions

### Security
- **Rate limiting** — 10 requests/min per fingerprint on `/api/generate`, 5/min on `/api/auth`
- **hCaptcha** — on signup and login
- **AES-256-GCM** — API key encryption
- **Generic auth errors** — no user enumeration
- **CSP headers** — set in `next.config.ts`
- **RLS** — Supabase row-level security on all tables
- **Service role** — only used server-side, never exposed to client

---

## File Naming Convention

All outputs follow:
```
[source-name-slug]_[ratio-slug]_[YYYYMMDD].png
```
Example: `nike-banner_9x16_20260330.png`

---

## Formats

| Ratio | Dimensions | Use |
|-------|-----------|-----|
| 1:1 | 1080×1080 | Instagram Feed, Meta Ads |
| 3:4 | 1080×1440 | Pinterest, Print |
| 4:5 | 1080×1350 | Instagram Preferred |
| 9:16 | 1080×1920 | Stories, Reels, TikTok |
| 16:9 | 1920×1080 | YouTube, Display, Hero |
| 3:1 | 1500×500 | LinkedIn, Twitter/X |

---

## Roadmap

- [ ] Brand kit (save logo zones per brand)
- [ ] Batch upload
- [ ] Subscription plan (hosted API key)
- [ ] Figma plugin
- [ ] Team accounts
- [ ] White-label for agencies
