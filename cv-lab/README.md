# AFM Private ATS CV Lab

An owner-only companion to the public Al-Faris portfolio. It extracts factual public evidence from `../index.html`, combines it with one private Supabase profile, maps a pasted job description to verified evidence, and exports a strict one-page ATS PDF after a truthfulness confirmation.

## Privacy model

- The public portfolio remains the authoritative source for public facts; `npm run extract` generates `src/generated/public-profile.json` from stable `data-cv-id` attributes.
- Only `career_profiles.profile_data` is persisted. Job descriptions, relevance reports, drafts, and PDFs remain in browser/request memory and disappear on refresh or logout.
- Supabase Auth uses owner email OTP with account creation disabled (`shouldCreateUser: false`). Every protected request verifies claims server-side and compares `sub` with `OWNER_USER_ID`.
- Gemini is called only by the server with `store: false`. Direct identifiers and private URLs are removed before submission. The job description is untrusted data and cannot enable tools or change instructions.
- “Relevance coverage” is deterministic phrase coverage. It is not an ATS score, ranking prediction, interview guarantee, or employment guarantee.

## Local setup

1. Use Node.js 22 and run `npm install` in this directory.
2. Copy `.env.example` to `.env.local` and configure Supabase, Gemini, and the owner UUID.
3. In Supabase, disable new-user signup, create the owner user administratively, and apply the migration in `supabase/migrations`.
4. Seed the owner profile from the Supabase SQL editor (replace the UUID):

   ```sql
   insert into public.career_profiles (user_id, profile_data)
   values ('OWNER-UUID', '{"fullName":"","email":"","phone":"","location":"","links":[],"privateEvidence":[]}'::jsonb);
   ```

5. Add `http://localhost:3000/auth/confirm` and the production callback to Supabase Auth redirect URLs.
6. Run `npm run dev`.

For local visual QA only, start with `NEXT_PUBLIC_CV_LAB_DEMO=true`; this bypass is disabled automatically in production and must never be set on Vercel.

## Vercel

- Create a separate Vercel project with Root Directory `cv-lab`.
- Enable access to files outside the root directory so `prebuild` can read `../index.html`.
- Use Node.js 22 and keep the committed `package-lock.json`.
- Configure public environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Configure server-only variables `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash`, `OWNER_USER_ID`, and `APP_URL`.
- Do not add a Supabase service-role key. Configure Gemini project quotas and alerts in Google AI Studio/Cloud.

The workspace emits `noindex,nofollow`, CSP, frame denial, restrictive browser permissions, request-size checks, and origin checks. Application code does not log profiles, job descriptions, request bodies, or model responses.

## Verification

Run `npm run check` for extraction, TypeScript, unit tests, and the production build. PDF verification additionally renders a sample with Poppler and extracts its text to confirm one-page reading order.
