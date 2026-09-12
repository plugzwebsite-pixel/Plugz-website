# Final-test follow-ups — 12 September 2026

This release addresses the three non-blocking findings raised after review of
commits `34ec542` and `f600eb8`.

## Money parsing

- Product prices accept ordinary decimal point/comma values and unambiguous
  grouped forms. A value such as `12.500` is rejected instead of being saved as
  GBP 12,500; a dot grouping separator is accepted only when a decimal comma is
  also present, for example `1.234,56`.
- Sales imports treat only semicolon-delimited data as reliably decimal-comma.
  Tab-delimited UK exports preserve comma grouping (`1,234` is GBP 1,234), and
  ambiguous tab values such as `48,50` are flagged in preview rather than
  silently converted.

## Video replacement safety

- Creator and admin replacements both keep the current video live until the new
  Cloudflare asset reaches READY.
- Each pending upload carries its intended moderation state: creator uploads
  return to PENDING review, while admin uploads remain APPROVED.
- Promotion, failure and cancellation use conditional database updates against
  the exact pending UID. Late webhooks and stale browser requests cannot clear,
  promote or delete a newer upload.
- Pending replacements are returned by both admin and creator product queries,
  so an in-flight upload remains visible after a page reload.
- Deleting a creator video removes both the live and pending Cloudflare assets.

## Verification gates

Before production cutover:

1. Generate the Prisma client and apply the additive nullable schema field.
2. Run the parser assertions, changed-file lint, TypeScript check and production
   Next.js build.
3. Deploy only after the isolated production build succeeds.
4. Run the complete HTTP/database regression suite against the live process and
   verify fixture teardown.

The planned real Instagram-to-tracking-to-commission/payout test remains a
separate coordinated business test. It requires the confirmed creator, product
and test order; it must not be simulated against live money without that setup.
