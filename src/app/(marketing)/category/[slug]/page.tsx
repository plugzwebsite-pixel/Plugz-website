import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { ProductCard } from "@/components/marketing/cards";
import { Reveal } from "@/components/ui/reveal";
import { Aurora } from "@/components/marketing/aurora";
import { Pill } from "@/components/ui/primitives";
import { SponsorBanner } from "@/components/marketing/sponsor-banner";
import { categoryBySlug, publicCategories } from "@/lib/categories";
import { getProductsByCategory } from "@/lib/queries";

// Served from cache and refreshed in the background. Shoppers arriving from a
// creator's post get a static page rather than a database round trip, and new
// products appear within the window below.
export const revalidate = 120;

/**
 * Prerender the categories that exist at build time. A category added later
 * still renders on demand and is picked up on the next revalidate, so the team
 * never has to wait for a deploy to publish one.
 */
export async function generateStaticParams() {
  return (await publicCategories()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await categoryBySlug(slug);
  return { title: cat ? cat.name : "Category" };
}

const filters = ["Trending", "New in", "Under £50", "Editor's picks", "Most plugged"];

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await categoryBySlug(slug);
  if (!cat) notFound();

  const products = await getProductsByCategory(cat.name);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <Aurora intensity="soft" className="opacity-70" />
        <Container className="relative py-16">
          <Reveal>
            <Eyebrow>Lifestyle edit</Eyebrow>
            <h1 className="mt-3 flex items-center gap-3 font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold text-text-strong">
              <span className="text-4xl">{cat.emoji}</span> {cat.name}
            </h1>
            <p className="mt-3 max-w-xl text-text-muted">
              {products.length > 0 &&
                `${products.length} curated ${products.length === 1 ? "edit" : "edits"} · `}
              the products UK creators are actually plugging in{" "}
              {cat.name.toLowerCase()}.
            </p>
          </Reveal>
        </Container>
      </section>

      {cat.banner && <SponsorBanner banner={cat.banner} category={cat.name} />}

      <Container className="py-10">
        <div className="flex flex-wrap gap-2.5">
          {filters.map((f, i) => (
            <Pill key={f} active={i === 0}>
              {f}
            </Pill>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="mt-10 rounded-md border border-dashed border-border py-20 text-center text-text-faint">
            Nothing plugged in {cat.name.toLowerCase()} yet. Check back soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={`${p.creatorHandle}-${p.slug}`} index={i % 4}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
