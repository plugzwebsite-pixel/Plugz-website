import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";

/**
 * A category's sponsor placement.
 *
 * Labelled rather than dropped in unmarked: a paid placement that reads as
 * editorial is the thing the ASA takes issue with, and a shopper who cannot
 * tell the difference is being misled. The wording is the team's, the label is
 * not optional.
 */
export function SponsorBanner({
  banner,
  category,
}: {
  banner: { imageUrl: string; href: string | null; label: string | null };
  category: string;
}) {
  const image = (
    <SmartImage
      src={banner.imageUrl}
      alt={banner.label ?? `${category} sponsor`}
      width={1400}
      height={300}
      sizes="(max-width: 1024px) 100vw, 1200px"
      className="h-full w-full object-cover"
    />
  );

  return (
    <aside
      aria-label={`Sponsored placement in ${category}`}
      className="border-b border-border bg-bg-elev"
    >
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-text-faint">
          {banner.label ? `Ad · ${banner.label}` : "Advertisement"}
        </p>

        <div className="overflow-hidden rounded-md border border-border">
          {banner.href ? (
            <Link
              href={banner.href}
              // A paid outbound link, so tell search engines it is bought and
              // do not hand the sponsor our referrer.
              rel="sponsored noopener nofollow"
              target="_blank"
              referrerPolicy="no-referrer"
              className="block transition-opacity hover:opacity-95"
            >
              {image}
            </Link>
          ) : (
            image
          )}
        </div>
      </div>
    </aside>
  );
}
