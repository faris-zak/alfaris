# Defensive security audit — 2026-11-20

Scope: this repository and locally reachable Git history only. No external requests,
production operations, credential changes, dependency downloads, or deployments.
Starting commit: `7bb03a4`. Existing worktree was clean.

## Architecture

- Root: static HTML/CSS/JavaScript portfolio, installable manifest, service worker, printable CV.
- Contact form posts directly to Web3Forms; no repository-owned contact endpoint.
- External assets: Anime.js from cdnjs; Three.js, TopoJSON and world-atlas from jsDelivr; Google Fonts.
- `cv-lab`: Next.js 16 / React 19 / TypeScript / Zod; PDF generation runs in the browser.
- Supabase email-link authentication uses cookie sessions and a server-side owner UUID check.
- `/api/profile` reads/updates the owner's profile; SQL RLS also restricts row ownership.
- `/api/tailor` sends selected, redacted evidence to Gemini server-side; jobs and drafts are not stored in the database.

## Findings reported before edits

Locations below refer to the original source, except S9, discovered during build verification.
No Critical or High findings. Four Medium and five Low findings; seven resolved in
repository code, one partially resolved, one requires trusted external artifacts.

| ID | Severity | File:line | Status and issue | Exploit scenario | Fix / disposition |
|---|---|---|---|---|---|
| S1 | Medium | service-worker.js:54–76 | Confirmed broad same-origin cache | If private routes share the origin, private responses could persist/replay after logout; any navigation overwrote the public fallback | Fixed: public URL allowlist, reject private/no-store/redirected responses, scope cache lookup/deletion, rotate cache version |
| S2 | Medium | cv-lab/src/app/api/tailor/route.ts:17–19; api/profile/route.ts:22 | Confirmed absent/bypassable size limits and uncaught JSON syntax errors | Authenticated callers could omit Content-Length and trigger excess buffering or malformed-input 500s | Fixed: bounded stream reader, 400/413/415 responses; 80 KB tailoring and 512 KB profile limits |
| S3 | Medium | cv-lab/src/lib/supabase/client.ts:7; server.ts:9; proxy.ts:9 | Confirmed Secure absent from cookie options and installed SSR defaults | HTTP requests could carry session cookies unless deployment policy prevents them | Fixed: shared production Secure, SameSite=Lax and path options |
| S4 | Low | cv-lab/next.config.ts:13 | Confirmed production script unsafe-inline | Would weaken containment of a separate HTML injection; no such injection found | Fixed: request-specific nonce CSP, object-src none and private/no-store responses |
| S5 | Medium | index.html:71; script.js:103,111 | Confirmed external executable scripts without integrity verification | Upstream compromise could execute code in portfolio origin | Open: acquire verified local bundles or verified integrity metadata; dynamic imports need an appropriate bundling/integrity strategy |
| S6 | Low | cv-lab/supabase/config.toml:176,221 | Confirmed local signup enabled contrary to owner-only setup | Direct Auth calls bypass UI no-signup option; owner workspace access remains denied | Fixed locally: disable signup. Hosted setting unknown |
| S7 | Low | cv-lab/.gitignore:3–4 | Confirmed incomplete environment ignore coverage | Future accidental credential commits | Fixed: root environment ignore rules with template exceptions |
| S8 | Low | index.html:1; cv-lab/next.config.ts:3 | Confirmed missing repository root header policy / explicit app HSTS; deployed absence Suspected | Deployment-dependent framing, MIME confusion, transport downgrade defense gaps | Partial: app production HSTS added. Root hosting policy requires deployment-specific configuration |
| S9 | Low | cv-lab/proxy.ts:1 | Confirmed proxy absent from build registration | Intended session refresh does not run; nonce policy would not run there either. Route authorization is independent | Fixed: move proxy beside src/app; build and local responses confirm registration |

## Other reviewed controls and limitations

- XSS: no attacker-controlled HTML sink identified. React renders user/model values as
  text. The static CV uses `document.write`, but interpolated text is HTML-escaped;
  its links originate in repository-owned markup. No URL-parameter-to-HTML flow found.
- Injection: Zod limits input fields, Supabase query builders use owner filters,
  and no runtime shell execution or interpolated SQL endpoint was found.
  Gemini has no enabled tools and output schema/evidence checks. This does not prove
  all generated prose is truthful; human review remains necessary.
- Access control: protected routes check owner claims server-side. RLS SELECT and
  UPDATE use `auth.uid() = user_id`, with UPDATE WITH CHECK; application roles lack
  INSERT/DELETE privileges. SQL tests were reviewed, not executed against a database.
- Sessions: application localStorage contains UI preferences/disclosure state, not
  explicit tokens. Supabase SSR cookies are intentionally JavaScript-readable for
  browser refresh; forcing HttpOnly requires a different auth architecture.
  JWT verification does not guarantee immediate revocation of an already issued token.
