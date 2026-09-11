# Aditya sign-off fixes — 11 September 2026

This release closes the eight issues raised after review of `1495d88` through
`d496d04`.

## Shopper and money blockers

- Sales imports now use the CSV delimiter to disambiguate three-digit decimal
  amounts. In comma-delimited British exports `12.500` is GBP 12.50; in
  semicolon/tab-delimited European exports `48,500` is GBP 48.50 and `1.234`
  remains GBP 1,234.00. Regression coverage locks all three readings.
- An admin product-address edit is canonicalised and atomically updates every
  tracking link for that product, so existing `/go/` links follow the new
  destination without creating a duplicate master product.
- Connected-account `payout.*` webhook events are explicitly ignored by the
  platform-payout ledger. Multi-secret signature failures now report that no
  configured endpoint secret matched instead of exposing only the final
  verifier error.
- Admin video replacements keep the existing asset live while the new upload
  is sent and processed. The old asset is deleted only after the replacement
  reaches READY; upload and processing failures preserve the original.

## Admin follow-ups

- Product prices use a strict GBP parser. Decimal comma and decimal point are
  supported; text such as `free`, a bare currency symbol, malformed grouping,
  zero, and more than two decimal places are rejected with a field message.
- A product assigned to an inactive category can still be edited. The current
  inactive value is labelled in the selector; changing to another inactive
  value remains blocked, and API field errors are displayed in the dialog.
- Video status polling starts only while that product's management dialog is
  open and stops at READY or FAILED.
- The deploy checklist now requires checking and, when necessary, manually
  re-enabling a Stripe webhook endpoint that Stripe disabled after prolonged
  secret/configuration failure.

## Release verification

- Prisma client generation
- Focused ESLint
- TypeScript typecheck
- Production build
- Sales-format, product-address, inactive-category, safe-video-replacement,
  and connected-payout regression probes
- Post-deploy health, redirect, webhook-signature, and PM2 checks
