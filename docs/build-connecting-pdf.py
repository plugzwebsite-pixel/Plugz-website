"""Render the two-pathway tracking guide to PDF.

The client asked for one short document a brand can be sent, covering both a
Shopify shop and a website their own team built. The Shopify steps are the same
seven the platform shows on the credentials screen; they come from
SHOPIFY_STEPS in src/lib/pixel-snippet.ts and must not be reworded here, because
a brand following a drifted copy is a brand whose sales quietly stop arriving.

Two pages, deliberately. It goes to a developer who wants the contract and to a
shop owner who wants the seven steps, and neither reads past the point where it
starts repeating itself. The comparison sits at the top rather than the end so
the reader can choose a pathway before reading either one.

Source text lives beside this in connecting-your-website.md; keep the two in
step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

from pdf_style import S, bullets, datatable, header_footer, panel, rule

LABEL = "Pluggz · connecting your website"
DATE = "4 September 2026"

CODE_BG = "#F4EFE8"


def steps(items):
    """A numbered sequence. The order matters and the text refers to step 7."""
    return [Paragraph(t, S["bullet"], bulletText=f"{i}.")
            for i, t in enumerate(items, start=1)]


def code(lines):
    """A code sample, kept whole so a line never breaks across a page."""
    body = "<br/>".join(
        l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace(" ", "&nbsp;")
        for l in lines
    )
    return panel([Paragraph(body, S["code"])], bg=CODE_BG, pad=4)


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=18 * mm,
        title="Connecting your website to Pluggz",
        author="Pluggz",
    )
    s = []

    s.append(Paragraph("Connecting your website to Pluggz", S["title"]))
    s.append(Paragraph("Two pathways. Pick the one that matches your shop.", S["sub"]))

    s.append(panel([
        Paragraph(
            "<b>What has to happen.</b> Pluggz sends a shopper to your website with a "
            "reference on the address. Your site keeps that reference. When the order "
            "completes, your site tells Pluggz the reference, your own order number, "
            "and the value. That is the whole job, and it is the same pattern as Awin "
            "or Impact: we tag the visit, you tell us when it turns into an order. We "
            "never need customer data, so please do not send names, emails, addresses "
            "or payment details.", S["body"]),
    ]))

    s.append(Spacer(1, 5))
    s.append(datatable([
        ["", "Shopify pixel", "A site your team built"],
        ["Work involved", "Paste a snippet and connect it", "About an hour"],
        ["Reliability", "An ad blocker can stop it", "Not affected, and signed"],
        ["Sales arrive as", "Unverified, worth reconciling", "Verified"],
    ], widths=[30 * mm, 68 * mm, 72 * mm]))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        "<b>We recommend the server call wherever a developer is available</b>, "
        "including on Shopify. The pixel exists so that a shop with nobody to write "
        "code is not excluded.", S["muted"]))

    s.append(Paragraph("What we issue you", S["h2"]))
    s.append(Paragraph(
        "A <b>brand key</b> that identifies your shop, for example "
        "pz_live_brand_a1b2c3…, and a <b>signing secret</b> that signs each message. "
        "The secret is for the server pathway only and must never appear in a web page. "
        "Both are issued the same day you ask, and nothing below authenticates until "
        "they exist.", S["body"]))

    s.extend(rule(space_before=2, space_after=7))

    # ---------------------------------------------------------------- Shopify
    s.append(Paragraph("Pathway 1 · Shopify", S["h2"]))
    s.append(Paragraph(
        "<b>Nothing to write.</b> We send you a snippet with your key already inside "
        "it.", S["body"]))
    s.extend(steps([
        "In the Shopify admin, open <b>Settings</b>, then <b>Customer events</b>.",
        "Click <b>Add custom pixel</b> and name it <b>Pluggz Affiliate Tracking</b>.",
        "Under <b>Customer privacy</b>, set <b>Permission</b> to <b>Required</b>.",
        "Set <b>Data sale</b> to: data collected does not qualify as data sale.",
        "Paste the snippet into the code box.",
        "Click <b>Save</b>.",
        "Click <b>Connect</b>.",
    ]))
    s.append(Spacer(1, 5))
    s.append(panel([
        Paragraph(
            "<b>Step 7 is the one people miss.</b> Saving a pixel does not switch it "
            "on. A shop can sit for a week wondering why no sales are arriving from a "
            "pixel that was saved but never connected.", S["body"]),
    ]))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        "The snippet catches the reference when a shopper arrives, keeps it for 30 "
        "days, and reports the order when the checkout completes. There is nothing to "
        "add to your theme and nothing to maintain.", S["body"]))

    s.extend(rule(space_before=2, space_after=7))

    # ------------------------------------------------------------- In-house
    s.append(KeepTogether([
        Paragraph("Pathway 2 · A website your own team built", S["h2"]),
        Paragraph("<b>One change on the way in, one call on the way out.</b>", S["body"]),
        Paragraph("Step 1 · Keep the reference when a shopper arrives", S["h3"]),
        Paragraph(
            "Every shopper we send lands on your own product page with <b>?ref=pluggz</b> "
            "and <b>pz=…</b> added. The <b>pz</b> value identifies that single click. "
            "Store it and keep it for <b>30 days</b>, or whatever attribution window we "
            "have agreed.", S["body"]),
    ]))
    s.append(code([
        'const pz = new URLSearchParams(location.search).get("pz");',
        "if (pz) document.cookie =",
        "  `pluggz_ref=${pz}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;",
    ]))
    s.append(Spacer(1, 4))
    s.append(Paragraph(
        "If you already store a click ID for another affiliate network, put ours in the "
        "same place. <b>Worth checking:</b> some sites drop the query string when "
        "redirecting to a login or a country selector, which loses the reference. Tell "
        "us if yours does and we will carry it differently.", S["muted"]))

    s.append(Paragraph(
        "Step 2 · Report the order from your server, once it is confirmed and paid",
        S["h3"]))
    s.append(code([
        "POST https://pluggzofficial.co.uk/api/track/sale",
        "X-Pluggz-Key: pz_live_brand_a1b2c3...",
        "X-Pluggz-Signature: <HMAC-SHA256 of the exact body, hex>",
        "{",
        '  "pz": "cmsnwhf8z0001ks24dkvv7dfl",',
        '  "orderRef": "1002948",',
        '  "value": 4499,',
        '  "currency": "GBP",',
        '  "soldAt": "2026-08-11T09:32:04Z"',
        "}",
    ]))
    s.append(Spacer(1, 3))
    s.append(datatable([
        ["Field", "Required", "Notes"],
        ["pz", "yes", "the reference you stored in step 1"],
        ["orderRef", "yes", "your own order number, so an order is never counted twice"],
        ["value", "yes",
         "commissionable value <b>in pence</b>, as a whole number. 4499 is £44.99"],
    ], widths=[22 * mm, 18 * mm, 130 * mm]))
    s.append(Spacer(1, 3))
    s.append(Paragraph(
        "<b>currency</b> and <b>soldAt</b> are optional: GBP unless agreed, and the time "
        "we receive it unless you send an ISO 8601 date.", S["muted"]))

    s.append(Paragraph(
        "Sign the exact bytes you send. This is what stops anyone else claiming sales "
        "against your account.", S["body"]))
    s.append(code([
        'const signature = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");',
    ]))

    s.append(Paragraph("Replies, retries and refunds", S["h3"]))
    s.append(Paragraph(
        "<b>200</b> recorded, or already recorded. <b>401</b> key or signature wrong. "
        "<b>422</b> we could not match that reference to a click, which usually means it "
        "is being lost in step 1, so please still send it. <b>429</b> too fast, retry "
        "with a short backoff.", S["body"]))
    s.append(Paragraph(
        "<b>Retries are safe:</b> the same order number twice is recorded once, so a "
        "checkout that fires twice counts once. <b>For a refund</b>, send the same "
        "message with status cancelled and the commission is reversed. A creator is not "
        "paid until your return window has passed.", S["body"]))

    s.append(Paragraph("Test it, once", S["h3"]))
    s.append(Paragraph(
        "Ask us for a test link, open it in an ordinary browser, and check pz arrives "
        "and is stored. Place an order for a small amount. Pathway 2 should return 200 "
        "with a saleId; pathway 1 reports silently, so tell us when you have placed it. "
        "We confirm it at our end and the integration is signed off. Any questions, "
        "we are at <b>hello@pluggzofficial.co.uk</b>.", S["body"]))

    hf = header_footer(LABEL, DATE)
    doc.build(s, onFirstPage=hf, onLaterPages=hf)


if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "Pluggz-Connecting-Your-Website.pdf")
    build(out)
    print("wrote " + out)
