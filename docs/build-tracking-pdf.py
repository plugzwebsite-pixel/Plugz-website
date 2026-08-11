"""Render the sales-tracking explainer to PDF.

Two audiences in one document on purpose: the first half is for Lisa and
Rachael and answers "can our link follow a shopper to the till"; the last page
is written to be forwarded straight to a brand's developer.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

from pdf_style import S, PANEL, GREEN, bullets, datatable, header_footer, panel, rule

DATE = "11 August 2026"


def code(*lines):
    return [Paragraph(line.replace("&", "&amp;").replace("<", "&lt;"), S["code"])
            for line in lines]


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz — Tracking a sale to the checkout",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Tracking a sale to the checkout", S["title"]))
    s.append(Paragraph(
        "How a Pluggz link follows a shopper to the point of purchase &middot; "
        "prepared for Lisa and Rachael &middot; 11 August 2026", S["sub"]))

    s.append(panel([
        Paragraph("The short answer", S["h3"]),
        Paragraph(
            "<b>Yes &mdash; and most of it is already built and running.</b> Every Pluggz link "
            "already carries a reference that is unique to the individual click, and that "
            "reference is already arriving at the brand's website on every visit we send them. "
            "The commission engine, return windows, payout pipeline and dashboards are all built "
            "around it.", S["body"]),
        Paragraph(
            "What is missing is one message coming back the other way: the brand's website "
            "telling us the order completed. That message can only be sent by the brand, because "
            "their checkout is the only place it can be seen. It is a one-time job of well under "
            "an hour on their side, and it replaces the spreadsheet entirely.", S["body"]),
    ]))

    # ------------------------------------------------------------- today
    s.append(Paragraph("What already happens today", S["h2"]))
    s.append(Paragraph(
        "This is a real link on the live site. A shopper taps "
        "<b>pluggzofficial.co.uk/go/j4vu8d3k</b> and in the same instant:", S["body"]))

    s.append(datatable([
        ["", ""],
        ["A click is recorded",
         "Time, creator, product and link &mdash; and bots are excluded, so nobody's numbers can be inflated"],
        ["A 30-day cookie is set",
         "So a shopper who comes back a fortnight later still belongs to the creator who sent them"],
        ["The shopper reaches the brand",
         "auvodka.co.uk/&hellip;/au-vodka-cocktail-shaker-set?ref=pluggz&amp;<b>pz=cmsnwhf8z0001ks24dkvv7dfl</b>"],
    ], [42 * mm, 123 * mm], head=False))

    s.append(Spacer(1, 8))
    s.append(Paragraph(
        "That <b>pz</b> value is the whole mechanism. It is unique to that single click by that "
        "single shopper on that creator's link &mdash; and it is already being handed to every "
        "brand we send traffic to, and has been since launch.", S["body"]))

    s.append(Paragraph("Everything after the sale is built and waiting", S["h3"]))
    s.extend(bullets([
        "A sale record that points back at the exact click that earned it",
        "Commission split at the moment of sale, at the rates in force that day, so a later rate "
        "change can never rewrite what a creator has already earned",
        "Each brand's own return window, so a sale only becomes payable once their refund period "
        "has passed",
        "The payout pipeline &mdash; Pending, Verified, Paid to Pluggz, Paid to Creator &mdash; "
        "and the 1st and 15th payout runs",
        "Creator dashboards, admin analytics and brand invoices, all reading from those records",
    ]))
    s.append(Paragraph(
        "None of it has ever had a sale to work on. The engine is built; nothing has been able to "
        "start it automatically.", S["muted"]))

    # ------------------------------------------------------------- why
    s.append(Paragraph("Why the brand has to take part", S["h2"]))
    s.append(Paragraph(
        "Once a shopper leaves pluggzofficial.co.uk and lands on the brand's website, Pluggz has "
        "no code running on that website. We cannot see their basket, their checkout or their "
        "order confirmation &mdash; for the same reason no website can see inside another one. "
        "The browser does not allow it, and no amount of clever link building changes that.",
        S["body"]))
    s.append(Paragraph(
        "<b>This is not a Pluggz limitation. It is how every affiliate network works.</b> Awin, "
        "Impact, CJ and Rakuten &mdash; and the creator platforms built on top of them, LTK and "
        "ShopMy &mdash; all do exactly two things: redirect the shopper with a unique reference "
        "attached, and read a message sent back by tracking the advertiser installed on their own "
        "order-confirmation page. When Awin tells a publisher they made a sale, that data came "
        "from the advertiser's website calling Awin. There is no other way for them to know it, "
        "and no other way for anyone to know it.", S["body"]))
    s.append(panel([
        Paragraph(
            "The difference between &ldquo;a spreadsheet from the brand&rdquo; and "
            "&ldquo;automatic&rdquo; is not a different kind of link. It is a one-time job on the "
            "brand's website that then reports every order for ever, with no human involved "
            "&mdash; and it is a normal ask. Any brand that has run an affiliate programme has "
            "done it before.", S["body"]),
    ]))

    # ------------------------------------------------------------- routes
    s.append(Paragraph("Three ways to get there", S["h2"]))
    s.append(Paragraph(
        "Every brand falls into one of these, and all three end in the same place: sales "
        "appearing on your dashboard by themselves.", S["muted"]))

    s.append(datatable([
        ["", "What the brand does", "What we build", "Best for"],
        ["<b>A. Pluggz postback</b>",
         "Adds a short call to their order-confirmation page, once",
         "1&ndash;2 days",
         "Direct deals &mdash; every brand we have today"],
        ["<b>B. Shopify / WooCommerce app</b>",
         "Installs our app. No developer needed",
         "1&ndash;2 weeks, plus Shopify's review",
         "Smaller brands with no dev team"],
        ["<b>C. Their existing network</b>",
         "Nothing &mdash; it is already installed",
         "Integration with the network's API",
         "Brands already on Awin, Impact or CJ"],
    ], [36 * mm, 48 * mm, 34 * mm, 47 * mm]))

    s.append(Paragraph("A &middot; The Pluggz postback &mdash; the one to build first", S["h3"]))
    s.append(Paragraph(
        "When an order completes, the brand's server sends us one message: our reference, their "
        "order number and the order value. We match the reference to the click, the click to the "
        "creator, and the sale is on the dashboard seconds later. The last page of this document "
        "is the specification, written to be forwarded straight to their developer.", S["body"]))

    s.append(Paragraph("B &middot; The Shopify / WooCommerce app", S["h3"]))
    s.append(Paragraph(
        "The same thing, packaged so nobody has to write anything: the brand installs it and it "
        "reports orders automatically. For a small brand this is the difference between "
        "&ldquo;we'll ask our developer&rdquo; and &ldquo;done&rdquo;, and it is what would let "
        "you onboard a brand without us.", S["body"]))

    s.append(Paragraph("C &middot; Their existing affiliate network", S["h3"]))
    s.append(Paragraph(
        "If a brand already runs a programme on Awin, Impact or CJ, the tracking is already on "
        "their site and nobody needs to touch it &mdash; we join as a publisher and pull the "
        "sales from the network. <b>The blocker here is commercial, not technical:</b> Pluggz has "
        "applied and has not yet been accepted, because the networks want to see traffic volume "
        "first. Worth pursuing in parallel, but no developer can unblock it.", S["body"]))

    s.append(Paragraph("Discount codes &mdash; what they are actually for", S["h3"]))
    s.append(Paragraph(
        "A per-creator discount code stays in the system as the fallback for a brand that will do "
        "none of the above. It needs no integration at all, and it is exactly as reliable as that "
        "brand's willingness to send a monthly report. It should be the exception, not the plan.",
        S["body"]))

    # ------------------------------------------------------------- asks
    s.append(Paragraph("What we need from a brand, every time", S["h2"]))
    s.append(Paragraph("Commercial &mdash; agreed with you", S["h3"]))
    s.extend(bullets([
        "Commission rate Pluggz earns",
        "Return / refund window in days &mdash; this is what decides when a creator can be paid",
        "Settlement terms &mdash; how long after a sale is verified the brand pays us",
        "<b>What counts as commissionable</b> &mdash; order value net of VAT, delivery and "
        "returns, or something else. It needs saying out loud, because it decides every invoice",
        "Currency, GBP unless agreed otherwise",
    ]))
    s.append(Paragraph("Technical &mdash; needed once, from their developer", S["h3"]))
    s.extend(bullets([
        "<b>A technical contact.</b> A name and an email. This is the single thing that most "
        "often stalls an integration",
        "Which of the three routes they are taking",
        "For a network: the network name, their advertiser ID, and approval of Pluggz as a "
        "publisher on their programme",
        "For a postback: confirmation they can add a call on their order-confirmation page, and "
        "that our reference survives their own redirects &mdash; some sites strip it on the way "
        "to a login or a country selector, and we adjust for that",
        "<b>One test order</b>, on staging or for a token amount, so the chain is proven before "
        "their first real sale",
    ]))
    s.append(Paragraph(
        "We issue each brand its own key. Nothing is public, and no brand can see another "
        "brand's figures.", S["muted"]))

    s.append(Paragraph("Where this stands", S["h2"]))
    s.append(datatable([
        ["", ""],
        ["Click tracking, unique reference to the brand, attribution cookie",
         f'<font color="{GREEN.hexval()}"><b>Live</b></font>'],
        ["Sale records, commission split, return windows, payouts, dashboards",
         f'<font color="{GREEN.hexval()}"><b>Built</b></font>, waiting for an input'],
        ["Sales arriving by brand report or discount-code reconciliation",
         f'<font color="{GREEN.hexval()}"><b>Live</b></font> &mdash; the admin sales import'],
        ["<b>The endpoint a brand's website calls when an order completes</b>",
         "<b>To build &mdash; 1&ndash;2 days</b>"],
        ["Shopify / WooCommerce app", "To build &mdash; 1&ndash;2 weeks plus review"],
        ["Network integration", "Blocked commercially, not technically"],
    ], [110 * mm, 55 * mm], head=False))

    s.extend(rule(8, 6))
    s.append(Paragraph(
        "If a brand installs nothing at all, no affiliate platform in the world can say whether a "
        "shopper bought. Pluggz can already prove they clicked, what they clicked and that we "
        "delivered them to the product page. Whether they paid is only knowable from the brand "
        "&mdash; which is why the integration belongs in the brand conversation from the start, "
        "alongside the commission rate.", S["foot"]))

    # ------------------------------------------------------- brand page
    s.append(PageBreak())
    s.append(Paragraph("For the brand's development team", S["title"]))
    s.append(Paragraph(
        "Pluggz sales tracking &middot; integration guide &middot; everything from here on can be "
        "forwarded as it is", S["sub"]))

    s.append(panel([
        Paragraph(
            "Pluggz sends you traffic from UK creators and needs to know which of your orders "
            "came from it. Same pattern as Awin, Impact or CJ: we tag the visit, you tell us when "
            "it becomes an order. <b>Under an hour's work, including a test.</b>", S["body"]),
        Paragraph(
            "We issue you a <b>brand key</b> and a <b>signing secret</b> when your account is set "
            "up. Ask your Pluggz contact and we will set them up the same day.", S["muted"]),
    ]))

    s.append(Paragraph("Step 1 &middot; Keep our reference when a shopper arrives", S["h3"]))
    s.append(Paragraph(
        "Shoppers we send you land on your own product page with two parameters added:", S["body"]))
    s.extend(code("https://yourbrand.co.uk/products/the-product?ref=pluggz&pz=cmsnwhf8z0001ks24dkvv7dfl"))
    s.append(Paragraph(
        "<b>pz</b> is unique to that click. Store it in a first-party cookie and keep it for 30 "
        "days, or whatever attribution window we agree. If you already store a click ID for "
        "another affiliate network, put ours in the same place &mdash; it is the same job.",
        S["body"]))

    s.append(Paragraph("Step 2 &middot; Tell us when the order completes", S["h3"]))
    s.append(Paragraph(
        "Server to server, from your backend, once the order is confirmed and paid:", S["body"]))
    s.extend(code(
        "POST https://pluggzofficial.co.uk/api/track/sale",
        "Content-Type: application/json",
        "X-Pluggz-Key: pz_live_brand_a1b2c3...",
        "X-Pluggz-Signature: HMAC-SHA256 of the exact body, using your signing secret, hex",
        "",
        '{ "pz": "cmsnwhf8z0001ks24dkvv7dfl", "orderRef": "1002948",',
        '  "value": 4499, "currency": "GBP", "soldAt": "2026-08-11T09:32:04Z" }',
    ))
    s.append(Paragraph(
        "<b>value</b> is the commissionable amount <b>in pence, as an integer</b> &mdash; 4499 "
        "means &pound;44.99. By default that is the order total net of VAT, delivery and any "
        "discount. If your figure means something different, tell us once and we will agree it "
        "rather than guess per order.", S["body"]))
    s.append(Paragraph(
        "We reply <b>200</b> with a sale id. <b>401</b> means the key or signature is wrong; "
        "<b>422</b> means we could not match the reference &mdash; send it anyway, it tells us "
        "something is being lost at step 1. <b>Retries are safe:</b> the same order reference "
        "twice is recorded once, so a double-fired checkout cannot double-count. Refunds are the "
        "same call with a cancelled status, and in most cases the creator has not been paid yet "
        "anyway, because the return window has not passed.", S["body"]))
    s.append(Paragraph(
        "We need no customer data. Please do not send names, emails, addresses or payment details "
        "&mdash; we have no use for them and will discard them.", S["muted"]))

    s.append(Paragraph("If server work is not possible", S["h3"]))
    s.append(Paragraph(
        "A one-pixel image tag on the order-confirmation page will do it, reading the cookie from "
        "step 1 itself. <b>We recommend the server call instead:</b> a pixel is blocked by ad "
        "blockers, does not fire if the shopper closes the tab, and cannot be signed &mdash; so "
        "it under-reports, and your numbers and ours will disagree. Use it only as a stop-gap.",
        S["body"]))

    s.append(Paragraph("Step 3 &middot; Test it, once", S["h3"]))
    s.extend(bullets([
        "Ask us for a test link. Open it and check the pz parameter arrives and is stored",
        "Place an order &mdash; staging, or a live one for a token amount",
        "Confirm you get a 200 with a sale id back",
        "We confirm at our end that it shows against the right creator, with the right value",
    ]))

    s.extend(rule(8, 6))
    s.append(Paragraph(
        "In return you get a Pluggz dashboard showing the traffic and sales we have sent you, the "
        "commission owed and your invoices &mdash; instead of a monthly reconciliation by email. "
        "Questions to hello@pluggzofficial.co.uk.", S["foot"]))

    draw = header_footer("PLUGGZ · Sales tracking", DATE)
    doc.build(s, onFirstPage=draw, onLaterPages=draw)
    print(f"written: {path}")


if __name__ == "__main__":
    build("docs/Pluggz-Sales-Tracking.pdf")
