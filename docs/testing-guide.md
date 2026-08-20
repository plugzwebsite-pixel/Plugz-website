# Testing Pluggz

For Lisa and Rachel. About twenty minutes, no technical knowledge needed.

Everything below is on the live site, so anything you record is real. Tell us
before you start and we will clear the test data afterwards.

---

## Before you start

Ask us for your own sign in. Do not share one login between you, because the
site records who approved what and two people on one account makes that
meaningless.

You will need a phone as well as a computer. Roughly half of what shoppers do
happens on a phone, and it is the half most likely to look wrong.

---

## 1 · The shopper journey

This is what someone sees when a creator posts a link.

1. Open **pluggzofficial.co.uk** on your phone.
2. Tap into a category from the homepage, then tap any product.
3. On the product page, tap the button that takes you to the brand.

**What should happen:** you land on the brand's own website, on that exact
product. The address will have `ref=pluggz` and a `pz=` reference in it. That
reference is how a sale later gets credited to the right creator.

**Worth checking as you go:** does every product have a picture and a price, do
the creator names read properly, and does anything look broken on a phone.

---

## 2 · Does a sale come back

This is the part that matters commercially, and it needs the brand's side to be
switched on first. We will tell you when a brand is ready.

1. Use a Pluggz link to reach the brand, as in step 1.
2. Buy something on the brand's site, in the same browser.
3. Sign in to Pluggz and open **Record sales**.

**What should happen:** the order appears within a minute, against the creator
whose link you used, with the commission already split.

Sales are marked either **Verified** or **Unverified**. Verified means the
brand's own server reported it and the figure cannot have been altered.
Unverified means a pixel in the shopper's browser reported it, which is easier
to set up but can be blocked by an ad blocker and cannot be proved. Check
unverified sales against the brand's own order list before paying commission.

---

## 3 · The admin side

Sign in and work through these. Each one should take a minute.

| Screen | What to try |
|---|---|
| Approvals | Approve or decline a creator application |
| Brands | Add a brand, then copy what it gives you to send them |
| Products | Add a product by pasting the address of its page |
| Categories | Add a category, put it in the header, then delete it |
| Record sales | Upload a sales report and read the preview before recording |
| Payouts | Look at what is pending, verified and paid |
| Analytics | Check the numbers match what you have just done |

Two things worth knowing. Adding a brand gives you either a tracking script or a
key and a secret, depending on what their shop runs on, and that is what you send
them. Uploading a sales report always shows a preview first, and nothing is
written until you press record.

---

## 4 · If something looks wrong

Send us four things. With them we can usually find it in minutes; without them
we are guessing.

- What you were doing, in one line
- The address in the browser bar at the time
- What you expected, and what happened instead
- A screenshot, and whether it was phone or computer

Please do not describe it as "it doesn't work" on its own. That is true of
several very different faults and they have nothing in common.

---

## What we already know about

So you do not spend time reporting these back to us.

- Some products have no price or picture. Those shops hide both from any
  automatic read, so they have to be filled in by hand.
- Some creator names show as their handle. We are still waiting on the real
  names and follower counts.
- Follower counts are all zero, so that line is hidden rather than showing a nil.
- The creator terms page is placeholder text.
- Payouts are tracked but no money moves yet, since Stripe is not connected.
