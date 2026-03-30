# CLAUDE.md — REFRAME
## Instructions for Claude Code

This file tells you everything you need to know to set up, run, fix, and deploy this project. Read it fully before touching any code.

---

## What This Product Is

**Reframe** is an AI-powered image recomposition tool for marketing teams.

A user uploads one image (an ad, banner, poster, or campaign creative). They select one or more output formats. Reframe uses the Gemini AI API to intelligently recompose the image for each selected format — preserving headings, logos, subjects, and visual hierarchy — and returns high-quality output images ready to download.

**One generation = one image processed across all selected formats.**
The user gets 3 free generations before being asked to sign up.
After signup they provide their own Gemini API key (BYOK) and pay Google directly per run (~$0.07 per format at 1024px).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom CSS variables |
| Auth + DB | Supabase (email/password, RLS) |
| AI Model | `gemini-3.1-flash-image-preview` (Nano Banana 2) |
| Captcha | hCaptcha (free tier) |
| Deploy | Vercel |
| Font | Gotham (local woff2) + Montserrat (Google Fonts fallback) |

---

## Project File Map

```
reframe/
├── CLAUDE.md                              ← you are here
├── README.md                              ← user-facing docs
├── .env.example                           ← copy to .env.local and fill in
├── .gitignore
├── package.json
├── next.config.ts                         ← security headers, sharp config
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql               ← run this in Supabase SQL Editor first
│
└── src/
    ├── middleware.ts                      ← route protection (/dashboard requires auth)
    ├── types/
    │   └── index.ts                       ← Format type, FORMAT_SPECS, all shared interfaces
    ├── styles/
    │   └── globals.css                    ← design system: CSS vars, buttons, inputs, animations
    ├── lib/
    │   ├── supabase.ts                    ← browser client, server client, service role client
    │   ├── security.ts                    ← AES-256-GCM encryption, rate limiter, hCaptcha, sanitise
    │   ├── gemini.ts                      ← Gemini API call + full recomposition system prompt
    │   └── generations.ts                 ← free gen tracker, generation history, Supabase writes
    └── app/
        ├── layout.tsx                     ← root layout, font imports, metadata
        ├── page.tsx                       ← landing page (hero, how it works, pricing)
        ├── generate/
        │   └── page.tsx                   ← MAIN TOOL: upload → formats → generate → results → download
        ├── signup/
        │   └── page.tsx                   ← signup form + hCaptcha
        ├── login/
        │   └── page.tsx                   ← login form + hCaptcha
        ├── dashboard/
        │   └── page.tsx                   ← user dashboard: stats, history, API key, settings
        └── api/
            ├── generate/
            │   └── route.ts               ← POST: main generation endpoint (rate limited, fingerprinted)
            ├── auth/
            │   └── route.ts               ← POST: signup + login with captcha verification
            └── user/
                └── route.ts               ← GET: profile · POST: save encrypted API key
```

---

## Output Formats — Exact Dimensions

These are the 6 formats Reframe supports. Dimensions are exact and must not be changed.

| Format | Slug | Width | Height | Ratio check | Primary use |
|--------|------|-------|--------|-------------|-------------|
| 1:1 | `1x1` | 1080px | 1080px | 1080/1080 = 1.000 | Instagram Feed, Meta Ads |
| 3:4 | `3x4` | 1080px | 1440px | 1080/1440 = 0.750 | Pinterest, Stories, Print |
| 4:3 | `4x3` | 1080px | 810px | 1080/810 = 1.333 | Facebook, Presentations |
| 9:16 | `9x16` | 1080px | 1920px | 1080/1920 = 0.5625 | Stories, Reels, TikTok |
| 16:9 | `16x9` | 1920px | 1080px | 1920/1080 = 1.778 | YouTube, Display, Hero |
| 21:9 | `21x9` | 2520px | 1080px | 2520/1080 = 2.333 | Cinematic, Billboard, OOH |

**Do not change these dimensions.** They are the industry-standard pixel sizes for each ratio.

---

## Generation Counter — Critical Definition

**1 generation = 1 image upload, processed across however many formats the user selects.**

- User uploads image, selects 3 formats → that is **1 generation used**
- User uploads image, selects all 6 formats → that is **1 generation used**
- User uploads a second image → that is **2 generations used**

The free limit is **3 generations** = 3 separate image uploads.
This is tracked in two places:
1. `free_generations` table (fingerprint-based, pre-signup)
2. `profiles.free_gens_used` (account-based, post-signup)

The counter increments **once per `/api/generate` POST call**, not once per format.

---

## How the AI Works

