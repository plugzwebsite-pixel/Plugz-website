# Pluggz sales tracking — integration guide

**For the brand's development team.** Everything here is a one-time job; once it
is in place, every order that came from a Pluggz creator reports itself.

Pluggz sends you traffic from UK creators and needs to know which of your orders
came from that traffic. This is the same pattern as Awin, Impact or CJ: we tag
the visit, you tell us when it turns into an order.

Estimated work: **under an hour**, including a test.

---

## What we send you

We will issue you two things when your account is set up:

- a **brand key** — identifies you, e.g. `pz_live_brand_a1b2c3…`
- a **signing secret** — never leaves your server, used to sign each message

Until those are issued, nothing below will authenticate. Ask your Pluggz contact
and we will set them up the same day.

---

## Step 1 · Keep our reference when a shopper arrives

Every shopper Pluggz sends you lands on your own product page with two
parameters added:

```
https://yourbrand.co.uk/products/the-product?ref=pluggz&pz=cmsnwhf8z0001ks24dkvv7dfl
```

`pz` is a unique reference for that single click. **Store it** — a first-party
cookie is the usual way — and keep it for **30 days**, or whatever attribution
window we have agreed with you:

```js
// on any page load
const pz = new URLSearchParams(location.search).get("pz");
if (pz) {
  document.cookie =
    `pluggz_ref=${encodeURIComponent(pz)}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax; Secure`;
}
```

If your platform already stores a click ID for another affiliate network, put
ours in the same place — it is the same job.

**One thing to check:** some sites strip query strings when redirecting to a
login, a currency switcher or a country selector. If that happens on yours, the
reference is lost before it can be stored. Tell us and we will carry it
differently.

---

## Step 2 · Tell us when the order completes

**Server to server, from your backend, when the order is confirmed and paid.**

```
POST https://pluggzofficial.co.uk/api/track/sale
Content-Type: application/json
X-Pluggz-Key: pz_live_brand_a1b2c3...
X-Pluggz-Signature: <HMAC-SHA256 of the exact request body, using your signing secret, hex>
```

```json
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
| `orderRef` | yes | your own order number — we use it to avoid counting an order twice |
| `value` | yes | **commissionable value in pence**, as an integer. `4499` means £44.99 |
| `currency` | no | GBP unless agreed |
| `soldAt` | no | ISO 8601. Defaults to the time we receive it |

**`value` is the commissionable amount** — by default the order total net of
VAT, delivery and any discount, excluding anything we have agreed is not
commissionable. If your figure means something different, tell us once and we
will agree it in writing rather than guess per order.

**Reply:**

```json
{ "ok": true, "saleId": "cmsp4k2x10001…", "status": "pending" }
```

- `200` — recorded, or already recorded (see retries below)
- `401` — key or signature wrong
- `422` — we could not match the `pz` to a click. **Still send it**; it tells us
  something is being lost in step 1
- `429` — you are sending too fast; retry with a short backoff

We do not need any customer data. Do not send names, emails, addresses or
payment details — we have no use for them and will discard them.

### Signing, in one line

```js
const signature = crypto.createHmac("sha256", SIGNING_SECRET).update(rawBody).digest("hex");
```

Sign the exact bytes you send. This is what stops anyone else claiming sales
against your account.

### Retries and refunds

- **Retries are safe.** The same `orderRef` twice is recorded once. If your
  checkout can fire twice, or you retry on a timeout, nothing is double-counted
- **Refunds and cancellations:** send the same message with
  `"status": "cancelled"` and the commission is reversed. A creator is not paid
  until your return window has passed, so in most cases nothing has to be
  clawed back

---

## Alternative · A tracking pixel, if server work is not possible

Add this to your order-confirmation page:

```html
<img src="https://pluggzofficial.co.uk/t/sale.gif?key=pz_live_brand_a1b2c3&order=1002948&value=4499"
     width="1" height="1" alt="" style="display:none">
```

It reads the `pluggz_ref` cookie from step 1 itself.

**We recommend the server call instead.** A pixel is blocked by ad blockers and
some browsers, does not fire if the shopper closes the tab early, and cannot be
signed — so it will under-report, and the numbers you and we see will disagree.
Use it only as a stop-gap.

---

## Step 3 · Test it, once

1. Ask us for a test link. Open it in a normal browser and check the `pz`
   parameter arrives on your product page and is stored
2. Place an order — staging, or a live order for a token amount
3. Confirm you get a `200` with a `saleId`
4. We will confirm at our end that the sale shows against the right creator, and
   with the right value

That is the integration signed off.

---

## What you get out of it

A dashboard on Pluggz showing the traffic and the sales we have sent you, the
commission owed, and your invoices — instead of a monthly reconciliation by
email. And every UK creator on Pluggz can plug your products with a link that
you can account for.

---

## Questions

**Do we need to install anything on our storefront?**
No. One call from your backend, or one image tag. There is nothing to embed on
your product pages.

**Do you set cookies on our site?**
No. The cookie in step 1 is one you set, on your own domain, holding one
reference string. Nothing of ours runs on your site.

**What if a shopper comes back a week later and buys then?**
That is what the 30-day window is for — the reference you stored is still there,
so the sale is still attributed.

**What if the same shopper clicked two different creators' links?**
Send the reference you have stored. Last click wins unless we have agreed
otherwise with you.

**We are on Shopify / WooCommerce.**
Tell us — a Pluggz app is coming that does all of the above with nothing to
write.

Your Pluggz contact: **hello@pluggzofficial.co.uk**
