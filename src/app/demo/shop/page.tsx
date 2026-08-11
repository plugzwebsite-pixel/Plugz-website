import Link from "next/link";
import { db } from "@/lib/db";
import { SmartImage } from "@/components/ui/smart-image";
import { gbpFromPence } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The brand's product page, as a shopper arriving from a Pluggz link sees it.
 *
 * The only thing that matters here is the `pz` parameter in the URL: this is
 * step one of what a brand has to do, and it is where most integrations fail.
 * Keep it, carry it to the order, and send it back. The panel makes that
 * visible so a brand can see exactly what they are being asked to hold on to.
 */
export default async function DemoShopPage({
  searchParams,
}: {
  searchParams: Promise<{ pz?: string; ref?: string }>;
}) {
  const { pz, ref } = await searchParams;

  const product = await db.product.findFirst({
    where: { brand: { slug: "aurora-atelier" } },
    select: { name: true, description: true, imageUrl: true, pricePence: true },
  });

  if (!product) {
    return <p className="text-sm">The demo product is missing. Re-seed it and try again.</p>;
  }

  const query = new URLSearchParams();
  if (pz) query.set("pz", pz);
  if (ref) query.set("ref", ref);

  return (
    <div className="grid gap-10 md:grid-cols-2">
      {product.imageUrl && (
        <SmartImage
          src={product.imageUrl}
          alt={product.name}
          width={800}
          height={1000}
          className="w-full rounded-sm object-cover"
        />
      )}

      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#9c9289]">
          Aurora Atelier
        </p>
        <h1 className="mt-2 font-serif text-3xl">{product.name}</h1>
        <p className="mt-3 text-2xl">
          {product.pricePence !== null ? gbpFromPence(product.pricePence) : ""}
        </p>
        <p className="mt-5 leading-relaxed text-[#57534e]">{product.description}</p>

        <div className="mt-6 flex gap-2">
          {["6", "8", "10", "12", "14"].map((s) => (
            <span
              key={s}
              className="grid h-10 w-10 place-items-center border border-[#d6cec2] text-sm"
            >
              {s}
            </span>
          ))}
        </div>

        <Link
          href={`/demo/shop/checkout?${query.toString()}`}
          className="mt-7 block w-full bg-[#1c1917] py-4 text-center text-sm font-medium tracking-wide text-[#faf8f5] transition-opacity hover:opacity-90"
        >
          ADD TO BAG
        </Link>

        {pz ? (
          <div className="mt-8 rounded-sm border border-[#cfe3d4] bg-[#f1f8f2] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6b45]">
              Arrived from Pluggz
            </p>
            <p className="mt-1 text-sm text-[#3f6f52]">
              This shopper came from a creator&apos;s link. The reference below is
              in the page URL — the brand keeps it through checkout and sends it
              back with the order.
            </p>
            <code className="mt-2 block break-all rounded-sm bg-white px-2 py-1.5 font-mono text-xs text-[#2f6b45]">
              pz={pz}
            </code>
          </div>
        ) : (
          <div className="mt-8 rounded-sm border border-[#e7dcc4] bg-[#fdf8ec] p-4 text-sm text-[#7a6a45]">
            <p className="font-medium">No Pluggz reference on this visit.</p>
            <p className="mt-1">
              You&apos;ve opened the shop directly. Start from a creator&apos;s
              product page instead and the reference will be attached — that is
              what makes the sale attributable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
