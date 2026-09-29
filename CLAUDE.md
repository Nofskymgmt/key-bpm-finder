# Key & BPM Finder

## What this product is
A web app where the user uploads an **MP3 or WAV** file, and the app analyzes it and immediately shows:
- the song's **musical key** (for example, "F minor")
- the song's **tempo in BPM**

The user has also asked for (and approved) **optional accounts with an analysis history**: users sign up with email and password, and every analysis they run while logged in (file name, BPM, key, scale, date) is saved automatically. A History page lists these newest first, and each entry opens its full result. Analyzing still works without an account.

The home page is a landing page with a hero, a "How it works" section and pricing.

**Plans (approved by the user):**
- An account is required to analyze.
- **Free:** 5 analyses per calendar month (UTC), counted from the user's saved History rows, so the count resets on the 1st. The database enforces the limit (`supabase/billing.sql`). After 5, the Analyze page shows a paywall.
- **Pro:** $9/month Stripe subscription, unlimited analyses. Uses Stripe Checkout. A Stripe **webhook** is the only thing that marks a user Pro, never the checkout redirect. "Manage subscription" in the Account menu opens the Stripe customer portal.
- **Stripe is LIVE on Vercel production** (real payments, set up 2026-09-29). Local development (`.env.local`'s `STRIPE_SECRET_KEY` and related values) stays in **test mode**. The live values are kept in `.env.local` as `STRIPE_LIVE_*` and are set in Vercel under the normal names.
  - Never point local development at live keys.
  - Stripe setup lives in `scripts/stripe-setup.mjs`. Use `--live` for the live account.

That is the whole product. **Do not add features beyond it.** That means no playlists, library, sharing, social logins, extra plans, or extra analysis (no energy, danceability, waveform, loudness, and so on). If a feature seems useful, suggest it and wait for approval. Do not build it.

## Stack (keep it simple)
- **Next.js** for the web app.
- **Audio analysis runs in the browser** with **Essentia.js** (or a similar free, client-side library if Essentia.js doesn't work out; explain why before switching).
- **Supabase** for accounts (email and password) and the database. The browser talks to Supabase directly with the public anon key. Row-level security makes sure each user can only read and add their own rows. The table is defined in `supabase/schema.sql`.
- **Only results are stored, never audio.** The audio file never leaves the user's computer.
- **Secret keys** (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are used **only in server code**: `app/api/*` and `app/lib/server.js`.
  - Never give them the `NEXT_PUBLIC_` prefix.
  - Never import them into a `'use client'` file.
  - They go in `.env.local` (never committed) and in Vercel's environment variables.
- **Stripe** for payments. The server routes are `app/api/checkout`, `app/api/portal` and `app/api/stripe/webhook`. Don't add other backend code unless the user asks.
- Deployed to **Vercel** (project `key-bpm-finder`, https://key-bpm-finder.vercel.app), so don't do anything that would block a Vercel deploy. Deploy with `npx vercel deploy --prod`.
- **The source code is public** at https://github.com/Nofskymgmt/key-bpm-finder under **AGPL-3.0**, because the app includes Essentia.js (AGPL-3.0).
  - Keep the footer's "Source code" link (`app/lib/site.js`).
  - Keep `LICENSE`.
  - Before every push, check that no secrets are committed: `.env*` and `.vercel` must stay ignored.
- Add as few dependencies as possible. Explain any new package before installing it.

## How to work: small steps, in this order
1. **Upload button**: the user can pick an MP3 or WAV file, and the page shows the file's name. Other file types get a clear message saying only MP3 and WAV are supported.
2. **File reading**: decode the MP3 or WAV in the browser and show basic info (for example, duration) to prove the audio was read.
3. **BPM detection**: show the tempo.
4. **Key detection**: show the key (for example, "F minor").

Finish and verify one step before starting the next. After every feature, stop and tell the user **exactly how to see it working in their browser**: which command to run, which URL to open, what to click, and what they should see.

## Definition of "done"
Never say something is "done," "working," or "fixed" without including:
- **What you actually tested** (and how), stated plainly, with both an MP3 and a WAV file where relevant. If something wasn't tested, say so.
- **What the user should click to verify it themselves**, step by step.
- **A test song to try** when possible (ideally one whose key and BPM are well known).
- A reminder that they can **compare results against a tool they trust, such as Mixed In Key or Tunebat**.

## When something fails
- **Show the actual error first**: the exact message from the terminal or browser console, copied as-is. Do this before trying any fix.
- Then explain in plain language what you think it means and what you plan to try.
- Don't hide errors, swallow them silently, or retry blindly.

## Communication
- The user is not assumed to be a developer. Use plain language, and explain any command before asking them to run it.
- Give commands in copyable code blocks. This project runs on Windows (PowerShell).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
