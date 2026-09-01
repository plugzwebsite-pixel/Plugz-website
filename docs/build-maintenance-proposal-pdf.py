"""Render the monthly maintenance and support proposal to PDF.

Client-facing, so it uses the brand's own type and colour and matches the other
Pluggz documents. There was no source for the earlier version of this, so it was
rebuilt from its text rather than edited.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph

from pdf_style import S, bullets, datatable, header_footer, panel, rule

LABEL = "Pluggz · maintenance and support"
DATE = "1 September 2026"


def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz: monthly maintenance and support",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Monthly maintenance and support", S["title"]))
    s.append(Paragraph("For the Pluggz platform", S["sub"]))

    s.append(Paragraph(
        "To keep the platform secure, stable and performing well, the following "
        "ongoing maintenance and support plan applies.", S["body"]))

    # ------------------------------------------------------------- the fee
    s.append(Paragraph("The monthly fee", S["h2"]))

    s.append(datatable([
        ["", "Per month", "What it covers"],
        ["Maintenance and support", "<b>£120</b>",
         "Everything listed below, from server monitoring to small feature work"],
        ["Video streaming", "<b>£10 to £12</b>",
         "Cloudflare Stream, charged on how much video is stored and watched, "
         "passed through at cost with no mark up"],
    ], widths=[44 * mm, 28 * mm, 94 * mm]))

    s.append(Paragraph(
        "The streaming figure moves with use rather than being a flat charge, so "
        "it is itemised separately on each invoice rather than folded into the fee.",
        S["muted"]))

    s.extend(rule())

    # ------------------------------------------------------------- included
    s.append(Paragraph("What the maintenance fee includes", S["h2"]))
    s.extend(bullets([
        "Regular server health monitoring",
        "Website and application uptime monitoring",
        "Bug fixes and issue resolution",
        "Security updates and patch management",
        "Performance optimisation",
        "Database maintenance and optimisation",
        "Backup monitoring and recovery support",
        "SSL certificate monitoring",
        "Dependency and package updates",
        "Minor interface improvements",
        "Technical support and troubleshooting",
        "Error log monitoring",
        "Deployment of small feature enhancements, within reasonable scope",
        "A monthly review of the platform's health",
    ]))

    # ------------------------------------------------------------- response
    s.append(Paragraph("Response times", S["h2"]))
    s.append(datatable([
        ["Kind of request", "Response"],
        ["Critical issues", "Within 24 hours"],
        ["Standard support requests", "1 to 3 business days"],
    ], widths=[60 * mm, 106 * mm]))

    s.extend(rule())

    # ------------------------------------------------------------- excluded
    s.append(Paragraph("What it does not include", S["h2"]))
    s.extend(bullets([
        "Development of major new features",
        "Large interface redesigns",
        "Third party subscription costs",
        "Infrastructure or hosting charges",
        "Major architectural changes",
        "Mobile application development",
    ]))
    s.append(Paragraph(
        "Anything beyond routine maintenance is quoted separately once the "
        "requirement has been discussed, so nothing arrives on an invoice "
        "unexpectedly.", S["muted"]))

    # ------------------------------------------------------------- benefits
    s.append(Paragraph("What it gives you", S["h2"]))
    s.extend(bullets([
        "A stable and secure platform",
        "Faster resolution when something goes wrong",
        "Better performance and reliability",
        "Less downtime",
        "Continuous technical support",
        "Problems found and fixed before they are noticed",
    ]))

    s.extend(rule())

    s.append(panel([
        Paragraph("In summary", S["h3"]),
        Paragraph(
            "<b>£120 per month</b> for maintenance and support, plus <b>£10 to £12 "
            "per month</b> for video streaming at cost. The streaming line is "
            "itemised separately and moves with actual use.", S["body"]),
    ]))

    doc.build(s, onFirstPage=header_footer(LABEL, DATE),
              onLaterPages=header_footer(LABEL, DATE))
    print("wrote", path)


if __name__ == "__main__":
    build("docs/Pluggz-Maintenance-Proposal.pdf")
