# Admin product controls and Consumer Terms — 11 September 2026

## Scope

- Admin products now have a Manage control for product name, description, price, category, image URL and brand destination URL.
- The creator-specific endorsement quote and rating can be edited from the same control.
- Remove from website is a reversible unpublish operation. It preserves the listing, tracking, views and sales records; Restore returns it to the site.
- Admins can upload or replace a product video directly to Cloudflare Stream and remove it from the website. Admin uploads are recorded as already reviewed. Uploads remain limited to 200MB and three minutes.
- Added `/legal/consumer-terms` using the supplied `Consumer Terms & Conditions.docx`, linked it from shopper signup and the footer, and stamped new shopper acceptances with version `2026-09-11`.
- Existing shopper acceptance records are not rewritten.

## Verification

- Changed-file ESLint: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. The existing local development database warning for `Payout.paidBy` and the existing `node:dns` Edge warning remain unrelated to this release.
- The DOCX text and paragraph structure were extracted with the bundled document runtime. Visual rendering was unavailable because LibreOffice is not installed locally; no DOCX artifact was modified or delivered.

## Deployment notes

- No database migration is required for this release.
- The production server must already have `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_STREAM_TOKEN` for video uploads. The admin UI reports when Stream is unavailable.
- Preserve `/srv/pluggz/.env`, creator uploads under `public/`, PM2 configuration and the previous build during deployment.
- Deployed to `pluggzofficial.co.uk` on 11 September 2026 with production build ID `W4YjwRghHggHX8XBdxXDR`.
- Configured the Cloudflare Stream webhook at `/api/webhooks/stream`; its signing secret is stored only in the production environment.
- Live smoke checks passed: consumer terms and shopper signup returned HTTP 200, the signup terms link was present, unsigned Stream webhooks returned 401, unauthenticated product updates returned 403, authenticated admin Products returned HTTP 200 with the Manage control, and all four PM2 workers were online.
