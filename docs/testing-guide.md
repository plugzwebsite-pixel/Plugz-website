# Testing Pluggz

For Lisa and Rachel. About thirty minutes, no technical knowledge needed.

Everything below is on the live site, so anything you record is real. Tell us
before you start and we will clear the test data afterwards.

---

## Read this first: money is switched on now

Stripe is connected and live. That changes what testing means.

**A real payment can now happen.** If you invoice a brand and it is paid, the
platform will pay that sale's creator on the next 1st or 15th, with real money.
Nothing is a rehearsal any more.

**So there is one rule.** Do not settle an invoice, and do not press the send
button on a payout run, unless you mean it. Everything else on this list is safe
to try, and every screen that can move money says so before it does.

If you want to see the money side working without any money moving, ask us and
we will walk you through it on a copy.

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

**Worth checking as you go:** do the creator names read properly, and does
anything look broken on a phone.

---

## 2 · Does a sale come back

This is the part that matters commercially, and it needs the brand's side to be
switched on first. We will tell you when a brand is ready.

1. Use a Pluggz link to reach the brand, as in step 1.
2. Buy something on the brand's site, in the same browser.
3. Sign in to Pluggz and open **Record sales**.

**What should happen:** the order appears within a minute, against the creator
whose link you used, with the commission already split between that creator and
Pluggz.

Sales are marked either **Verified** or **Unverified**. Verified means the
brand's own server reported it and the figure cannot have been altered.
Unverified means a pixel in the shopper's browser reported it, which is easier
to set up but can be blocked by an ad blocker and cannot be proved. Check
unverified sales against the brand's own order list before paying commission.

---

## 3 · What happens to that sale afterwards

You do not have to do any of this. It is here so you can watch it happen and
recognise it when it does.

A sale moves through four stages, and you can see where each one sits on
**Payouts**.

1. **Pending.** Inside the brand's returns window, so it could still be
   refunded. Nothing is owed to anybody yet.
2. **Verified.** The window has passed. The sale is now billable.
3. **Paid to Pluggz.** The brand has paid its invoice. The creator's share is
   now genuinely ours to pass on.
4. **Paid to creator.** Sent.

Between two and three, the platform raises an invoice on its own, overnight,
for any brand that owes enough. Between three and four, it pays the creators on
the 1st and the 15th. Neither needs anybody to remember.

**Open Brand invoices** to see what has been billed and what has been paid.
**Open Money** to see the whole picture at once: what has come in from brands,
what has gone out to creators, and what Pluggz has earned against what has
actually reached the company bank.

---

## 4 · The creator side of getting paid

Worth doing once, so you know what a creator sees when you tell them to set
themselves up.

1. Sign in as a creator and open **Payouts**.
2. Press **Set up payouts**.

**What should happen:** you are taken to Stripe's own pages, not ours, and asked
for your name, address, date of birth and bank details. When you come back, the
page says whether Stripe will pay you yet, and if not, exactly what it is still
waiting for.

**This is worth understanding.** Those details are entered on Stripe and held by
Stripe. Pluggz never sees them and never stores them. That is the whole reason
for using Stripe rather than paying creators by bank transfer: a platform that
never sees a bank account cannot leak one.

You can stop part way through. Nothing is set up until Stripe says it is.

---

## 5 · The admin side

Sign in and work through these. Each one should take a minute.

| Screen | What to try |
|---|---|
| Approvals | Approve or decline a creator application |
| Brands | Add a brand, then copy what it gives you to send them |
| Products | Add a product by pasting the address of its page |
| Categories | Add a category, put it in the header, then delete it |
| Record sales | Upload a sales report and read the preview before recording |
| Brand invoices | Look at what is ready to bill and what has been paid |
| Payouts | Look at what is pending, verified and paid |
| Money | Check the totals agree with what you have just done |
| Analytics | Check the numbers match what you have just done |

Three things worth knowing.

Adding a brand gives you either a tracking script or a key and a secret,
depending on what their shop runs on, and that is what you send them.

Uploading a sales report always shows a preview first, and nothing is written
until you press record.

On **Brand invoices**, raising an invoice and sending it are separate steps, and
recording a payment is a third. Raising one is safe. Recording a payment is the
one that releases money to creators, so it asks for the bank reference.

---

## 6 · If something looks wrong

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

- **Twenty listings are hidden** because their brands' websites will not give up
  a photograph to any automatic read. They are hidden rather than deleted and
  come straight back the moment we have images. Everything you can see has a
  picture.
- Three products still have no price, for the same reason.
- Four creator names show as their handle, and every follower count is zero, so
  that line is hidden rather than showing a nil. We are still waiting on the
  real names and numbers.
- The creator terms page is placeholder text.
- Creator video is built and connected, but no video can be uploaded until
  Cloudflare Stream minutes are purchased.
