# Bringing a brand onto Pluggz: the admin's workflow

Everything below is a real screen in the admin area. Sign in at
**pluggzofficial.co.uk/login** and the platform takes you to the admin console.

There are six steps. Only the first three need doing to get a brand live; the
last three are what happens once money starts moving.

---

## 1 · The enquiry arrives

**Where:** Admin → **Brand enquiries**

A brand fills in the form at `pluggzofficial.co.uk/brands`. They get an
automatic acknowledgement; you get the enquiry here.

The form's first question is the one that decides everything after it: **does
the brand already run an affiliate programme?**

- **Yes** → they'll have a network (Awin, Impact, CJ…), a publisher ID and a
  deep-link format.
- **No** → this is a direct deal, and tracking will be a discount code.

You don't have to act on an enquiry here. It is a record of who asked.

---

## 2 · Create the brand

**Where:** Admin → **Brands** → **New**

This is where the commercial terms are set. They apply to every sale that brand
ever makes, so it is worth being deliberate.

| Field | What it decides |
|---|---|
| **Brand name** | What shoppers see on every product card |
| **Product page URL** | Their site |
| **Tracking method** | Discount code, pixel, or a network |
| **Commission rate** | What Pluggz earns from the brand |
| **Return / refund window** | How long before a sale is safe to pay out. 30 days unless the brand says otherwise |
| **Attribution window** | How long after a click a sale still counts. 30 days by default |
| **Settlement terms** | How long the brand has to pay us after a sale is verified |
| **Invoicing / payment details** | Where their invoice goes |
| **Primary contact** | Who you'll invite in step 3 |

If they came in on the network path, you'll also fill in **network / platform**,
**publisher / affiliate ID** and **link / deep-link structure**.

> **On the return window:** this is per brand for a reason. Nadine Merabi's is
> 14 days, most are 30. Set it to what the brand actually agreed. A creator
> gets paid once it passes, so getting it wrong either pays too early or makes
> people wait for no reason.

---

## 3 · Invite the brand's contact

**Where:** Admin → **Brands** → **Invite contact**

Name and email, nothing else. They receive *"Your <brand> dashboard on Pluggz"*,
set their own password, and land on their dashboard.

**You never send anyone a password.** If they lose it they reset it themselves.

**What they can see:** their own performance, their products, their invoices.
Shoppers sent, conversion rate, what they keep, and which creators are driving
their sales.

**What they cannot do:** anything. There is not one editable control on any of
their three pages, and they can only ever see their own brand, and that is checked
against their account in the database, never against anything in the URL.

Brands don't add products either. That is deliberate and it is in the
requirements: creators add products by pasting the brand's own link, and the
title, image and price come across automatically.

---

## 4 · Products and clicks: nothing to do

Creators add the brand's products themselves. Each one gets a permanent Pluggz
link, and every click is recorded from that moment.

You can watch it happen on **Admin → Analytics**: the daily traffic trend, top
creators, and the repeat-visitor rate.

If you want to seed a brand's catalogue rather than wait, use
**Admin → Import creators** for people, and creators can bulk-add from there.

---

## 5 · Record the sales

**Where:** Admin → **Record sales**

This is the step that makes anyone any money, and it is the one that needs a
human, because sales arrive from the brand rather than from us.

Upload the brand's CSV report. Columns are matched by name, so their own export
usually works untouched:

- **Order value**: required. `value`, `amount`, `total` or `order value`
- **Who earned it**: one of: our `pz` reference, the creator's discount code,
  or creator + product
- **Order reference** and **date**: optional

**It previews first, always.** Nothing is written until you press record. Read
the preview: a row matched to the wrong listing pays the wrong creator, and
once a payout has run, unpicking that is a manual job.

Rows it can't match are skipped and listed, so you can see exactly what didn't
land rather than discovering a gap later.

Each recorded sale immediately: splits commission at today's rates, fixes those
rates against the sale so a later change can't rewrite history, and starts its
return-window clock.

---

## 6 · Verify and pay

**Where:** Admin → **Payouts**

Each sale moves through four stages:

**Pending** → **Verified** → **Paid to Pluggz** → **Paid to creator**

- A sale becomes **Verified** once its return window passes, because the refund risk is
  over.
- **Paid to Pluggz** is when the brand settles their invoice.
- **Paid to creator** happens on a payout run: **the 1st and the 15th** of each
  month.

The brand sees what they owe on their own Invoices page, so the conversation is
about the same numbers on both sides.

---

## The two questions people ask

**"Can a brand set their own commission rate?"**
No, and that was decided deliberately. It's marked *Decided out* in the
requirements tracker. Rates, campaigns and creator contact stay with Lisa and
Rachel.

**"What if a brand can't send a report?"**
Then use a discount code. Give the brand a per-creator code, they tell you which
codes were used, and the same import matches on the code instead. It's the
default for smaller brands and needs nothing technical from them.

---

## Quick reference

| To do this | Go here |
|---|---|
| See who's asked to join | Admin → Brand enquiries |
| Set a brand's terms | Admin → Brands → New |
| Give a brand access | Admin → Brands → Invite contact |
| Change the platform-wide rate | Admin → Commission |
| Load a brand's sales | Admin → Record sales |
| See what's owed and pay creators | Admin → Payouts |
| Watch traffic | Admin → Analytics |
