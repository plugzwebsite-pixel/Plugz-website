"""Render the platform user manual to PDF.

For Lisa, Rachel and Ethan, who are not technical and have been given plenty of
detail they did not ask for. Short sentences, no jargon, and every screen
explained in one line. Source text lives beside this in user-manual.md; keep the
two in step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph

from pdf_style import S, bullets, datatable, header_footer, panel, rule

LABEL = "Pluggz · using the platform"
DATE = "1 September 2026"


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Using Pluggz",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Using Pluggz", S["title"]))
    s.append(Paragraph("A short guide to the whole platform", S["sub"]))

    s.append(panel([
        Paragraph("What Pluggz does, in one paragraph", S["h3"]),
        Paragraph(
            "A creator posts a link to a product they like. Someone taps it, lands on "
            "the brand's own website, and buys. The brand tells Pluggz that the sale "
            "happened. Pluggz works out the commission, waits until the order can no "
            "longer be returned, invoices the brand, and pays the creator their share. "
            "You do not have to watch any of it happen.", S["body"]),
    ]))

    # ------------------------------------------------------- one sale
    s.append(Paragraph("The journey of one sale", S["h2"]))
    s.extend(bullets([
        "<b>A creator shares their link.</b> Every creator has their own page, and "
        "every product on it has its own link.",
        "<b>A shopper taps it</b> and lands on the brand's website, on that product.",
        "<b>They buy.</b> The brand's shop tells Pluggz, usually within a minute.",
        "<b>Pluggz splits the commission</b> between the creator and Pluggz, using the "
        "rate agreed with that brand.",
        "<b>The sale waits</b> until the brand's returns window has passed, so nothing "
        "is paid out on an order that comes back.",
        "<b>Pluggz invoices the brand</b> for the commission.",
        "<b>The brand pays</b>, and the sale is marked settled.",
        "<b>The creator is paid</b> on the 1st or the 15th, whichever comes first.",
    ]))
    s.append(Paragraph(
        "The last five of those happen on their own.", S["muted"]))

    s.extend(rule())

    # ------------------------------------------------------- logins
    s.append(Paragraph("Three kinds of login", S["h2"]))
    s.append(datatable([
        ["Who", "What they see"],
        ["<b>You</b>",
         "Everything. Creators, brands, products, money, and the settings behind it all"],
        ["<b>A creator</b>",
         "Their own page, their own links, what they have earned, and how to get paid"],
        ["<b>A brand</b>",
         "Their own performance and invoices, and nothing about anybody else"],
    ], widths=[32 * mm, 134 * mm]))
    s.append(Paragraph(
        "A brand can never see another brand's figures, and a creator can never see "
        "another creator's earnings. That is not a setting you have to remember to "
        "switch on.", S["muted"]))

    # ------------------------------------------------------- what you do
    s.append(Paragraph("What you actually do", S["h2"]))
    s.append(Paragraph("Most days, nothing. These are the things that need you.", S["muted"]))
    s.extend(bullets([
        "<b>Approving a creator.</b> Someone applies, you look at them, you approve or "
        "decline. Approving does not put them on the homepage; that is a separate "
        "decision on the Homepage screen.",
        "<b>Adding a brand.</b> Fill in the form, including the commission rate and how "
        "long their returns window is. When you save, Pluggz gives you either a small "
        "piece of code or a key and a secret, depending on what their shop runs on. "
        "Send that to the brand and they install it. That is how their sales reach us.",
        "<b>Adding a product.</b> Paste the address of the product page. Pluggz reads "
        "the name, price and picture from it.",
        "<b>Setting the rate.</b> Each brand has its own commission rate, split between "
        "the creator and Pluggz automatically.",
        "<b>Recording a payment that did not come through Stripe.</b> If a brand pays "
        "you by bank transfer, open Brand invoices and record it with the bank "
        "reference. That releases the creators behind that invoice to be paid.",
    ]))
    s.append(Paragraph(
        "Everything else, including chasing what brands owe and paying the creators, "
        "happens without being asked.", S["muted"]))

    s.extend(rule())

    # ------------------------------------------------------- screens
    s.append(Paragraph("Where to find things", S["h2"]))
    s.append(datatable([
        ["Screen", "What it is for"],
        ["Approvals", "Creators waiting to be approved or declined"],
        ["Add creator", "Add one creator yourself and send them an invite"],
        ["Import creators", "Add many at once from a spreadsheet"],
        ["Shoppers", "Everyone who has signed up to shop, and their marketing consent"],
        ["Brands", "Every brand, and the form to add a new one"],
        ["Brand credentials", "Reissue a brand's tracking key if they lose it"],
        ["Creator videos", "Videos waiting to be approved before they appear"],
        ["Homepage", "Choose which creators and products appear on the front page"],
        ["Campaigns", "Group creators and products into a sponsored collection"],
        ["Categories", "Add, rename, reorder and hide the categories shoppers browse"],
        ["Brand enquiries", "Brands who have contacted you through the site"],
        ["Analytics", "Traffic, sales and how the platform is performing"],
        ["Product clicks", "Which products are being clicked, and by whom"],
        ["Rates and terms", "Commission rates, and seasonal returns windows"],
        ["Record sales", "Upload a sales report from a brand"],
        ["Brand invoices", "What is ready to bill, and what has been paid"],
        ["Money", "The whole financial picture in one place"],
        ["Payouts", "What each creator is owed and what has been sent"],
        ["Disputes", "Sales somebody has queried"],
    ], widths=[38 * mm, 128 * mm]))

    s.extend(rule())

    # ------------------------------------------------------- money
    s.append(Paragraph("The Money screen", S["h2"]))
    s.append(Paragraph(
        "This is the one worth learning. It shows three flows, and each shows both "
        "what has moved and what has not.", S["muted"]))
    s.extend(bullets([
        "<b>In, from the brands.</b> What they have paid, what has been invoiced and "
        "not yet paid, and what has been earned but not yet billed.",
        "<b>Out, to the creators.</b> What has been paid to them, and what is owed on "
        "the next run.",
        "<b>Pluggz's own share.</b> What the company has earned, how much has reached "
        "the company bank account, and how much is still on its way.",
    ]))
    s.append(Paragraph(
        "Each figure sits beside its unfinished half deliberately. A screen that only "
        "showed money received would look healthy while a brand had quietly stopped "
        "paying.", S["body"]))

    # ------------------------------------------------------- payouts
    s.append(Paragraph("How creators get paid", S["h2"]))
    s.append(Paragraph(
        "A creator sets this up once, themselves. They open <b>Payouts</b> on their own "
        "dashboard and press <b>Set up payouts</b>, which takes them to Stripe.",
        S["body"]))
    s.append(panel([
        Paragraph(
            "They enter their name, address, date of birth and bank details <b>on "
            "Stripe's pages, not on Pluggz</b>. We never see those details and never "
            "store them. That is the whole reason for using Stripe: a platform that "
            "never sees a bank account cannot lose one.", S["body"]),
    ]))
    s.append(Paragraph(
        "After that they are paid automatically on the 1st and the 15th, for any sale "
        "whose brand has settled. If Stripe is not ready to pay somebody, the payout is "
        "held rather than sent, and the reason is written next to their name on the "
        "Payouts screen.", S["body"]))

    s.extend(rule())

    # ------------------------------------------------------- trouble
    s.append(Paragraph("If something looks wrong", S["h2"]))
    s.extend(bullets([
        "<b>A creator says they have not been paid.</b> Open Payouts and find them. "
        "Either their sales are still waiting for the brand to settle, or Stripe is "
        "waiting for a document from them. The reason is on the screen.",
        "<b>A brand says they have not had an invoice.</b> Open Brand invoices. If they "
        "are not listed as ready to bill, their sales are still inside their returns "
        "window.",
        "<b>A product looks wrong on the site.</b> Tell us what you were looking at and "
        "what you expected. A screenshot and the address in the browser bar is enough.",
        "<b>Nothing has changed for several days.</b> Tell us. We can see straight away "
        "whether the overnight jobs have been running.",
    ]))

    doc.build(s, onFirstPage=header_footer(LABEL, DATE),
              onLaterPages=header_footer(LABEL, DATE))
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-User-Manual.pdf")
