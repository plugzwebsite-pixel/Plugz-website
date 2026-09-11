# Manage products navigation — 11 September 2026

## Scope

- Added a dedicated **Manage products** item to the admin left sidebar.
- Moved the existing product management destination next to the other product and brand controls for easier discovery.
- The page brings product details, creator quote and rating, video upload/removal, website remove/restore, click/view/sales information and product creation together in one destination.
- The existing `/admin/products` URL remains unchanged, so bookmarks and links continue to work.

## Verification

- Focused ESLint passed.
- TypeScript typecheck passed.
- Production build passed. The existing local `Payout.paidBy` database warning and `node:dns` Edge warning are unrelated to this navigation change.
- Live navigation smoke test is required after deployment.
