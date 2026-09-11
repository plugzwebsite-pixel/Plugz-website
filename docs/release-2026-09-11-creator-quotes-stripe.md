# Creator quotes and Stripe verification — 11 September 2026

## Product endorsements

- Creator comments/quotes and ratings are visible as their own column in Admin → Manage products.
- Creators can add, edit or clear the comment and rating for each product from Creator → Storefront links.
- Saving refreshes the relevant public storefront and product page.
- Product CSV exports now include the creator quote and rating.

## Stripe

- Production uses a live or restricted-live Stripe key and its signing secret is configured.
- The live webhook endpoint is enabled and successful `invoice.paid` deliveries have settled invoices and released sales.
- The application verifies Stripe signatures against the raw request body, rejects unsigned or altered requests, acknowledges unhandled event types, and keeps invoice settlement and platform payout recording idempotent.
- Stripe environment variables and the requirement for mode-matched webhook secrets are now documented in `.env.example`.
- Account and Connect webhook endpoints can use their separate signing secrets without weakening signature verification.
- A stale test-mode webhook is signing with a different secret and must be disabled or replaced in Stripe test mode; it must not be allowed to mutate the production database.

## Verification

- Focused ESLint passed.
- TypeScript typecheck passed.
- Production build passed. The existing local `Payout.paidBy` database warning and `node:dns` Edge warning remain unrelated to this release.
