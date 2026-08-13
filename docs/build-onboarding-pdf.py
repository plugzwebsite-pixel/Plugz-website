"""Render the brand-onboarding pack.

Two documents in one file, because they travel together and get sent the same
day: the first half is for whoever on the Pluggz side is onboarding the brand,
the second is handed to the brand's own developer. Splitting them across two
attachments only invites one of them going missing.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

from pdf_style import S, PINK, rule, bullets, panel, datatable, header_footer

DATE = "13 August 2026"
OUT = "Pluggz-Brand-Onboarding-Pack.pdf"

story = []
A = story.append


def h2(text):
    A(Spacer(1, 7 * mm))
    A(Paragraph(text, S["h2"]))


def h3(text):
    A(Spacer(1, 3 * mm))
    A(Paragraph(text, S["h3"]))


def p(text, style="body"):
    A(Paragraph(text, S[style]))


def gap(n=3):
    A(Spacer(1, n * mm))


# ─────────────────────────────── part one ────────────────────────────────────

A(Paragraph("Onboarding a brand", S["title"]))
A(Paragraph(
    "Everything needed to take a brand from “yes” to a tracked sale on the "
    "dashboard. Part one is for the Pluggz side; part two is for the brand.",
    S["sub"]))
story.extend(rule())

p("There are five steps and only three of them need a person. Allow twenty "
  "minutes on our side, and about ten minutes of the brand's developer's time.")

gap()
A(panel([
    Paragraph("<b>Before you start, agree these with the brand in writing</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "Commission rate · return window · settlement terms · who receives the "
        "invoice. They are set once at onboarding and apply to every sale that "
        "brand ever makes, so it is worth being exact rather than adjusting later.",
        S["muted"]),
]))

h2("1 · Create the brand")
p("<b>Admin → Brands → New.</b>")
gap(2)
A(datatable([
    ["Field", "What it decides"],
    ["Brand name", "What shoppers see on every product card"],
    ["Website", "Their shop. Used to match products pasted by creators"],
    ["Affiliate programme?", "The first question. It decides everything after it"],
    ["Commission rate", "What the brand pays Pluggz on each sale"],
    ["Return window", "How long before a sale is safe to pay out"],
    ["Attribution window", "How long after a click a sale still counts"],
    ["Settlement terms", "How long they have to pay us once verified"],
    ["Primary contact", "Who gets the dashboard invite in step 3"],
], widths=[42 * mm, 118 * mm]))

gap(2)
p("You can type these naturally — “12%”, “21 days”, “30 days after verified” "
  "are all read correctly.", "muted")

gap(3)
A(panel([
    Paragraph("<b>The return window is per brand, and it matters</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "A creator is paid once it passes. Set it to what was actually agreed — "
        "too short pays out before the refund risk is over, too long makes "
        "people wait for nothing. Thirty days unless the brand says otherwise.",
        S["muted"]),
]))

h2("2 · Issue their tracking keys")
p("<b>Admin → Brands → Tracking keys.</b>")
gap(2)
p("This produces two values: a <b>key</b> that identifies the brand and a "
  "<b>signing secret</b> that proves a sale report really came from them.")
gap(2)
A(panel([
    Paragraph("<b>The secret is shown once and cannot be retrieved</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "Copy both before leaving the screen. If the secret is lost, issue a new "
        "pair — which also stops the old one working, and is how a leaked secret "
        "is dealt with. Send them to the brand the same way you would a "
        "password: a one-time link, never WhatsApp or plain email.",
        S["muted"]),
], border=PINK))

h2("3 · Invite the brand's contact")
p("<b>Admin → Brands → Invite contact.</b> Name and email, nothing else.")
gap(2)
p("They receive an email, set their own password, and land on their dashboard. "
  "<b>You never send anyone a password.</b>")
gap(2)
p("They see their own clicks, sales, conversion rate and what they owe — and "
  "nothing else. There is not one editable control on any of their pages, and "
  "a brand can only ever see its own figures.", "muted")

h2("4 · Products go on by themselves")
p("Creators add the brand's products by pasting a product link. The title, "
  "image and price come across automatically, and each listing gets its own "
  "permanent Pluggz link. Nothing for you to do.")

h2("5 · Sales arrive on their own, once step 2 is wired up")
p("When the brand's site confirms an order it tells Pluggz, and the sale "
  "appears with commission already calculated. Part two of this document is "
  "what their developer needs.")
gap(2)
p("<b>If a brand cannot do the technical step</b>, use <b>Admin → Record "
  "sales</b> to load their CSV report instead, or reconcile a per-creator "
  "discount code. Both feed the same engine. It is the fallback, not the plan.",
  "muted")

h2("What happens to a sale after that")
gap(2)
A(datatable([
    ["Stage", "What it means"],
    ["Pending", "Recorded. The brand's return window is running"],
    ["Verified", "The window passed. The refund risk is over"],
    ["Paid to Pluggz", "The brand has settled their invoice"],
    ["Paid to creator", "Sent on a payout run — the 1st or the 15th"],
], widths=[38 * mm, 122 * mm]))

gap(4)
A(panel([
    Paragraph("<b>Two questions that always come up</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "<b>Can a brand set its own commission rate?</b> No, deliberately. Rates, "
        "campaigns and creator contact stay with the Pluggz team.",
        S["muted"]),
    Spacer(1, 1.5 * mm),
    Paragraph(
        "<b>Can a brand upload products?</b> No. Creators add them by pasting a "
        "link, which is what keeps a real review attached to every listing.",
        S["muted"]),
]))

A(PageBreak())

# ─────────────────────────────── part two ────────────────────────────────────

A(Paragraph("For the brand's developer", S["title"]))
A(Paragraph(
    "Telling Pluggz when an order completes. About ten minutes of work, once.",
    S["sub"]))
story.extend(rule())

p("Pluggz sends you shoppers from creators' storefronts. To pay the right "
  "creator, we need to know when one of those visits turns into an order. "
  "There are two steps and no ongoing effort.")

gap(3)
A(panel([
    Paragraph("<b>We never want customer data</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "Do not send names, email addresses, delivery addresses or payment "
        "details. We have no use for them and will discard them. All we need is "
        "our own reference, your order number and the order value.",
        S["muted"]),
]))

h2("Step 1 · Keep our reference when a shopper arrives")
p("Every shopper we send lands on your site with an extra parameter:")
gap(2)
p("<font face='Courier'>https://yourshop.com/products/…?ref=pluggz&amp;pz=cmsq0k…</font>", "code")
gap(2)
p("<b>Store the value of <font face='Courier'>pz</font></b> against that "
  "visitor's session or cart — a cookie is fine — and keep it until checkout. "
  "It identifies the individual click, so it is what ties an order back to the "
  "creator who earned it.")
gap(2)
p("Give it at least the length of the agreed attribution window, thirty days "
  "by default. If a shopper arrives with a new <font face='Courier'>pz</font>, "
  "overwrite the old one.", "muted")

h2("Step 2 · Tell us when the order completes")
p("From your server, once the order is confirmed and paid:")
gap(2)
p("<font face='Courier'>POST https://pluggzofficial.co.uk/api/track/sale</font>", "code")
p("<font face='Courier'>Content-Type: application/json</font>", "code")
p("<font face='Courier'>X-Pluggz-Key: pz_live_…</font>", "code")
p("<font face='Courier'>X-Pluggz-Signature: sha256=&lt;hex&gt;</font>", "code")
gap(2)
p("<font face='Courier'>{ \"pz\": \"cmsq0k…\", \"orderRef\": \"1002948\", "
  "\"value\": 4499, \"currency\": \"GBP\" }</font>", "code")

gap(3)
A(datatable([
    ["Field", "Required", "Notes"],
    ["pz", "yes", "The reference you stored in step 1"],
    ["orderRef", "yes", "Your order number. Stops an order counting twice"],
    ["value", "yes", "Commissionable value in <b>pence</b>. 4499 = £44.99"],
    ["currency", "no", "GBP unless agreed otherwise"],
    ["soldAt", "no", "ISO 8601. Defaults to when we receive it"],
], widths=[24 * mm, 20 * mm, 116 * mm]))

gap(3)
A(panel([
    Paragraph("<b>The two things that catch people out</b>", S["body"]),
    Spacer(1, 2 * mm),
    Paragraph(
        "<b>value is in pence, as a whole number.</b> £44.99 is "
        "<font face='Courier'>4499</font>, not <font face='Courier'>44.99</font>.",
        S["muted"]),
    Spacer(1, 1.5 * mm),
    Paragraph(
        "<b>Send our pz back exactly as it arrived.</b> Don't trim it, "
        "lower-case it or truncate the column it is stored in.",
        S["muted"]),
], border=PINK))

h3("Signing")
p("Sign the exact bytes you send, using the signing secret we gave you:")
gap(2)
p("<font face='Courier'>const signature = crypto.createHmac(\"sha256\", SECRET)"
  ".update(rawBody).digest(\"hex\");</font>", "code")
gap(2)
p("Sign the raw body, not a re-serialised object — re-encoding JSON will not "
  "reproduce the same bytes and the signature will not match. This is what "
  "stops anyone else claiming sales against your account.", "muted")

h3("What comes back")
gap(2)
A(datatable([
    ["Code", "Meaning"],
    ["200", "Recorded — or already recorded, if you are retrying"],
    ["401", "Key or signature wrong"],
    ["403", "That reference belongs to a different brand"],
    ["422", "We could not match the reference. <b>Still send it</b> — it tells us something is being lost in step 1"],
    ["429", "Too fast. Retry after a short pause"],
], widths=[18 * mm, 142 * mm]))

h3("Retries and refunds")
gap(1)
A(KeepTogether(bullets([
    "<b>Retries are safe.</b> The same order number twice is recorded once, and "
    "the reply says so. If your checkout can fire twice, or you retry on a "
    "timeout, nothing is double-counted.",
    "<b>Refunds and cancellations:</b> send the same message with "
    "<font face='Courier'>\"status\": \"cancelled\"</font> and the commission is "
    "reversed. In most cases nothing needs clawing back, because a creator is "
    "not paid until the return window has passed.",
])))

h2("Test it once, before you go live")
p("Ask us for a Pluggz link to one of your products. Click it, complete a real "
  "order on your own site, and tell us the order number. We will confirm we "
  "received it and that it matched the right creator.")
gap(2)
p("If it didn't arrive, the cause is almost always one of three things: the "
  "<font face='Courier'>pz</font> was not kept through checkout, the value was "
  "sent in pounds instead of pence, or the signature was computed over "
  "re-encoded JSON rather than the raw body.", "muted")

h2("What you get")
gap(1)
A(KeepTogether(bullets([
    "Your own dashboard — shoppers sent, conversion rate, sales, and what you owe",
    "Which creators are actually driving your sales, not a monthly summary",
    "Commission on confirmed sales only. Never on clicks, never on impressions",
])))

gap(4)
p("Anything unclear, ask before building it. A ten-minute conversation is "
  "cheaper than a month of sales landing in the wrong place.", "muted")


doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=25 * mm, rightMargin=25 * mm,
    topMargin=22 * mm, bottomMargin=20 * mm,
    title="Pluggz — Brand onboarding pack", author="Pluggz",
)
doc.build(story, onFirstPage=header_footer("Pluggz · brand onboarding", DATE),
          onLaterPages=header_footer("Pluggz · brand onboarding", DATE))
print(f"  wrote {OUT}")
