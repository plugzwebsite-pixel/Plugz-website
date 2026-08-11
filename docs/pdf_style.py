"""Shared look for the client-facing PDFs.

Both documents are read by the client rather than by us, so they use the
brand's own type and colour rather than the ReportLab defaults.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, HRFlowable

PINK = colors.HexColor("#FF2D9B")
ORANGE = colors.HexColor("#FF8A2B")
INK = colors.HexColor("#17131A")
MUTED = colors.HexColor("#6B6660")
FAINT = colors.HexColor("#9C9289")
RULE = colors.HexColor("#E4DED5")
PANEL = colors.HexColor("#FBF7F1")
GREEN = colors.HexColor("#1E8E5A")

styles = getSampleStyleSheet()

S = {
    "title": ParagraphStyle(
        "title", parent=styles["Title"], fontName="Times-Bold",
        fontSize=26, leading=30, textColor=INK, alignment=0, spaceAfter=2,
    ),
    "sub": ParagraphStyle(
        "sub", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10.5, leading=15, textColor=MUTED, spaceAfter=14,
    ),
    "h2": ParagraphStyle(
        "h2", parent=styles["Heading2"], fontName="Times-Bold",
        fontSize=15, leading=19, textColor=INK, spaceBefore=16, spaceAfter=7,
    ),
    "h3": ParagraphStyle(
        "h3", parent=styles["Heading3"], fontName="Helvetica-Bold",
        fontSize=10.5, leading=14, textColor=INK, spaceBefore=11, spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "body", parent=styles["Normal"], fontName="Helvetica",
        fontSize=9.8, leading=14.5, textColor=INK, spaceAfter=7,
    ),
    "muted": ParagraphStyle(
        "muted", parent=styles["Normal"], fontName="Helvetica",
        fontSize=9, leading=13.5, textColor=MUTED, spaceAfter=6,
    ),
    "bullet": ParagraphStyle(
        "bullet", parent=styles["Normal"], fontName="Helvetica",
        fontSize=9.8, leading=14.5, textColor=INK,
        leftIndent=11, bulletIndent=1, spaceAfter=3.5,
    ),
    "mono": ParagraphStyle(
        "mono", parent=styles["Normal"], fontName="Courier-Bold",
        fontSize=10, leading=15, textColor=INK,
    ),
    # Long code samples need to wrap rather than run off the page.
    "code": ParagraphStyle(
        "code", parent=styles["Normal"], fontName="Courier",
        fontSize=8.2, leading=12, textColor=INK, spaceAfter=4,
    ),
    "cell": ParagraphStyle(
        "cell", parent=styles["Normal"], fontName="Helvetica",
        fontSize=9, leading=12.5, textColor=INK,
    ),
    "cellhead": ParagraphStyle(
        "cellhead", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=8.2, leading=11, textColor=FAINT,
    ),
    "foot": ParagraphStyle(
        "foot", parent=styles["Normal"], fontName="Helvetica",
        fontSize=7.8, leading=11, textColor=FAINT,
    ),
}


def rule(space_before=4, space_after=10):
    return [
        Spacer(1, space_before),
        HRFlowable(width="100%", thickness=0.6, color=RULE),
        Spacer(1, space_after),
    ]


def bullets(items, style="bullet"):
    return [Paragraph(t, S[style], bulletText="•") for t in items]


def panel(flowables, bg=PANEL, border=RULE, pad=9):
    t = Table([[flowables]], colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.7, border),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def datatable(rows, widths, head=True):
    data = [[Paragraph(c, S["cellhead" if (head and i == 0) else "cell"])
             for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, hAlign="LEFT")
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
    ]
    if head:
        style.append(("LINEBELOW", (0, 0), (-1, 0), 0.8, colors.HexColor("#CFC7BC")))
    t.setStyle(TableStyle(style))
    return t


def header_footer(label, date):
    """Brand rule along the top, document label and date in the margins."""

    def draw(canvas, doc):
        canvas.saveState()
        w, h = A4
        canvas.setStrokeColor(PINK)
        canvas.setLineWidth(2.4)
        canvas.line(22 * mm, h - 15 * mm, 22 * mm + 26 * mm, h - 15 * mm)
        canvas.setStrokeColor(ORANGE)
        canvas.line(22 * mm + 26 * mm, h - 15 * mm, 22 * mm + 46 * mm, h - 15 * mm)

        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(FAINT)
        canvas.drawRightString(w - 22 * mm, h - 15 * mm - 1, label)
        canvas.drawRightString(w - 22 * mm, 13 * mm, f"Page {doc.page}")
        canvas.drawString(22 * mm, 13 * mm, date)
        canvas.restoreState()

    return draw
