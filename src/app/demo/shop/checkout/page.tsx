import { db } from "@/lib/db";
import { gbpFromPence } from "@/lib/utils";
import { PlaceOrder } from "./place-order";

export const dynamic = "force-dynamic";

/**
 * The brand's checkout.
 *
 * No payment fields, deliberately, not even fake ones. A page that looks like
 * it takes card details is the wrong thing to put on the internet, however it
 * is labelled, and nothing here needs them to make the point.
 */
export default async function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pz?: string }>;
}) {
  const { pz } = await searchParams;

  const product = await db.product.findFirst({
    where: { brand: { slug: "aurora-atelier" } },
    select: { name: true, pricePence: true, imageUrl: true },
  });
  if (!product) return <p className="text-sm">The demo product is missing.</p>;

  const price = product.pricePence ?? 18500;
  const delivery = 0;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-serif text-3xl">Checkout</h1>

        <div className="mt-7 space-y-5">
          <Section title="Contact">
            <Row label="Email" value="shopper@example.com" />
          </Section>

          <Section title="Delivery">
            <Row label="Name" value="A. Shopper" />
            <Row label="Address" value="14 Example Street, Manchester, M1 2AB" />
            <Row label="Method" value="Standard, 2-4 working days · Free" />
          </Section>

          <Section title="Payment">
            <p className="text-sm text-[#78716c]">
              Skipped for the demonstration. No payment details are collected
              anywhere on this page.
            </p>
          </Section>
        </div>

        <PlaceOrder pz={pz ?? null} valuePence={price} />
      </div>

      <aside className="h-fit border border-[#e7e2da] bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#78716c]">
          Your bag
        </h2>
        <div className="mt-4 flex gap-3">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-20 w-16 shrink-0 rounded-sm object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{product.name}</p>
            <p className="text-xs text-[#78716c]">Size 10 · Qty 1</p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-[#e7e2da] pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#78716c]">Subtotal</dt>
            <dd>{gbpFromPence(price)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#78716c]">Delivery</dt>
            <dd>Free</dd>
          </div>
          <div className="flex justify-between border-t border-[#e7e2da] pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{gbpFromPence(price + delivery)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e7e2da] bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#78716c]">
        {title}
      </h2>
      <div className="mt-3 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-[#a8a29e]">{label}</span>
      <span className="text-[#44403c]">{value}</span>
    </div>
  );
}