**Model:** `gemini-3.1-flash-image-preview`
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`

The flow per generation:
1. User uploads image → converted to base64
2. For each selected format, one API call is made with:
   - The source image (base64 inline_data)
   - The recomposition system prompt (in `src/lib/gemini.ts`)
   - The target dimensions and format context
3. Gemini returns a recomposed image at the target dimensions
4. All results are returned to the client as base64 data URLs
5. Client renders previews and enables ZIP download

**The system prompt** tells the model to behave as an art director:
- Preserve all headings/text — never crop them
- Place headings in the correct zone for each format
- Extend backgrounds rather than cropping subjects
- Maintain character and subject quality
- Output at exact target dimensions

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in every value.

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase → Settings → API → anon/public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase → Settings → API → service_role key (keep secret)

GEMINI_DRAFT_API_KEY=              # Your Gemini key for the 3 free gens (you pay this)
                                   # Get free at: aistudio.google.com/app/apikey

NEXT_PUBLIC_HCAPTCHA_SITE_KEY=     # hcaptcha.com → Sites → Site Key
HCAPTCHA_SECRET_KEY=               # hcaptcha.com → Sites → Secret Key
                                   # Use 10000000-ffff-ffff-ffff-000000000001 for local dev

ENCRYPTION_KEY=                    # openssl rand -base64 32
NEXTAUTH_SECRET=                   # openssl rand -base64 32

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FREE_GENERATIONS=3
```

---

## First-Time Setup — Step by Step

### 1. Install dependencies
```bash
npm install
```

