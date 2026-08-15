"""Render the Pluggz deployment status document to PDF.

Client-facing, so it uses the brand's own type and colour rather than the
ReportLab defaults.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

from pdf_style import S, GREEN, PANEL, RULE, bullets, datatable, header_footer, panel, rule

def build(path):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Pluggz Deployment Status and Next Steps",
        author="Pluggz development",
    )
    s = []

    s.append(Paragraph("Deployment status &amp; next steps", S["title"]))
    s.append(Paragraph(
        "Pluggz platform &middot; prepared for Lisa and Rachel &middot; 5 August 2026",
        S["sub"]))

    s.append(panel([
        Paragraph("Where things stand", S["h3"]),
        Paragraph(
            "The platform is built, deployed to its production server and tested end to end. "
            "The affiliate tracking engine, the part everything else depends on, is "
            "live and recording real clicks. Creator sign-up, storefronts, product pages and the "
            "admin tools are all working against the live database.",
            S["body"]),
        Paragraph(
            "<b>One step remains, and it sits with you:</b> the domain nameservers need changing at "
            "GoDaddy. Until that happens the site runs on its server address rather than "
            "pluggzofficial.co.uk. Everything else is ready and waiting for it.",
            S["body"]),
    ]))

    # ---------------------------------------------------------------- live
    s.append(Paragraph("What is live and tested", S["h2"]))
    s.append(Paragraph(
        "Each item below has been verified on the production server, not just in development.",
        S["muted"]))

    s.append(datatable([
        ["", "Verified"],
        ["<b>Affiliate tracking engine</b><br/>"
         "Pluggz generates and tracks its own links, independent of any third-party network.",
         "A shopper click was followed from an Instagram referrer through to the brand's site. "
         "The click was recorded with its source, and the attribution cookie set for the brand's "
         "30-day window."],
        ["<b>Links survive a brand change</b><br/>"
         "Creators can publish links today, before affiliate deals are signed.",
         "A link's destination was switched from a placeholder to a live affiliate URL. The "
         "short code stayed the same and its click history was preserved, so anything "
         "already shared to social keeps working."],
        ["<b>Shared product catalogue</b><br/>"
         "Two creators plugging the same item share one product record.",
         "Two creators added the same product. One catalogue entry was created, each with their "
         "own review page, and each appears on the other's page under &lsquo;also plugged by&rsquo;."],
        ["<b>Creator sign-up and approval</b>",
         "Application, admin review, approve/decline and email verification all run against the "
         "live database. The approval queue now links straight to each applicant's social "
         "profiles so follower counts can be checked before approving."],
        ["<b>Creator consent</b><br/>"
         "Creators added by an admin must release their own profile.",
         "An admin-created profile stays invisible (no storefront, no search result, no "
         "dashboard) until the creator signs in and accepts the Creator Terms. Their "
         "acceptance is recorded with a timestamp and version."],
        ["<b>Adding products</b>",
         "Pasting a brand's product link pulls the title, image, description and price, builds "
         "the product page and generates the tracking link automatically."],
        ["<b>Bulk creator import</b>",
         "A spreadsheet of creators can be imported in one go. It is checked first and shows "
         "exactly what will happen before anything is created or any invite is sent."],
        ["<b>Dashboards</b>",
         "Creator and admin dashboards read live figures from the tracking engine. Nothing on "
         "them is a placeholder."],
        ["<b>Email</b>",
         "Verification and invite emails send and deliver through the live mail provider."],
    ], [62 * mm, 103 * mm]))

    s.append(Spacer(1, 6))
    s.append(Paragraph(
        "The server itself is a UK-based machine in Portsmouth, with the database and cache "
        "reachable only from the server, automatic security updates, brute-force protection, "
        "key-only administrative access and a nightly database backup kept for two weeks.",
        S["muted"]))

    # ------------------------------------------------------- next steps
    s.append(Paragraph("Next steps: what we need from you", S["h2"]))

    s.append(Paragraph("1. Change the nameservers at GoDaddy <i>(Rachel)</i>", S["h3"]))
    s.append(Paragraph(
        "Both domains are registered with GoDaddy. For each one: "
        "<b>My Products &rarr; the domain &rarr; DNS &rarr; Nameservers &rarr; Change &rarr; "
        "&ldquo;I'll use my own nameservers&rdquo;</b>, replace both entries, save.",
        S["body"]))

    s.append(datatable([
        ["Domain", "Replace the nameservers with"],
        ["<b>pluggzofficial.co.uk</b><br/><font color='#6B6660'>the main site</font>",
         "<font face='Courier-Bold'>merlin.ns.cloudflare.com</font><br/>"
         "<font face='Courier-Bold'>paityn.ns.cloudflare.com</font>"],
        ["<b>pluggzofficial.com</b><br/><font color='#6B6660'>redirects to the .co.uk</font>",
         "<font face='Courier-Bold'>algin.ns.cloudflare.com</font><br/>"
         "<font face='Courier-Bold'>sonia.ns.cloudflare.com</font>"],
    ], [62 * mm, 103 * mm]))

    s.append(Spacer(1, 7))
    s.append(panel([
        Paragraph(
            "<b>The two pairs are different.</b> <font face='Courier-Bold'>merlin</font>/"
            "<font face='Courier-Bold'>paityn</font> belong on the .co.uk and "
            "<font face='Courier-Bold'>algin</font>/<font face='Courier-Bold'>sonia</font> on "
            "the .com. Swapping them stops both from working.",
            S["body"]),
        Paragraph(
            "Nothing else at GoDaddy needs touching. Your Google Workspace email on "
            "pluggzofficial.co.uk has already been copied across and keeps working throughout "
            "the change. We have checked DNSSEC is switched off on both domains, so there is no "
            "risk of either going dark during the switch.",
            S["muted"]),
    ], bg=colors.HexColor("#FFF4F9"), border=colors.HexColor("#F5C9DF")))

    s.append(Paragraph("2. Confirm the primary domain <i>(Lisa / Rachel)</i>", S["h3"]))
    s.append(Paragraph(
        "We have set <b>pluggzofficial.co.uk</b> as the main site, with the .com redirecting to "
        "it. That follows your own email, and a creator link reading pluggzofficial.co.uk "
        "matches the address the invitation came from, which is what makes a link feel safe to "
        "click. Please confirm, because the domain is written into every creator link and "
        "changing it later breaks links already shared.",
        S["body"]))

    s.append(Paragraph("3. Send creators' details for the first cohort <i>(Rachel)</i>", S["h3"]))
    s.append(Paragraph(
        "A spreadsheet with name, email, handle, category, city and follower counts per platform "
        "can be imported in one go rather than added one at a time. Every creator receives an "
        "invite to set their own password and release their profile.",
        S["body"]))

    # ------------------------------------------------------ what follows
    s.append(Paragraph("What happens once the nameservers change", S["h2"]))
    s.append(Paragraph(
        "DNS takes anywhere from fifteen minutes to a few hours to propagate. Once it has, we "
        "complete the following the same day, with no further input needed from you:",
        S["body"]))
    s.extend(bullets([
        "SSL certificates on both domains, so the site loads with the padlock",
        "Cloudflare's CDN and DDoS protection switched on in front of the site",
        "The .com set to redirect to the .co.uk, so search ranking isn't split between them",
        "Email authentication (SPF, DKIM and DMARC) configured",
        "Platform email moved from its temporary address to hello@pluggzofficial.co.uk",
    ]))

    s.extend(rule(8, 6))
    s.append(Paragraph(
        "Prepared by the Pluggz development team. Questions on any of the above are welcome "
        "particularly the domain confirmation, which is the one item that has to be "
        "settled before creators start sharing links.",
        S["foot"]))

    draw = header_footer("PLUGGZ · Deployment status", "5 August 2026")
    doc.build(s, onFirstPage=draw, onLaterPages=draw)
    print(f"written: {path}")


if __name__ == "__main__":
    build("docs/Pluggz-Deployment-Status.pdf")
