# Testing the Pluggz affiliate link engine

Everything Pluggz earns runs through one route: `pluggzofficial.co.uk/go/<code>`.
A creator publishes that link, a shopper taps it, Pluggz records the click and
bounces them to the brand carrying an attribution reference. This manual walks
you through proving that works, in the order a real link is actually used.

You need no special tools. A browser and about twenty minutes.

**Site:** https://pluggzofficial.co.uk

---

## Before you start: two things that will confuse you if nobody says them

**1. `curl` is treated as a bot, and so is anything with no user agent.**
Bots get redirected but are never counted, and never get a cookie. This is
deliberate — a crawler must not inflate a creator's numbers or their ranking.
So if you test from a terminal and the click count doesn't move, the engine is
working correctly. **Test in a real browser.** The bot filter also catches
anything whose user agent contains `bot`, `crawl`, `spider`, `whatsapp`,
`telegram`, `preview`, `monitor`, `headless`, `wget` or `lighthouse` — which
means link previews in messaging apps don't count either, exactly as they
shouldn't.

**2. Codes are lower case and deliberately never contain `0`, `1`, `l`, `i` or
`o`.** They're meant to be read aloud and typed by hand, so the ambiguous
characters are gone. Lookup is exact — `RPQQ32FH` is not `rpqq32fh`.

---

## Test 1 · A link exists and a creator can copy it

**Who:** a creator.

1. Sign in at `/login`, go to **Storefront**.
2. Every live product lists its link as `/go/<code>` with a **Copy** button.
3. Press Copy. You should see *"Link copied — paste it into your bio, story or
   caption."*, and your clipboard holds the full
   `https://pluggzofficial.co.uk/go/<code>`.

**What this proves:** creators can get their link without asking anyone for it.

---

## Test 2 · The redirect works and carries attribution

**Who:** anyone, signed out, in a normal browser window.

1. Open a product page, e.g.
   `pluggzofficial.co.uk/@ellethompson/power-7-8-gym-leggings`.
2. Click **Buy at Sweaty Betty**.
3. You land on the brand's own product page.
4. **Look at the address bar.** It ends with `?ref=pluggz&pz=<long-token>`.

`ref=pluggz` says the visit came from us. `pz` is the click reference — the
specific click, not the creator and not the product. That is the value a brand
quotes back when they report a sale, and it's what ties the money to the right
creator.

> **Expected:** brand's real page, HTTP 200, both parameters present.
> **Currently verified:** `/@ellethompson/power-7-8-gym-leggings` →
> `sweatybetty.com/shop/bottoms/leggings/power-7-8-gym-leggings-…?ref=pluggz&pz=…`

---

## Test 3 · The click is actually recorded

**Who:** the creator whose link you just clicked.

1. Note the click number on the creator's **Dashboard** first.
2. In a *different* browser (or a private window), do Test 2 again.
3. Reload the creator dashboard.

**Expected:** the count went up by exactly one.

Do it a second time from the same private window and it goes up again — repeat
clicks are all recorded. Pluggz counts clicks, and separately keeps the session
so a later sale can be matched back.

**If the number doesn't move,** you almost certainly clicked from something the
bot filter caught. See the note at the top.

---

## Test 4 · The attribution cookie is set, and lasts as long as the brand agreed

**Who:** anyone, in a browser, with developer tools open.

1. Open DevTools → **Application** (Chrome) or **Storage** (Firefox) → Cookies →
   `pluggzofficial.co.uk`.
2. Click a `/go/` link.
3. A cookie named **`pluggz_attr`** appears.

**Check these:**

| Property | Expected | Why it matters |
|---|---|---|
| `HttpOnly` | ✅ on | Page scripts can't read or forge it |
| `Secure` | ✅ on | Never sent over plain HTTP |
| `SameSite` | `Lax` | Survives the click from Instagram |
| `Expires` | ~30 days out | The brand's agreed attribution window |

The expiry is per brand, not global — it's the `attributionWindowDays` on that
brand's record. Change it in Admin → Brands and a new click gets the new window.

**Then click a second, different creator's link.** The cookie value should
**not** change. The shopper keeps one attribution session across the visit,
which is what lets a sale be traced to the click that started it.

---

## Test 5 · Bots are redirected but never counted

**Who:** anyone. This one is easiest from a terminal.