- CSRF/CORS: write routes reject missing/foreign Origin and require JSON after this
  fix. No permissive application CORS headers were found. Set APP_URL to the exact
  deployed origin; local Next request URL normalization can differ from the Host used
  by a test client. Hosted Supabase CORS/auth configuration was not queried.
- Contact form: browser validation exists, but provider-side validation, spam
  protection and rate limits cannot be established from these files. The public
  Web3Forms access identifier is not a server credential. Adding client validation
  alone would not enforce a security boundary.
- Rate limits: no application-level limiter wraps the owner-only Gemini endpoint.
  Provider quotas are documented but not verified. A distributed limit requires a
  storage/deployment decision; an in-memory counter would not provide a reliable
  global limit on multiple server instances.
- Errors: Gemini errors are generic; new malformed JSON responses do not leak parser
  details. No production stack-trace response was demonstrated. Login displays
  provider error messages; provider behavior was not contacted or assessed.
- Secrets: pattern scan covered 91 unique historical text blobs across 36 commits
  reachable from local refs. Matches were `test-key` fixtures and environment-variable
  references, not confirmed credentials. Only `.env.example` was tracked. This was
  not a forensic scan of unreachable objects, remote refs, binary attachments or
  arbitrary obfuscated secrets. No key rotation is indicated by this evidence.
- Privacy redaction is heuristic, not a guarantee that arbitrary free text contains
  no personal information. Avoid putting sensitive identifiers into job/evidence text.

## Verification

- Existing extraction, TypeScript, unit tests and optimized production build passed.
- 37 tests pass (18 added), covering byte limits, missing/false Content-Length,
  chunked cancellation, malformed JSON, content type, API owner/origin rejection,
  cache exclusions, cache retirement, production cookies and CSP.
- Build now explicitly lists `Proxy (Middleware)`.
- Loopback-only production HTTP checks: login 200; all 10 script tags carry the CSP
  nonce; two requests have different nonces; no-store and HSTS are present;
  unauthenticated profile GET/tailor POST return 401; foreign-origin profile PUT returns 403.
- `node --check` passed for both root JavaScript files; `git diff --check` passed.
- `npm audit --offline --ignore-scripts --json` ran before and after fixes and reported
  zero advisories across 226 dependencies. **No fresh advisory lookup occurred; this
  is not evidence that dependencies have no known vulnerabilities.** No versions changed.
- Node verification used `scripts/offline-guard.cjs` and disabled Next telemetry.
  Existing Gemini tests use stub responses; no live Auth, Gemini, Web3Forms or database
  traffic was generated. The local test server was stopped afterward.
- Build refreshed generated public evidence; that unrelated generated-file change
  was restored to its starting contents. No portfolio content/design changes retained.

## Manual actions required

1. Obtain trusted local copies of third-party JavaScript (including module dependencies)
   or verified integrity metadata. Review licenses, pin versions, then test the animations
   and globe. No hashes were invented and no assets were downloaded here.
2. At the public portfolio host, configure CSP for its actual scripts/fonts/form action,
   HSTS on HTTPS, X-Frame-Options DENY, X-Content-Type-Options nosniff, a restrictive
   Referrer-Policy and Permissions-Policy. Verify deployed responses separately.
   Use hashes/nonces for existing inline scripts; do not deploy an untested blanket CSP.
3. Verify hosted Supabase signup is disabled, migration/RLS is deployed, only the owner
   profile exists, and callback URLs/rate limits match the intended environment.
   The committed config change does not alter the hosted service.
4. Verify Gemini project quotas/budget alerts and Web3Forms spam/domain restrictions.
   Decide whether an application-level distributed per-owner rate limit is needed.
5. When external access is authorized, run a fresh registry-backed dependency audit
   and evaluate any advisories before upgrading. Also run SQL tests against an isolated
   disposable database and a real login/refresh/logout flow in staging.
6. Deploy the fixes through the normal workflow; existing service workers/cookies only
   adopt changes after update/refresh. Keep the CV app on its documented separate origin.

## Ongoing practices

- Run tests, secret scanning and a fresh dependency advisory check in CI.
- Review dependency updates and external script integrity regularly.
- Verify security headers and authorization after deployment changes.
- Keep secrets in environment management; never force-add ignored environment files.

## Separate fix commits

| ID | Commit |
|---|---|
| S1 | b30a54a |
| S2 | 9b495ef |
| S3 | 98c0379 |
| S4 | 161ec83 |
| S6 | ac3045c |
| S7 | 90e222d |
| S8 (app portion) | 8f6f01c |
| S9 | 04d5fd1 |

Inspect any individual change with `git show <commit>`.
