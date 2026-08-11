# Tracking a sale all the way to the checkout

**The question:** can a Pluggz link follow a shopper from a creator's post to the
moment they actually buy, so the sale appears on the Pluggz dashboard on its
own — without a brand emailing us a spreadsheet?

**The answer:** yes. Most of it is already built and running. The part that is
missing is a single message coming back the other way, from the brand's checkout
to us — and that message can only be sent by the brand's own website.

This document explains what happens today, what has to be added, what we need
from each brand, and how long each route takes.

---

## 1 · What already happens, today, on the live site

Every Pluggz link carries its own reference. This is a real link on the live
site, and this is really what it does:

A shopper taps **`pluggzofficial.co.uk/go/j4vu8d3k`** and, in the same instant:

| | |
|---|---|
| A click is recorded | time, which creator, which product, which link |
| A 30-day attribution cookie is set | `pluggz_attr`, so a later visit still belongs to that creator |
| The shopper is sent to the brand | `auvodka.co.uk/…/au-vodka-cocktail-shaker-set?ref=pluggz&**pz=cmsnwhf8z0001ks24dkvv7dfl**` |

That `pz` value is the important one. It is unique to **that click, by that
shopper, on that creator's link** — not to the creator, not to the product, to
the single click. It is already arriving at every brand's website on every visit
Pluggz sends them, and it has been since the day the site went live.

Everything that happens after a sale is built and waiting:

- a `Sale` record that points back at the exact click that earned it
- commission split at the moment of sale — creator share and Pluggz share, at
  the rates in force that day, snapshotted so a later rate change can never
  rewrite what someone has already earned
- the return window per brand, so a sale moves from Pending to Verified only
  once that brand's refund period has passed
- the payout pipeline — Pending → Verified → Paid to Pluggz → Paid to Creator —
  and the 1st and 15th payout runs
- creator dashboards, admin analytics and brand invoices, all reading from those
  same records

**None of that has ever had a sale to work on.** The engine is built; nothing has
been able to start it automatically.

---

## 2 · The part that has to come from the brand, and why

Once a shopper leaves pluggzofficial.co.uk and lands on the brand's website,
**Pluggz has no code running on that website**. We cannot see their basket, their
checkout or their order confirmation, for the same reason no website can see
inside another one — the browser does not allow it, and no amount of clever link
building changes that.

So the sale has to be reported by the only party that can see it: the brand.

**This is not a Pluggz limitation. It is how every affiliate network on earth
works.** Awin, Impact, CJ, Rakuten, ShareASale — and the storefront platforms
built on top of them, LTK and ShopMy — all do exactly two things:

1. redirect the shopper with a unique click reference attached, and
2. read a message sent back from a piece of tracking the **advertiser installed
   on their own order-confirmation page**.

When Awin tells a publisher they made a sale, that data came from the
advertiser's own website calling Awin. Awin has no other way of knowing. Neither
does anyone else.

**The difference between "a spreadsheet from the brand" and "automatic" is not a
different kind of link. It is a one-time, fifteen-minute job on the brand's
website that then reports every order for ever, with no human involved.**

That is what we are asking a brand for, and it is a normal, expected ask — any
brand that has ever run an affiliate programme has done it before.

---

## 3 · Three ways to get there

Every brand will fall into one of these. All three end in the same place: sales
appearing on Lisa and Rachael's dashboard by themselves.

| | What the brand does | What we build | Best for |
|---|---|---|---|
| **A. Pluggz postback** | Adds a short call to their order-confirmation page, once | 1–2 days | Direct deals — every brand we have today |
| **B. Shopify / WooCommerce app** | Installs our app. No developer needed | 1–2 weeks, plus Shopify's review | Smaller brands with no dev team |
| **C. Their existing network** | Nothing — it is already installed | Integration with the network's API | Brands already on Awin, Impact, CJ |

### A · The Pluggz postback — the one to build first

When an order completes, the brand's server sends us one message: our `pz`
reference, their order number, and the order value. We match the reference to
the click, the click to the creator, and the sale is on the dashboard seconds
later.

