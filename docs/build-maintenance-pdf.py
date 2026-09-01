"""Render the maintenance and running costs note to PDF.

For Lisa, Rachel and Ethan. Client-facing, so it uses the brand's own type and
colour rather than the ReportLab defaults. Source text lives beside this in
maintenance.md; keep the two in step.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph

from pdf_style import S, bullets, datatable, header_footer, panel, rule

LABEL = "Pluggz · running the platform"
DATE = "1 September 2026"


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz: running the platform",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Running the platform", S["title"]))
    s.append(Paragraph(
        "What happens on its own, what needs you, and what it costs each month",
        S["sub"]))

    s.append(panel([
        Paragraph("The short version", S["h3"]),
        Paragraph(
            "Money now moves from end to end without anybody remembering to make it "
            "happen. A shopper buys through a creator's link. The brand's shop tells "
            "Pluggz. The sale waits out that brand's returns window. Pluggz invoices "
            "the brand. The brand pays. The creators behind those sales are paid on "
            "the 1st and the 15th. What is left is Pluggz's own share, and Stripe pays "
            "that into the company bank account.", S["body"]),
        Paragraph(
            "Every one of those steps is scheduled or automatic. The only things that "
            "need a person are the ones that genuinely need a decision.", S["body"]),
    ]))

    # ------------------------------------------------------ automatic
    s.append(Paragraph("What happens on its own", S["h2"]))
    s.append(Paragraph(
        "Three jobs run on the server every night, kept separate so a problem with "
        "one cannot stop the others.", S["muted"]))

    s.append(datatable([
        ["Time", "Job", "What it does"],
        ["02:10", "Clear sales",
         "Releases any sale whose returns window has passed, so it becomes billable"],
        ["02:25", "Billing",
         "Raises and sends an invoice to any brand that owes enough, and reconciles "
         "what Stripe has paid into the company bank"],
        ["02:40", "Creator payouts",
         "Pays the creators, but only on the 1st and the 15th"],
    ], widths=[18 * mm, 32 * mm, 116 * mm]))

    s.extend(rule())

    s.extend(bullets([
        "<b>Billing follows one rule.</b> A brand has at most one invoice outstanding "
        "at a time, and the next is raised once that is paid. A brand owing less than "
        "ten pounds is left until it builds up, because an invoice for eighty pence "
        "costs more to process than it collects.",
        "<b>Payouts run on the 1st and the 15th</b>, the cadence the creator dashboard "
        "has always promised. The job runs nightly and decides for itself whether "
        "today counts, so the promise and the schedule cannot drift apart.",
        "<b>A creator Stripe will not pay is held, not skipped quietly.</b> The reason "
        "is written next to their name, and every run asks Stripe again, because Stripe "
        "sometimes finishes verifying somebody days after they applied.",
        "<b>Stripe tells the platform the moment a brand pays</b>, so an invoice settles "
        "itself. If that message is ever missed, the nightly job catches it.",
    ]))

    # ------------------------------------------------------ people
    s.append(Paragraph("What still needs a person", S["h2"]))
    s.append(Paragraph(
        "Four things, and all of them are decisions rather than chores.", S["muted"]))
    s.extend(bullets([
        "<b>Setting a brand's commission rate</b> when it is onboarded. Everything "
        "after that is worked out from it.",
        "<b>Deciding what to do about a failed payout.</b> The platform retries on the "
        "next run and records why it failed. Somebody should look if the same creator "
        "fails twice.",
        "<b>Recording a payment that arrived outside Stripe.</b> If a brand pays by "
        "bank transfer instead, it is recorded with the bank reference on the Brand "
        "invoices screen, which releases the sales exactly as a Stripe payment would.",
        "<b>Approving creators and brands</b>, which is deliberately manual as agreed.",
    ]))
    s.append(Paragraph(
        "Everything else, including chasing what is owed and paying it out, now happens "
        "without being asked.", S["muted"]))

    # ------------------------------------------------------ screens
    s.append(Paragraph("Where to look", S["h2"]))
    s.extend(bullets([
        "<b>Money</b> shows the whole picture in one place: what has come in from "
        "brands and what has not, what has gone out to creators and what is still "
        "owed, and what Pluggz has earned against what has actually reached the "
        "company bank. Each figure sits beside its unfinished half on purpose, so a "
        "brand that has quietly stopped paying is visible rather than hidden behind a "
        "healthy looking total.",
        "<b>Brand invoices</b> shows what is ready to be billed, every invoice raised, "
        "and what has happened to each one.",
    ]))

    # ------------------------------------------------------ cost
    s.append(Paragraph("What it costs each month", S["h2"]))
    s.append(Paragraph(
        "Three of these are ours to run and are covered by the maintenance fee. Two "
        "are charged on what is actually used and are passed through at cost.",
        S["muted"]))

    s.append(datatable([
        ["Item", "How it is charged", "On the invoice"],
        ["Server and hosting",
         "A Contabo cloud server in Portsmouth, paid annually",
         "Covered by the maintenance fee"],
        ["Email (Brevo)",
         "Free tier, 300 messages a day, comfortable at the current size",
         "Nothing at present"],
        ["Cloudflare",
         "Proxy, certificate and protection, on the free plan",
         "Nothing at present"],
        ["Cloudflare Stream",
         "By how much video is stored and how much is watched, so it grows with use",
         "<b>Added to the monthly invoice, itemised at cost</b>"],
        ["Stripe",
         "Per payment and per payout, taken out of the transaction by Stripe",
         "Does not appear on our invoice"],
    ], widths=[34 * mm, 74 * mm, 58 * mm]))

    s.extend(rule())

    s.append(panel([
        Paragraph("Creator video", S["h3"]),
        Paragraph(
            "As agreed, Cloudflare Stream is added to the monthly maintenance invoice "
            "and itemised separately at cost. Nothing is marked up. In the first months "
            "it will be small, because it is charged on minutes and there are few "
            "videos.", S["body"]),
        Paragraph(
            "Video uploads do not work until minutes are bought, so the sooner this "
            "starts the sooner creators can post.", S["body"]),
    ]))

    # ------------------------------------------------------ quiet
    s.append(Paragraph("What is looked after quietly", S["h2"]))
    s.extend(bullets([
        "<b>Backups.</b> The database is dumped every night and fourteen days are kept. "
        "A dump is also taken before any change to the database structure, so a release "
        "can be undone rather than argued about.",
        "<b>Releases.</b> The site is built on a separate copy of itself and only "
        "swapped in once the build has succeeded, so a failed release cannot take the "
        "site down. The previous version is kept and can be put back in seconds.",
        "<b>Security.</b> The server accepts no passwords, only keys, and sits behind "
        "Cloudflare so its real address is not published. Rate limits, forgery checks "
        "and bot filtering are exercised by the test suite before every release.",
        "<b>Bank details.</b> Pluggz never holds them, for creators or for brands. Both "
        "enter them on Stripe's own pages. That is the whole reason for using Stripe "
        "rather than paying by transfer: a platform that never sees a bank account "
        "cannot leak one.",
    ]))

    # ------------------------------------------------------ trouble
    s.append(Paragraph("If something looks wrong", S["h2"]))
    s.extend(bullets([
        "<b>A creator says they have not been paid.</b> Open Payouts. Either their sales "
        "have not been settled by the brand yet, which the Money screen will show, or "
        "Stripe is not ready to pay them and the reason is written next to their name.",
        "<b>A brand says they have not had an invoice.</b> Open Brand invoices. If they "
        "are not listed as ready to bill, their sales are still inside their returns "
        "window. If an invoice was raised but not sent, the brand has no contact email "
        "recorded.",
        "<b>Nothing has moved for several days.</b> That is the sign to tell us, and we "
        "can see immediately whether the nightly jobs ran.",
    ]))

    doc.build(s, onFirstPage=header_footer(LABEL, DATE),
              onLaterPages=header_footer(LABEL, DATE))
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-Running-The-Platform.pdf")
