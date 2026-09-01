# Pluggz: what runs on its own, and what it costs

For Lisa, Rachel and Ethan. This describes the platform as it stands after the
payments work of September 2026, what happens without anybody doing anything,
what still needs a person, and what arrives on the monthly invoice.

---

## The short version

Money now moves from end to end without anybody remembering to make it happen.

A shopper buys through a creator's link. The brand's shop tells Pluggz. The sale
waits out that brand's returns window. Pluggz invoices the brand. The brand
pays. The creators behind those sales are paid on the 1st and the 15th. What is
left is Pluggz's own share, and Stripe pays that into the company bank account.

Every one of those steps is scheduled or automatic. The only things that need a
person are the ones that genuinely need a decision.

---

## What happens on its own

Three jobs run on the server every night. They are deliberately separated so a
problem with one cannot stop the others.

| Time | Job | What it does |
| --- | --- | --- |
| 02:10 | Clear sales | Releases any sale whose returns window has passed, so it becomes billable |
| 02:25 | Billing | Raises and sends an invoice to any brand that owes enough, and reconciles what Stripe has paid into the company bank |
| 02:40 | Creator payouts | Pays the creators, but only on the 1st and the 15th |

**Billing follows one rule:** a brand has at most one invoice outstanding at a
time, and the next one is raised once that is paid. A brand owing less than ten
pounds is left until it has built up, because an invoice for eighty pence costs
more to process than it collects and is a thing a person at the brand has to
read.

**Payouts run on the 1st and the 15th**, which is the cadence the creator
dashboard has always promised. The job runs every night and decides for itself
whether today counts, so the promise and the schedule cannot drift apart.

**A creator Stripe is not ready to pay is held, not skipped quietly.** The
reason is recorded against them and shown on the payouts screen, and every run
asks Stripe again about anybody not yet ready, because Stripe sometimes
finishes verifying somebody days after they applied.

Stripe also tells the platform the moment a brand pays, so an invoice settles
itself. If that message is ever missed, the nightly job catches it.

---

## What still needs a person

Four things, and all of them are decisions rather than chores.

**Setting a brand's commission rate** when it is onboarded. Everything after
that is worked out from it.

**Deciding what to do about a failed payout.** The platform retries on the next
run and records why it failed. Somebody should look if the same creator fails
twice.

**Recording a payment that arrived outside Stripe.** If a brand pays by bank
transfer instead, an administrator records it with the bank reference on the
Brand invoices screen. That releases the sales exactly as a Stripe payment
would.

**Approving creators and brands.** Deliberately manual, as agreed.

Everything else, including chasing what is owed and paying it out, now happens
without being asked.

---

## Where to look

Two screens answer almost every question.

**Money** shows the whole picture in one place: what has come in from brands and
what has not, what has gone out to creators and what is still owed, and what
Pluggz has earned against what has actually reached the company bank. Each
figure sits beside its unfinished half on purpose, so a brand that has quietly
stopped paying is visible rather than hidden behind a healthy looking total.

**Brand invoices** shows what is ready to be billed, every invoice raised, and
what has happened to each one.

---

## What it costs each month

Three of these are ours to run and are covered by the maintenance fee. Two are
charged on what is actually used, and are passed through at cost.

**Server and hosting.** A Contabo cloud server in Portsmouth, paid annually.
Covered by the maintenance fee.

**Email.** Brevo, on the free tier at present, which allows 300 messages a day.
That is comfortable for verification and password emails at the current number
of creators. If the platform outgrows it, we will say so before it becomes a
problem rather than after.

**Cloudflare.** The proxy, the certificate and the protection in front of the
site are on the free plan and are expected to stay there.

**Cloudflare Stream, for creator video.** Charged by Cloudflare on how much
video is stored and how much of it is watched, so it grows with use rather than
being a flat fee. **As agreed, this is added to the monthly maintenance invoice
and itemised separately at cost.** Nothing is marked up. In the first months it
will be small, because it is charged on minutes and there are few videos.
Video uploads do not work until minutes are bought, so the sooner this starts
the sooner creators can post.

**Stripe.** Charged per payment and per payout rather than as a subscription,
and taken by Stripe out of the transaction rather than invoiced. It does not
appear on the maintenance invoice. Stripe publishes its current UK rates on its
own site.

---

## What is looked after quietly

**Backups.** The database is dumped every night and fourteen days are kept. A
dump is also taken before any change to the database structure, so a release can
be undone rather than argued about.

**Releases.** The site is built on a separate copy of itself and only swapped in
once the build has succeeded, so a failed release cannot take the site down. The
previous version is kept and can be put back in seconds.

**Security.** The server accepts no passwords, only keys. It is behind
Cloudflare, so its real address is not published. Rate limits, forgery checks
and bot filtering are in place and are exercised by the test suite before every
release.

**Bank details.** Pluggz never holds them, for creators or for brands. Both
enter them on Stripe's own pages. That is the whole reason for using Stripe
rather than paying by transfer: a platform that never sees a bank account cannot
leak one.

---

## If something looks wrong

**A creator says they have not been paid.** Open Payouts. Either their sales
have not been settled by the brand yet, which the Money screen will show, or
Stripe is not ready to pay them and the reason is written next to their name.

**A brand says they have not had an invoice.** Open Brand invoices. If they are
not listed as ready to bill, their sales are still inside their returns window.
If an invoice was raised but not sent, the brand has no contact email recorded.

**Nothing has moved for several days.** That is the sign to tell us, and we can
see immediately whether the nightly jobs ran.

---

*Prepared by the development team, September 2026.*