It is a handful of lines of code on their side. `docs/brand-integration-guide.md`
is the page to hand to their developer — it has the exact specification.

Server-to-server is the version to push for: it cannot be blocked by an ad
blocker, cannot be faked by a shopper, and does not depend on the browser at all.
A JavaScript pixel is offered as a fallback for brands that cannot do server
work, with the caveat that it will miss some orders.

### B · The Shopify / WooCommerce app

The same postback, packaged so nobody has to write anything: the brand installs
it from the app store, enters nothing, and it reports orders automatically.
For a small brand this is the difference between "we'll ask our developer" and
"done".

This is the right long-term answer for the majority of the catalogue, and it is
also what makes onboarding a brand something Lisa can do without us.

### C · Their existing affiliate network

If a brand already runs a programme on Awin, Impact or CJ, the tracking is
already on their site and we do not need to touch it. We join their programme as
a publisher and pull sales from the network's API.

**The blocker here is commercial, not technical.** Pluggz has applied and has not
yet been accepted as a publisher — the networks want to see traffic volume
first. That is worth pursuing in parallel, but it is not something a developer
can unblock.

### Discount codes — what they are actually for

A per-creator discount code stays in the system as the fallback for a brand that
will not do any of the above. It works, it needs no integration at all, and it
is exactly as reliable as the brand's willingness to send us a monthly report.
It should be the exception, not the plan.

---

## 4 · What we need from a brand, every time

This is the checklist to work through as part of brand onboarding. The
commercial half is already in the platform's brand form; the technical half is
what is new.

**Commercial — decided with Lisa and Rachael**

1. Commission rate Pluggz earns
2. Return / refund window in days — this decides when a creator can be paid
3. Settlement terms — how long after a sale is verified the brand pays us
4. What is commissionable — the order value net of VAT, delivery and returns, or
   something else. It needs saying out loud, because it decides every invoice
5. Currency (GBP unless agreed otherwise)

**Technical — needed once, from their developer**

6. **A technical contact.** A name and an email. This is the single thing that
   most often stalls an integration
7. **Which route** — postback, our app, or their existing network
8. **For a network:** the network name, their advertiser ID, and approval of
   Pluggz as a publisher on their programme
9. **For a postback:** confirmation that they can add a call on their
   order-confirmation page, and that the `pz` parameter on the landing URL
   survives their own redirects (some sites strip query strings on the way to a
   login or a country-switcher — if that happens we adjust how the reference is
   carried)
10. **One test order**, on staging or a live order for a token amount, so we can
    prove the chain end to end before their first real sale

We issue them a brand key and the endpoint. Nothing is exposed to the public and
no brand can see another brand's data.

---

## 5 · What it looks like once it is on

- **Creator:** clicks, conversion rate, sales value, commission earned and where
  each sale sits in the payout pipeline — all updating on their own
- **Lisa and Rachael:** every sale as it happens, which creator earned it, which
  brand owes what, and the Pending → Verified → Paid pipeline moving by itself
- **The brand:** their own dashboard showing the traffic and sales Pluggz sent
  them, and their invoices

No spreadsheets, no reconciliation, no waiting for a brand's month-end.

---

## 6 · The one thing nobody can promise

If a brand installs nothing at all, no affiliate platform in the world can tell
you whether a shopper bought something. Pluggz can tell you they clicked, what
they clicked, and that we delivered them to the brand's product page — that part
is already provable. Whether they then paid is only knowable from the brand.

That is why the integration ask belongs in the brand conversation from the
beginning, alongside the commission rate. A brand that agrees a commission rate
has already agreed to the harder half.

---

## 7 · Where this stands

| | |
|---|---|
| Click tracking, unique reference to the brand, attribution cookie | **Live** |
| Sale records, commission split, return windows, payout pipeline, dashboards | **Built, waiting for an input** |
| Sales arriving by brand report or discount-code reconciliation | **Live** — the admin sales import |
| **The postback endpoint the brand's site calls** | **Not built — 1–2 days** |
| Shopify / WooCommerce app | Not built — 1–2 weeks plus review |
| Network integration | Blocked commercially, not technically |
