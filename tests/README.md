# The release suite

Two hundred and forty odd checks against a running Pluggz, from the shopper's
first click to the money reaching a creator's bank. Run it before a release.

```
sudo -u pluggz node tests/run.js
```

It clears its own data between suites and again at the end, and the last thing
it prints is what was left behind, which should be nothing.

---

## What it needs

It runs **against a running application**, not against a build. Nothing is
mocked: it signs in, presses the same endpoints a person would, and reads the
database afterwards to check what actually happened.

By default it assumes the app is at `/srv/pluggz` and answering on
`http://127.0.0.1:3000`. Override with `PLUGGZ_APP`, `PLUGGZ_ENV` and
`PLUGGZ_BASE` if it is somewhere else.

`psql` must be on the path and able to reach the database in `DATABASE_URL`.

The catalogue import checks read `public/rt-fixture-product.html`, which is
committed and served by the site. It is there rather than being copied in by
the test run because the application reads its public directory once at boot,
so a file dropped in afterwards is not served until the app is reloaded, and
reloading production to run a test is the wrong trade. It is marked noindex and
nothing links to it.

---

## The suites

| File | What it covers |
| --- | --- |
| `01-public.js` | Every public page, the sitemap and robots, and every screen and endpoint an anonymous visitor must not reach |
| `02-admin.js` | All seventeen admin screens, creating a brand, issuing tracking credentials, categories, and the commission floors and ceiling |
| `03-accounts.js` | A brand arriving the way a real brand does, invite to reset to sign in; a creator's dual consent; a shopper signing up |
| `04-features.js` | Discount codes, seasonal return windows, commission overrides, disputes, campaigns, the homepage, bulk imports, enquiries, the waitlist, the wishlist and product views |
| `05-money.js` | Invoicing a brand, Stripe sending it, the brand paying, and the creator being paid, by Stripe and by hand. Ends by running two payouts at once to check a creator is paid only the once |
| `06-automatic.js` | The same chain again with nobody touching anything: the nightly jobs, the webhook, and the books balancing |
| `07-tracking.js` | The tracking engine, signed postbacks, the Shopify pixel, and the things that must not work |

---

## Two of them refuse to run on live keys

`05-money.js` and `06-automatic.js` create Stripe accounts and move money.
Against a live key that would mean real connected accounts and real transfers,
so they check the key first and stop if it is not a test key.

This is not a precaution against something unlikely. It was added after a full
run reached the point of creating a Stripe account on the live platform. Nothing
was created, because the key lacked the permission, but that was luck rather
than design.

To run them, point the deployment at test keys first.

---

## Reading a failure

Each check prints one line saying what was expected in plain words. A failure
prints what actually happened underneath it.

Before believing a failure, check the assertion. Roughly half the failures
during the first full run were the test being wrong rather than the platform:
an endpoint that takes an id in the address rather than the body, a cap that
was working exactly as designed, a figure that changed when the billing rule
was corrected. The platform was right and the test had not been told.

---

## What it deliberately does not do

**It does not clean up other people's data.** Everything it creates is prefixed
`rt`, and `teardown.sql` matches only that. Real creators, real shoppers and
real clicks are never touched, which matters because this runs against the live
database.

**It does not test the hosted Stripe pages.** A creator entering their bank
details happens on Stripe's own site, which is the point of the arrangement.
The suite proves the account is made, the link is issued, and the state comes
back correctly; the form itself is Stripe's to test.
