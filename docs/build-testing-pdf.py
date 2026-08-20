"""Render the testing guide to PDF.

For Lisa and Rachel to work through. Client-facing, so it uses the brand's own
type and colour rather than the ReportLab defaults. Source text lives beside
this in testing-guide.md; keep the two in step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

from pdf_style import S, PANEL, bullets, datatable, header_footer, panel, rule


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
        "For Lisa and Rachel &middot; about twenty minutes &middot; "
        "no technical knowledge needed", S["sub"]))

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
        "product. The address will carry <b>ref=pluggz</b> and a <b>pz=</b> reference. "
        "That reference is how a sale is later credited to the right creator.", S["body"]))
    s.append(Paragraph(
        "Worth noticing as you go: does every product have a picture and a price, do the "
        "creator names read properly, and does anything look broken on a phone.", S["muted"]))

    s.extend(rule())

    # --------------------------------------------------------- the sale
    s.append(Paragraph("2. Does the sale come back", S["h2"]))
    s.append(Paragraph(
        "The part that matters commercially. It needs the brand's side switched on first, "
        "and we will tell you when a brand is ready.", S["muted"]))
    s.extend(bullets([
        "Use a Pluggz link to reach the brand, as in step 1.",
        "Buy something on the brand's site, in the same browser.",
        "Sign in to Pluggz and open <b>Record sales</b>.",
    ]))
    s.append(Paragraph(
        "<b>What should happen:</b> the order appears within a minute, against the creator "
        "whose link you used, with the commission already split.", S["body"]))

    s.append(KeepTogether([
        Paragraph("Verified and unverified sales", S["h3"]),
        datatable([
            ["", ""],
            ["<b>Verified</b>",
             "The brand's own server reported it and signed the message. The figure cannot "
             "have been altered, so it can be paid on."],
            ["<b>Unverified</b>",
             "A pixel in the shopper's browser reported it. Far easier to set up, but an ad "
             "blocker can stop it and the value cannot be proved. Check these against the "
             "brand's own order list before paying commission."],
        ], [30 * mm, 135 * mm], head=False),
    ]))

    s.extend(rule())

    # --------------------------------------------------------- admin
    s.append(Paragraph("3. The admin side", S["h2"]))
    s.append(Paragraph("Each of these should take about a minute.", S["muted"]))
    s.append(datatable([
        ["Screen", "What to try"],
        ["Approvals", "Approve or decline a creator application"],
        ["Brands", "Add a brand, then copy what it gives you to send them"],
        ["Products", "Add a product by pasting the address of its page"],
        ["Categories", "Add a category, put it in the header, then delete it"],
        ["Record sales", "Upload a sales report and read the preview before recording"],
        ["Payouts", "Look at what is pending, verified and paid"],
        ["Analytics", "Check the numbers match what you have just done"],
    ], [34 * mm, 131 * mm]))

    s.append(Spacer(1, 8))
    s.append(Paragraph(
        "Two things worth knowing. Adding a brand gives you either a tracking script or a "
        "key and a secret, depending on what their shop runs on, and that is what you send "
        "them. Uploading a sales report always shows a preview first, and nothing is written "
        "until you press record.", S["body"]))

    s.extend(rule())

    # --------------------------------------------------------- reporting
    s.append(Paragraph("4. If something looks wrong", S["h2"]))
    s.append(Paragraph(
        "Send us these four things. With them we can usually find it in minutes. Without "
        "them we are guessing.", S["body"]))
    s.extend(bullets([
        "What you were doing, in one line",
        "The address in the browser bar at the time",
        "What you expected, and what happened instead",
        "A screenshot, and whether it was phone or computer",
    ]))
    s.append(Paragraph(
        "Please avoid \"it doesn't work\" on its own. That sentence is true of several very "
        "different faults which have nothing in common, and it costs a day to narrow down.",
        S["muted"]))

    s.extend(rule())

    # --------------------------------------------------------- known
    s.append(Paragraph("What we already know about", S["h2"]))
    s.append(Paragraph(
        "So you do not spend time reporting these back to us.", S["muted"]))
    s.extend(bullets([
        "Some products have no price or picture. Those shops hide both from any automatic "
        "read, so they have to be filled in by hand.",
        "Some creator names show as their handle, and every follower count is zero. We are "
        "still waiting on the real names and numbers.",
        "The creator terms page is placeholder text.",
        "Payouts are tracked but no money moves yet, since Stripe is not connected.",
    ]))

    doc.build(s, onFirstPage=header_footer("Pluggz · how to test", "21 August 2026"),
              onLaterPages=header_footer("Pluggz · how to test", "21 August 2026"))
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-Testing-Guide.pdf")
