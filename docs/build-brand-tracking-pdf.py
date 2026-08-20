"""Render the brand tracking guide to PDF.

Two audiences in one document, deliberately. The first two pages are the
process the Pluggz team follows when connecting a brand; the rest is written to
be forwarded to the brand itself, so it has to stand on its own without the
covering email.

The technical contract it describes is the one in brand-integration-guide.md;
keep the two in step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, KeepTogether, PageBreak,
)

from pdf_style import S, GREEN, bullets, datatable, header_footer, panel, rule

SITE = "pluggzofficial.co.uk"
LABEL = "Pluggz · connecting a brand"
DATE = "21 August 2026"


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz: connecting a brand and tracking its sales",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Connecting a brand", S["title"]))
    s.append(Paragraph(
        "How a brand is set up and how its sales reach Pluggz &middot; "
        f"{DATE}", S["sub"]))

    s.append(panel([
        Paragraph("In one paragraph", S["h3"]),
        Paragraph(
            "Every Pluggz link already carries a reference that is unique to the individual "
            "click, and that reference already arrives on the brand's website on every visit "
            "we send them. The only piece a brand has to add is one message coming back the "
            "other way, saying an order completed. There are two ways to send it, and which "
            "one suits them depends entirely on what their shop is built on.", S["body"]),
    ]))

    # ================================================== part one, our process
    s.append(Paragraph("Part one: what we do", S["h2"]))
    s.append(Paragraph(
        "The five steps, in order. Steps 1 to 3 take about ten minutes.", S["muted"]))

    s.append(datatable([
        ["", ""],
        ["<b>1. Add the brand</b>",
         "Admin, then Brands, then Add a brand. The question that matters is what their shop "
         "is built on, because it decides what we hand them at the end."],
        ["<b>2. Take what it gives you</b>",
         "Saving the brand issues its credentials. A Shopify shop gets a snippet with its key "
         "already inside; anything else gets a key and a signing secret. <b>The secret is "
         "shown once and never again.</b> Copy it there and then."],
        ["<b>3. Add their products</b>",
         "Admin, then Products, then Add products. Paste the address of a product page and "
         "the name, picture and price are read off it. Repeat for each product."],
        ["<b>4. Send it to the brand</b>",
         "Forward part two of this document along with their key. Send the signing secret "
         "separately and never by email or WhatsApp."],
        ["<b>5. Test it together</b>",
         "One real order, for a small amount, before anything is announced. Part three."],
    ], [38 * mm, 127 * mm], head=False))

    s.append(Spacer(1, 8))
    s.append(panel([
        Paragraph("Two things to get right before any real money moves", S["h3"]),
        Paragraph(
            "<b>Set the commission rate to the agreed figure.</b> A brand added without one "
            "carries a placeholder, and every sale recorded against it will be split at the "
            "wrong rate. Rates are frozen against each sale as it is recorded, so correcting "
            "this afterwards does not fix the sales already taken.", S["body"]),
        Paragraph(
            "<b>Check the product address opens.</b> Paste it in a browser. A good number of "
            "shops answer only on the www version of their name and not without it, and a "
            "link built from the wrong one leads nowhere at all.", S["body"]),
    ]))

    s.append(PageBreak())

    # ================================================== part two, for the brand
    s.append(Paragraph("Part two: for the brand", S["h2"]))
    s.append(Paragraph(
        "This part can be forwarded as it stands.", S["muted"]))

    s.append(Paragraph(
        "When a shopper follows a Pluggz link to your shop, they arrive with two extra values "
        "on the address:", S["body"]))
    s.append(Paragraph(
        f"yourshop.com/products/whatever?ref=pluggz&amp;<b>pz=cmsnwhf8z0001ks24dkvv7dfl</b>",
        S["code"]))
    s.append(Paragraph(
        "That <b>pz</b> value identifies the single click that sent them. Keep it, and send it "
        "back to us when the order completes. That is the whole mechanism.", S["body"]))

    s.append(Paragraph("Which route suits you", S["h3"]))
    s.append(datatable([
        ["", "Shopify pixel", "Server call"],
        ["Who sets it up", "The shop owner", "A developer"],
        ["How long", "About five minutes", "An hour or so"],
        ["Can it be blocked", "Yes, by ad blockers and privacy settings", "No"],
        ["Can it be proved", "No, it is signed by nothing", "Yes, signed with your secret"],
        ["How sales appear", "Marked unverified, checked against your orders", "Trusted"],
    ], [34 * mm, 62 * mm, 69 * mm]))

    s.append(Spacer(1, 8))
    s.append(Paragraph(
        "We would rather you took the server call. Take the pixel if a developer is not "
        "available, because a pixel reporting most of your sales is worth far more than a "
        "perfect integration that never gets built.", S["muted"]))

    s.extend(rule())

    # ---------------------------------------------------------- shopify
    s.append(Paragraph("Route A: the Shopify pixel", S["h2"]))
    s.append(Paragraph(
        "Nothing here touches your theme or your checkout, and it can be removed at any time "
        "from the same screen.", S["muted"]))
    s.extend(bullets([
        "In the Shopify admin, open <b>Settings</b>, then <b>Customer events</b>.",
        "Click <b>Add custom pixel</b> and name it Pluggz Affiliate Tracking.",
        "Under Customer privacy, set <b>Permission</b> to Required.",
        "Set <b>Data sale</b> to: data collected does not qualify as data sale.",
        "Paste the snippet we sent you into the code box.",
        "Click <b>Save</b>.",
        "Click <b>Connect</b>. Saving alone does not switch it on.",
    ]))
    s.append(Paragraph(
        "It should read <b>Connected</b> when it is live. Permission is set to Required "
        "because this is marketing and analytics tracking and UK GDPR applies, which means a "
        "shopper who declines your cookie banner is not tracked and their order is not "
        "attributed. That is a legal requirement rather than a fault.", S["body"]))

    s.extend(rule())

    # ---------------------------------------------------------- postback
    s.append(Paragraph("Route B: the server call", S["h2"]))
    s.append(Paragraph(
        "Two steps: keep our reference, then tell us when the order completes.", S["muted"]))

    s.append(Paragraph("Step 1: keep the reference", S["h3"]))
    s.append(Paragraph(
        "When a visitor arrives with <b>pz</b> on the address, store it against their session "
        "or cart for 30 days. Almost nobody buys on their first visit, and without this the "
        "reference is gone by checkout.", S["body"]))

    s.append(Paragraph("Step 2: tell us when the order completes", S["h3"]))
    s.append(Paragraph(f"POST https://{SITE}/api/track/sale", S["code"]))
    s.append(datatable([
        ["Header", "Value"],
        ["X-Pluggz-Key", "Your key, the one beginning pz_live_"],
        ["X-Pluggz-Signature",
         "HMAC SHA256 of the exact bytes of the body, using your signing secret, as hex"],
        ["Content-Type", "application/json"],
    ], [42 * mm, 123 * mm]))

    s.append(Spacer(1, 6))
    s.append(datatable([
        ["Body field", "", ""],
        ["pz", "required", "The reference you kept from step 1"],
        ["orderRef", "required", "Your own order number"],
        ["value", "required", "<b>In pence, as a whole number.</b> 49.99 is sent as 4999"],
        ["currency", "optional", "Defaults to GBP"],
        ["soldAt", "optional", "ISO date. Defaults to now"],
    ], [24 * mm, 22 * mm, 119 * mm], head=False))

    s.append(Spacer(1, 8))
    s.append(KeepTogether([
        Paragraph("Things worth knowing", S["h3"]),
        Paragraph(
            "Sign the exact bytes you send, not a re-serialised copy of the object, or the "
            "signature will not match.", S["bullet"], bulletText="•"),
        Paragraph(
            "Sending the same order twice is safe. It is recorded once and the second call "
            "answers with the same sale.", S["bullet"], bulletText="•"),
        Paragraph(
            "A <b>200</b> with a saleId means it landed. A <b>401</b> is the key or the "
            "signature, a <b>422</b> means we do not recognise that pz, and a <b>400</b> "
            "means a field is missing or the value was not a whole number of pence.",
            S["bullet"], bulletText="•"),
    ]))

    s.extend(rule())

    # ================================================== part three, testing
    s.append(Paragraph("Part three: test it once, together", S["h2"]))
    s.append(Paragraph(
        "Do this before anything is announced. It takes about ten minutes and it is the only "
        "way to know the whole chain works end to end.", S["muted"]))

    s.append(KeepTogether([
        Paragraph("Where the test link comes from", S["h3"]),
        Paragraph(
            "A tracking link is created the moment a creator puts one of the brand's products "
            "on their storefront. There is one for every product on every creator, and it is "
            "the same link a shopper follows. Nothing separate has to be generated for a test.",
            S["body"]),
        Paragraph(
            "To find one: <b>Admin</b>, then <b>Products</b>. Search for the product, and the "
            "<b>Tracking link</b> column gives it. The copy button beside it puts the full "
            "address on your clipboard, ready to paste.", S["body"]),
        Paragraph(f"https://{SITE}/go/qjdqqkfm", S["code"]),
        Paragraph(
            "If the column says None, no creator has plugged that product yet, so no link "
            "exists. Ask a creator to add it, or add it to a creator's storefront yourself.",
            S["muted"]),
    ]))

    s.append(Spacer(1, 8))
    s.append(Paragraph("Then, in order", S["h3"]))
    s.extend(bullets([
        "Send the brand that link and ask them to open it in a normal browser. They should "
        "check that <b>pz</b> arrives on their product page and that their site keeps it.",
        "They place one real order for a small amount, in that same browser.",
        "Open <b>Admin</b>, then <b>Record sales</b>. The order should appear within a minute, "
        "against the right creator, with the commission already split.",
        "Remove the test order afterwards so it does not sit in anybody's figures, and reset "
        "the click count on that link.",
    ]))

    s.append(Spacer(1, 6))
    s.append(Paragraph(
        "If nothing appears, the useful question is which half failed. A click recorded "
        "against the link means our side worked and the order message never arrived, which "
        "puts it on the brand's side. No click at all means the shopper never followed the "
        "link we think they did.", S["body"]))

    s.append(Paragraph("What happens to a sale after that", S["h3"]))
    s.append(datatable([
        ["Stage", "What it means"],
        ["Pending", "Recorded. The brand's return window has not passed yet"],
        ["Verified", "The return window has passed, so the refund risk is over"],
        ["Paid to Pluggz", "The brand has settled their invoice"],
        ["Paid to creator", "Paid out, on the 1st or the 15th"],
    ], [34 * mm, 131 * mm]))

    s.append(Spacer(1, 8))
    s.append(Paragraph(
        "Commission is split at the moment the sale is recorded, at the rates in force that "
        "day, and frozen against it. A rate change later never rewrites what a creator has "
        "already earned.", S["body"]))

    s.append(Spacer(1, 10))
    s.append(panel([
        Paragraph("What the brand gets out of it", S["h3"]),
        Paragraph(
            "A dashboard of their own showing clicks, sales and what they owe, so the "
            "conversation is about the same numbers on both sides; commission paid only on "
            "sales that survived the return window; and no spreadsheets going back and forth "
            "at the end of the month.", S["body"]),
    ]))

    draw = header_footer(LABEL, DATE)
    doc.build(s, onFirstPage=draw, onLaterPages=draw)
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-Brand-Tracking.pdf")
