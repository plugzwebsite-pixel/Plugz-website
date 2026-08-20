import type { SaleSource } from "@prisma/client";
import { Badge } from "@/components/ui/primitives";

/**
 * How a sale reached us, said plainly on screen.
 *
 * This exists for one row in one column, and it earns its place: a sale
 * reported by a browser pixel and a sale signed by a brand's server look
 * identical in a table, and only one of them can be trusted. Someone approving
 * a payout needs to be able to see the difference without asking anybody.
 *
 * The wording is deliberately about trust rather than about plumbing. "Pixel"
 * means nothing to the person doing the paying; "unverified" tells them what
 * to do about it.
 */
const LABELS: Record<SaleSource, { text: string; tone: "green" | "amber" | "neutral"; title: string }> = {
  POSTBACK: {
    text: "Verified",
    tone: "green",
    title: "Signed by the brand's own server. The value cannot have been altered.",
  },
  PIXEL: {
    text: "Unverified",
    tone: "amber",
    title:
      "Reported by a pixel in the shopper's browser, where the value can be edited. Check it against the brand's own orders before paying commission.",
  },
  CSV: {
    text: "From a report",
    tone: "neutral",
    title: "Loaded from a report the brand sent us.",
  },
  MANUAL: {
    text: "Entered by hand",
    tone: "neutral",
    title: "Entered by an administrator.",
  },
};

export function SaleSourceLabel({ source }: { source: SaleSource }) {
  const label = LABELS[source] ?? LABELS.MANUAL;
  return (
    <span title={label.title}>
      <Badge tone={label.tone}>{label.text}</Badge>
    </span>
  );
}