```bash
curl -s -o /dev/null -D - -A "Googlebot/2.1" https://pluggzofficial.co.uk/go/<code>
```

**Expected:** `HTTP/1.1 302`, a `location:` pointing at the brand, and **no
`Set-Cookie` header at all.** Check the creator's dashboard — the count has not
moved.

**What this proves:** crawler traffic can't inflate a creator's numbers, and
therefore can't inflate what a brand is invoiced.

---

## Test 6 · A dead link doesn't strand the shopper

**Who:** anyone, in a browser.

Visit `pluggzofficial.co.uk/go/zzzzzzzz` — a code that doesn't exist.

**Expected:** you land on the Pluggz homepage. Not a 404, not an error page.

The reasoning: an old post is still a real post from a real creator. The
shopper who tapped it should get somewhere useful rather than a dead end. The
same happens if a creator unpublishes a product — the link stops selling but
never breaks.

To test that second case: as a creator, unpublish a product on **Storefront**,
then visit its `/go/` link. Homepage. Republish it and the same link works
again, **with its click history intact**.

---

## Test 7 · The code survives a change of destination

This is the point of the whole design, and it's what makes it safe to give
creators links before a brand deal is signed.

**Who:** needs database access, so this is one for the dev side. Ask and it can
be demonstrated.

The short code is permanent. The destination is a separate, editable field. When
a brand deal lands and the real affiliate URL arrives, only the destination
changes — every link already printed in a bio, a caption or a story keeps
working and **keeps its accumulated clicks**.

**Expected:** same `/go/<code>`, new landing page, click history unbroken.

---

## Test 8 · What each dashboard should show

Do Tests 2 and 3 a few times across different creators and products, then check
the numbers agree with each other.

| Where | Should show |
|---|---|
| **Creator → Dashboard** | Their own clicks, live products, their ranking |
| **Admin → Analytics** | Platform totals and the top creators by clicks |
| **Brand → Performance** | Shoppers sent to *that brand only*, conversion rate, what they keep |

**The brand dashboard is read-only by design.** A brand contact can see their
own numbers and change nothing — no editable controls anywhere on any of their
three pages. Worth confirming, because it's the first thing a cautious brand
asks about.

Sign in as a brand contact to check. Create one via **Admin → Brands → Invite
contact**; they set their own password by email.

---

## What is *not* wired up yet, and why

Be straight about this when demoing — it's a commercial gap, not a broken
feature.

**Sales don't arrive automatically.** Clicks are tracked end to end and in real
time. A *sale* reaches Pluggz one of two ways: the brand sends a report, or it's
reconciled against a per-creator discount code. There is no live sales feed from
a shop, because that needs either a Shopify/Woo integration built against a real
brand's credentials, or acceptance into an affiliate network. **Awin and Sovrn
have both declined pending traffic volume** — that is an external blocker, not
an outstanding development task.

**So on the dashboards today:** click figures are real and live. Sales,
commission and payouts will read zero or `—` until the first sale is entered.
That is honest, not broken.

**Discount codes.** The per-creator code panel is built and appears the moment a
brand supplies a code. None of the current demo products have one, deliberately
— a made-up code on a real Oliver Bonas listing would fail at their checkout.

**The current catalogue is demo content.** The 22 products are genuine listings
from Oliver Bonas and Sweaty Betty with genuine photography and working links,
but **Pluggz has no commercial agreement with either retailer**, so no
commission actually accrues on those clicks. They exist to demonstrate the
engine. They're all flagged in the database and clear in one query when real
partner brands arrive.

---

## Quick reference

| | |
|---|---|
| Link format | `pluggzofficial.co.uk/go/<code>` |
| Code | 8 characters, lower case, no `0 1 l i o` |
| Redirect | HTTP 302, never cached |
| Added to destination | `?ref=pluggz&pz=<click reference>` |
| Cookie | `pluggz_attr`, HttpOnly, Secure, SameSite=Lax |
| Cookie life | The brand's `attributionWindowDays`, 30 by default |
| Bots | Redirected, never counted, no cookie |
| Unknown or unpublished code | 302 to the Pluggz homepage |
| Stored per click | Time, session, referrer, user agent, **hashed** IP |

**On that last row:** IP addresses are hashed with a server secret before they
are written down. Pluggz can tell two visits apart without being able to
identify who either of them was. Worth saying out loud if anyone asks the GDPR
question.