### 2. Create Supabase project
- Go to [supabase.com](https://supabase.com) → New project
- Copy the Project URL, anon key, and service role key into `.env.local`
- Go to **SQL Editor** → paste the entire contents of `supabase/migrations/001_initial.sql` → Run
- Go to **Authentication → Settings** → set Site URL to `http://localhost:3000`

### 3. Get a Gemini API key
- Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Create a key and paste it as `GEMINI_DRAFT_API_KEY`
- This key is used for the 3 free generations per visitor

### 4. Generate security keys
```bash
openssl rand -base64 32   # paste as ENCRYPTION_KEY
openssl rand -base64 32   # paste as NEXTAUTH_SECRET
```

### 5. Run locally
```bash
npm run dev
# → http://localhost:3000
```

---

## GitHub → Vercel Deploy

### Push to GitHub
```bash
git init
git add .
git commit -m "feat: initial reframe build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reframe.git
git push -u origin main
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

When prompted:
- Link to existing project? **No** → create new
- Framework: **Next.js** (auto-detected)
- Root directory: `.` (default)

### Add environment variables in Vercel
Go to: **Vercel → Project → Settings → Environment Variables**

Add every variable from `.env.example` with production values.
The `NEXT_PUBLIC_APP_URL` should be your Vercel URL: `https://reframe.vercel.app`

### Required Vercel settings
- **Node.js version:** 20.x (Settings → General → Node.js Version)
- **Function max duration:** 60s (for image processing — Settings → Functions)

### Update Supabase for production
- Supabase → Authentication → Settings → Site URL → set to your Vercel URL
- Supabase → Authentication → Settings → Redirect URLs → add `https://your-app.vercel.app/**`

---

## Design System

### Colours (CSS variables in `globals.css`)
```css
--ink:          #0C0C0C   /* primary text, buttons */
--paper:        #F7F6F2   /* page background */
--dim:          #1A1A1A   /* dark surfaces */
--muted:        #6B6B6B   /* secondary text, labels */
--border:       #E2E1DC   /* all borders */
--accent:       #FF4D00   /* CTA, highlights, active states */
--accent-light: #FF6B2B   /* hover state for accent */
--surface:      #FFFFFF   /* card backgrounds */
--surface-2:    #F2F1ED   /* secondary surfaces */
```

### Typography
- **Display/headings:** Gotham Black/Bold → fallback Montserrat 700/900
- **Body/UI:** Gotham Book/Medium → fallback Montserrat 400/500
- Font loaded via `@font-face` in `globals.css` from `/public/fonts/*.woff2`
- Google Fonts Montserrat loaded as fallback (no layout shift)

### Gotham font files
Place licensed `.woff2` files in `/public/fonts/`:
```
public/fonts/Gotham-Book.woff2
public/fonts/Gotham-Medium.woff2
public/fonts/Gotham-Bold.woff2
public/fonts/Gotham-Black.woff2
```
Without these files, Montserrat is used automatically — visually close, fully functional.

### CSS utility classes
Defined in `src/styles/globals.css`:
- `.btn`, `.btn-primary`, `.btn-accent`, `.btn-ghost`, `.btn-lg`, `.btn-sm`
- `.input`, `.input-error`, `.error-text`
- `.card`
- `.upload-zone`, `.upload-zone.active`
- `.format-pill`, `.format-pill.selected`
- `.label` (uppercase tracking label)
- `.display` (large display heading)
- `.free-badge` (orange free tier pill)
- `.shimmer` (loading skeleton animation)
- `.dot-loader` (three-dot animated loader)

---

## Security Model

| Threat | Defence |
|--------|---------|
| Brute force auth | Rate limit: 5 auth attempts/min per fingerprint |
| API abuse | Rate limit: 10 generate requests/min per fingerprint |
| Bot signups | hCaptcha on signup + login |
| User enumeration | Generic "Invalid email or password" on login fail |
| API key theft | AES-256-GCM encryption before DB storage, key never logged |
| XSS | CSP headers in `next.config.ts` |
| Clickjacking | `X-Frame-Options: DENY` header |
| Unauthorised DB access | Supabase RLS on all tables, service role only server-side |
| Free tier abuse | SHA-256 fingerprint (IP + UA + Accept-Language), not just IP |

---

## Supabase Schema

### `profiles`
Auto-created on signup via trigger. Stores per-user state.
```sql
id              uuid  PK → auth.users(id)
email           text
free_gens_used  int   default 0
has_api_key     bool  default false
api_key_enc     text  (AES-256-GCM encrypted)
total_generations int default 0
created_at      timestamptz
updated_at      timestamptz
```

### `generations`
One row per generation run (one image upload = one row, regardless of formats selected).
```sql
id          uuid  PK
user_id     uuid  → profiles(id) nullable (pre-auth gens have null)
session_id  text  (fingerprint)
formats     text[] (e.g. ['1:1', '9:16', '16:9'])
source_hash text  (SHA-256 of input image, first 16 chars)
status      text  ('done' | 'failed')
created_at  timestamptz
```

### `free_generations`
Fingerprint-based tracker for pre-auth free limit.
```sql
fingerprint text  PK
count       int
created_at  timestamptz
updated_at  timestamptz
```

### RPC Functions
- `handle_new_user()` — trigger: auto-creates profile on auth.users insert
- `increment_free_gens(user_id)` — increments `free_gens_used` + `total_generations`
- `increment_total_gens(user_id)` — increments `total_generations` only

---

## Key Behaviours to Know

### Free generation flow (no account)
1. User visits `/generate`
2. Uploads image, selects formats, clicks Generate
3. `/api/generate` checks fingerprint against `free_generations` table
4. If count < 3: uses `GEMINI_DRAFT_API_KEY`, increments counter, returns results
5. If count >= 3: returns 402 error → UI shows "Sign up to continue" prompt
6. After 3rd generation, UI shows the upsell banner

### Signed-in BYOK flow
1. User signs up, goes to Dashboard → Settings, adds Gemini API key
2. Key is encrypted and stored in `profiles.api_key_enc`
3. On `/generate`, user sees optional "Add API key" field — or key is pulled from profile
4. `/api/generate` uses the user's own key, increments `total_generations` only

### Generation counter (correct implementation)
```
POST /api/generate is called ONCE per image upload
Counter increments ONCE regardless of how many formats were selected
3 calls to /api/generate = 3 generations used
```

---

## Common Issues + Fixes

**`sharp` not found on Vercel**
→ Check `next.config.ts` has `serverExternalPackages: ['sharp']`
→ Vercel Node 20.x must be set

**Supabase auth redirect loops**
→ Check Site URL and Redirect URLs in Supabase Auth settings
→ Make sure `NEXT_PUBLIC_SUPABASE_URL` matches exactly

**hCaptcha not rendering**
→ In development, the site key `10000000-ffff-ffff-ffff-000000000001` is the official test key
→ In production, use your real keys from hcaptcha.com

**Gemini returns no image**
→ The model string must be exactly `gemini-3.1-flash-image-preview`
→ `response_modalities` must include `"IMAGE"`
→ Check API key is valid and has image generation access

**`ENCRYPTION_KEY` must be base64 of 32 bytes**
→ Run `openssl rand -base64 32` — do not shorten it

**Format dimensions showing wrong**
→ All specs live in `src/types/index.ts` → `FORMAT_SPECS`
→ Do not hardcode dimensions anywhere else — always import from there

---

## What to Build Next (Roadmap)

After the MVP is live, these are the next logical additions in priority order:

1. **Subscription plan** — host the API key yourself, charge users per month via Stripe
2. **Brand kit** — user saves their logo position and brand colours, applied to every generation
3. **Batch upload** — multiple images in one session
4. **Generation history with previews** — store output images in Supabase Storage, show thumbnails in dashboard
5. **White-label** — agency mode, custom domain, client access
6. **Figma plugin** — export directly from Figma frames
7. **21:9 background extension logic** — ultrawide needs special handling, flag in Gemini prompt

---

## Contact / Ownership

Project: **Reframe**
Repo: `github.com/kri4tiv/reframe` (update if repo name changes)
Deploy target: `reframe.vercel.app`
