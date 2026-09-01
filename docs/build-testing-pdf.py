"""Render the testing guide to PDF.

For Lisa and Rachel to work through. Client-facing, so it uses the brand's own
type and colour rather than the ReportLab defaults. Source text lives beside
this in testing-guide.md; keep the two in step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph

from pdf_style import S, bullets, datatable, header_footer, panel, rule

LABEL = "Pluggz · how to test"
DATE = "1 September 2026"


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz: how to test",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("How to test Pluggz", S["title"]))
    s.append(Paragraph(
        "For Lisa and Rachel &middot; about thirty minutes &middot; "
        "no technical knowledge needed", S["sub"]))

    # ------------------------------------------------- the money warning
    s.append(panel([
        Paragraph("Read this first: money is switched on now", S["h3"]),
        Paragraph(
            "Stripe is connected and live, which changes what testing means. "
            "<b>A real payment can now happen.</b> If you invoice a brand and it is "
            "paid, the platform will pay that sale's creator on the next 1st or 15th, "
            "with real money. Nothing is a rehearsal any more.", S["body"]),
        Paragraph(
            "<b>So there is one rule.</b> Do not settle an invoice, and do not press "
            "the send button on a payout run, unless you mean it. Everything else on "
            "this list is safe to try, and every screen that can move money says so "
            "before it does.", S["body"]),
        Paragraph(
            "If you want to see the money side working without any money moving, ask "
            "us and we will walk you through it on a copy.", S["body"]),
    ]))

    s.append(panel([
        Paragraph("Before you start", S["h3"]),
        Paragraph(
            "Everything below is on the live site, so anything you record is real. "
            "Tell us before you begin and we will clear the test data afterwards.", S["body"]),
        Paragraph(
            "Ask us for your own sign in rather than sharing one. The site records who "
            "approved what, and two people on one login makes that meaningless.", S["body"]),
        Paragraph(
            "Have a phone to hand as well as a computer. Roughly half of what shoppers do "
            "happens on a phone, and it is the half most likely to look wrong.", S["body"]),
    ]))

    # --------------------------------------------------------- the shopper
    s.append(Paragraph("1. The shopper journey", S["h2"]))
    s.append(Paragraph(
        "What someone sees when a creator posts a link.", S["muted"]))
    s.extend(bullets([
        "Open <b>pluggzofficial.co.uk</b> on your phone.",
        "Tap into a category from the homepage, then tap any product.",
        "On the product page, tap the button that takes you to the brand.",
    ]))
    s.append(Paragraph(
        "<b>What should happen:</b> you land on the brand's own website, on that exact "
        "product. The address will carry <b>ref=pluggz</b> and a <b>pz=</b> reference, "
        "which is how a sale later gets credited to the right creator.", S["body"]))
    s.append(Paragraph(
        "Worth checking as you go: do the creator names read properly, and does anything "
        "look broken on a phone.", S["muted"]))

    s.extend(rule())

    # --------------------------------------------------------- the sale
    s.append(Paragraph("2. Does a sale come back", S["h2"]))
    s.append(Paragraph(
        "The part that matters commercially. It needs the brand's side switched on "
        "first, and we will tell you when a brand is ready.", S["muted"]))
    s.extend(bullets([
        "Use a Pluggz link to reach the brand, as in step 1.",
        "Buy something on the brand's site, in the same browser.",
        "Sign in to Pluggz and open <b>Record sales</b>.",
    ]))
    s.append(Paragraph(
        "<b>What should happen:</b> the order appears within a minute, against the "
        "creator whose link you used, with the commission already split between that "
        "creator and Pluggz.", S["body"]))
    s.append(Paragraph(
        "Sales are marked <b>Verified</b> or <b>Unverified</b>. Verified means the "
        "brand's own server reported it and the figure cannot have been altered. "
        "Unverified means a pixel in the shopper's browser reported it, which is easier "
        "to set up but can be blocked by an ad blocker and cannot be proved. Check "
        "unverified sales against the brand's own order list before paying commission.",
        S["body"]))

    s.extend(rule())

    # --------------------------------------------------------- afterwards
    s.append(Paragraph("3. What happens to that sale afterwards", S["h2"]))
    s.append(Paragraph(
        "You do not have to do any of this. It is here so you can watch it happen and "
        "recognise it when it does. Every sale sits at one of four stages, shown on "
        "<b>Payouts</b>.", S["muted"]))

    s.append(datatable([
        ["Stage", "What it means"],
        ["Pending",
         "Inside the brand's returns window, so it could still be refunded. Nothing is "
         "owed to anybody yet"],
        ["Verified", "The window has passed. The sale is now billable"],
        ["Paid to Pluggz",
         "The brand has paid its invoice, so the creator's share is genuinely ours to "
         "pass on"],
        ["Paid to creator", "Sent"],
    ], widths=[34 * mm, 132 * mm]))

    s.append(Paragraph(
        "Between the second and the third, the platform raises an invoice on its own, "
        "overnight, for any brand that owes enough. Between the third and the fourth, it "
        "pays the creators on the 1st and the 15th. Neither needs anybody to remember.",
        S["body"]))
    s.append(Paragraph(
        "<b>Brand invoices</b> shows what has been billed and what has been paid. "
        "<b>Money</b> shows the whole picture at once: what has come in from brands, "
        "what has gone out to creators, and what Pluggz has earned against what has "
        "actually reached the company bank.", S["body"]))

    s.extend(rule())

    # --------------------------------------------------------- creator payouts
    s.append(Paragraph("4. The creator side of getting paid", S["h2"]))
    s.append(Paragraph(
        "Worth doing once, so you know what a creator sees when you tell them to set "
        "themselves up.", S["muted"]))
    s.extend(bullets([
        "Sign in as a creator and open <b>Payouts</b>.",
        "Press <b>Set up payouts</b>.",
    ]))
    s.append(Paragraph(
        "<b>What should happen:</b> you are taken to Stripe's own pages, not ours, and "
        "asked for your name, address, date of birth and bank details. When you come "
        "back, the page says whether Stripe will pay you yet, and if not, exactly what "
        "it is still waiting for. You can stop part way through; nothing is set up until "
        "Stripe says it is.", S["body"]))
    s.append(Paragraph(
        "Those details are entered on Stripe and held by Stripe. Pluggz never sees them "
        "and never stores them. That is the whole reason for using Stripe rather than "
        "paying creators by bank transfer: a platform that never sees a bank account "
        "cannot leak one.", S["body"]))

    s.extend(rule())

    # --------------------------------------------------------- admin
    s.append(Paragraph("5. The admin side", S["h2"]))
    s.append(Paragraph("Each one should take a minute.", S["muted"]))
    s.append(datatable([
        ["Screen", "What to try"],
        ["Approvals", "Approve or decline a creator application"],
        ["Brands", "Add a brand, then copy what it gives you to send them"],
        ["Products", "Add a product by pasting the address of its page"],
        ["Categories", "Add a category, put it in the header, then delete it"],
        ["Record sales", "Upload a sales report and read the preview before recording"],
        ["Brand invoices", "Look at what is ready to bill and what has been paid"],
        ["Payouts", "Look at what is pending, verified and paid"],
        ["Money", "Check the totals agree with what you have just done"],
        ["Analytics", "Check the numbers match what you have just done"],
    ], widths=[34 * mm, 132 * mm]))

    s.extend(bullets([
        "Adding a brand gives you either a tracking script or a key and a secret, "
        "depending on what their shop runs on, and that is what you send them.",
        "Uploading a sales report always shows a preview first, and nothing is written "
        "until you press record.",
        "On <b>Brand invoices</b>, raising an invoice and sending it are separate steps, "
        "and recording a payment is a third. Raising one is safe. Recording a payment is "
        "the one that releases money to creators, so it asks for the bank reference.",
    ]))

    s.extend(rule())

    # --------------------------------------------------------- reporting
    s.append(Paragraph("6. If something looks wrong", S["h2"]))
    s.append(Paragraph(
        "Send us four things. With them we can usually find it in minutes; without them "
        "we are guessing.", S["muted"]))
    s.extend(bullets([
        "What you were doing, in one line",
        "The address in the browser bar at the time",
        "What you expected, and what happened instead",
        "A screenshot, and whether it was phone or computer",
    ]))
    s.append(Paragraph(
        "Please do not describe it as \"it doesn't work\" on its own. That is true of "
        "several very different faults which have nothing in common, and it costs a day "
        "to narrow down.", S["muted"]))

    s.extend(rule())

    # --------------------------------------------------------- known
    s.append(Paragraph("What we already know about", S["h2"]))
    s.append(Paragraph(
        "So you do not spend time reporting these back to us.", S["muted"]))
    s.extend(bullets([
        "<b>Twenty listings are hidden</b> because their brands' websites will not give "
        "up a photograph to any automatic read. They are hidden rather than deleted and "
        "come straight back the moment we have images. Everything you can see has a "
        "picture.",
        "Three products still have no price, for the same reason.",
        "Four creator names show as their handle, and every follower count is zero, so "
        "that line is hidden rather than showing a nil. We are still waiting on the real "
        "names and numbers.",
        "The creator terms page is placeholder text.",
        "Creator video is built and connected, but nothing can be uploaded until "
        "Cloudflare Stream minutes are purchased.",
    ]))

    doc.build(s, onFirstPage=header_footer(LABEL, DATE),
              onLaterPages=header_footer(LABEL, DATE))
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-Testing-Guide.pdf")
