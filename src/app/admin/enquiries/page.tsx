import type { Metadata } from "next";
import { Globe, Mail, Network, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Brand enquiries" };

const statusTone: Record<string, "brand" | "cyan" | "green" | "neutral"> = {
  NEW: "brand",
  CONTACTED: "cyan",
  ONBOARDED: "green",
  DECLINED: "neutral",
};

export default async function BrandEnquiriesPage() {
  const enquiries = await db.brandEnquiry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-text-muted">
        Brands who got in touch through the site. The affiliate-programme answer
        tells you which onboarding path they&apos;re on before you even reply:
        a brand already on a network is a different conversation from a direct
        deal.
      </p>

      {enquiries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-20 text-center">
          <p className="text-sm text-text-muted">
            No enquiries yet. They arrive here from{" "}
            <span className="font-medium text-text-strong">/brands</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <div key={e.id} className="rounded-md border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-text-strong">
                      {e.brand}
                    </h3>
                    <Badge tone={statusTone[e.status] ?? "neutral"}>
                      {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                    </Badge>
                    {e.hasAffiliateProgramme ? (
                      <span className="inline-flex items-center gap-1.5 rounded-pill border border-accent-cyan/30 bg-accent-cyan/[0.07] px-3 py-1 text-xs text-text-muted">
                        <Network size={11} /> On a network
                        {e.networkName && ` · ${e.networkName}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-pill border border-brand-pink/30 bg-brand-pink/[0.06] px-3 py-1 text-xs text-text-muted">
                        <Ticket size={11} /> Direct deal
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-text-muted">
                    {e.contactName}
                    {e.contactRole && ` · ${e.contactRole}`}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <a
                      href={`mailto:${e.contactEmail}`}
                      className="inline-flex items-center gap-1.5 text-brand-pink hover:underline"
                    >
                      <Mail size={13} /> {e.contactEmail}
                    </a>
                    {e.website && (
                      <a
                        href={e.website.startsWith("http") ? e.website : `https://${e.website}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-strong"
                      >
                        <Globe size={13} /> {e.website}
                      </a>
                    )}
                  </div>

                  {e.categories && (
                    <p className="mt-2 text-sm text-text-faint">Sells: {e.categories}</p>
                  )}
                  {e.message && (
                    <p className="mt-3 rounded-sm border border-border bg-surface-2/50 p-3 text-sm text-text">
                      {e.message}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-xs text-text-faint">
                  {e.createdAt.toLocaleDateString("en-GB")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
