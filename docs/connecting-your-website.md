# Connecting your website to Pluggz

**Two pathways. Pick the one that matches your shop.** Source text for
Pluggz-Connecting-Your-Website.pdf, built by build-connecting-pdf.py. Keep the
two in step.

The seven Shopify steps are the same ones the platform shows on its credentials
screen, from `SHOPIFY_STEPS` in `src/lib/pixel-snippet.ts`. Do not reword them
here: a brand following a drifted copy is a brand whose sales quietly stop
arriving.

---

**What has to happen.** Pluggz sends a shopper to your website with a reference
on the address. Your site keeps that reference. When the order completes, your
site tells Pluggz the reference, your own order number, and the value. That is
the whole job, and it is the same pattern as Awin or Impact: we tag the visit,
you tell us when it turns into an order. We never need customer data, so please
do not send names, emails, addresses or payment details.

| | Shopify pixel | A site your team built |
|---|---|---|
| Work involved | Paste a snippet and connect it | About an hour |
| Reliability | An ad blocker can stop it | Not affected, and signed |
| Sales arrive as | Unverified, worth reconciling | Verified |

**We recommend the server call wherever a developer is available**, including on
Shopify. The pixel exists so that a shop with nobody to write code is not
excluded.

## What we issue you

A **brand key** that identifies your shop, for example `pz_live_brand_a1b2c3…`,
and a **signing secret** that signs each message. The secret is for the server
pathway only and must never appear in a web page. Both are issued the same day
you ask, and nothing below authenticates until they exist.

---

## Pathway 1 · Shopify

**Nothing to write.** We send you a snippet with your key already inside it.

1. In the Shopify admin, open **Settings**, then **Customer events**.
2. Click **Add custom pixel** and name it **Pluggz Affiliate Tracking**.
3. Under **Customer privacy**, set **Permission** to **Required**.
4. Set **Data sale** to: data collected does not qualify as data sale.
5. Paste the snippet into the code box.
6. Click **Save**.
7. Click **Connect**.

**Step 7 is the one people miss.** Saving a pixel does not switch it on. A shop
can sit for a week wondering why no sales are arriving from a pixel that was
saved but never connected.

The snippet catches the reference when a shopper arrives, keeps it for 30 days,
and reports the order when the checkout completes. There is nothing to add to
your theme and nothing to maintain.

---

## Pathway 2 · A website your own team built

**One change on the way in, one call on the way out.**

### Step 1 · Keep the reference when a shopper arrives

Every shopper we send lands on your own product page with `?ref=pluggz` and
`pz=…` added. The `pz` value identifies that single click. Store it and keep it
for **30 days**, or whatever attribution window we have agreed.

```js
const pz = new URLSearchParams(location.search).get("pz");
if (pz) document.cookie =
  `pluggz_ref=${pz}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;
```

If you already store a click ID for another affiliate network, put ours in the
same place. **Worth checking:** some sites drop the query string when
redirecting to a login or a country selector, which loses the reference. Tell us
if yours does and we will carry it differently.

### Step 2 · Report the order from your server, once it is confirmed and paid

```
POST https://pluggzofficial.co.uk/api/track/sale
X-Pluggz-Key: pz_live_brand_a1b2c3...
X-Pluggz-Signature: <HMAC-SHA256 of the exact body, hex>
{
  "pz": "cmsnwhf8z0001ks24dkvv7dfl",
  "orderRef": "1002948",
  "value": 4499,
  "currency": "GBP",
  "soldAt": "2026-08-11T09:32:04Z"
}
```

| Field | Required | Notes |
|---|---|---|
| `pz` | yes | the reference you stored in step 1 |
| `orderRef` | yes | your own order number, so an order is never counted twice |
| `value` | yes | commissionable value **in pence**, as a whole number. 4499 is £44.99 |

`currency` and `soldAt` are optional: GBP unless agreed, and the time we receive
it unless you send an ISO 8601 date.

Sign the exact bytes you send. This is what stops anyone else claiming sales
against your account.

```js
const signature = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
```

### Replies, retries and refunds

`200` recorded, or already recorded. `401` key or signature wrong. `422` we could
not match that reference to a click, which usually means it is being lost in
step 1, so please still send it. `429` too fast, retry with a short backoff.

**Retries are safe:** the same order number twice is recorded once, so a checkout
that fires twice counts once. **For a refund**, send the same message with status
cancelled and the commission is reversed. A creator is not paid until your
return window has passed.

### Test it, once

Ask us for a test link, open it in an ordinary browser, and check `pz` arrives
and is stored. Place an order for a small amount. Pathway 2 should return `200`
with a `saleId`; pathway 1 reports silently, so tell us when you have placed it.
We confirm it at our end and the integration is signed off. Any questions, we
are at **hello@pluggzofficial.co.uk**.
