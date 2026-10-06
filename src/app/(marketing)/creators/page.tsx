import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import {
  publiclyVisibleCreator,
  type CreatorCardData,
} from "@/lib/queries";
import { CreatorsDirectory } from "./creators-directory";

export const metadata: Metadata = {
  title: "Creators",
  description:
    "Browse every creator on Pluggz. Follow their storefronts and shop the products they genuinely recommend.",
};

/**
 * The public creators directory. Until now the homepage showed a handful of
 * featured faces and /creators was a 404, so there was no way to browse
 * everyone. Featured creators lead, then the rest alphabetically.
 */
export default async function CreatorsPage() {
  const rows = await db.creatorProfile.findMany({
    // The same visibility rule as the homepage and storefronts: approved is
    // not enough on its own, an admin-added profile stays invisible until the
    // creator logs in and releases it.
    where: publiclyVisibleCreator,
    select: {
      handle: true,
      category: true,
      city: true,
      bio: true,
      avatarUrl: true,
      featured: true,
      user: { select: { name: true } },
      socials: { select: { followers: true } },
    },
    orderBy: [{ featured: "desc" }, { user: { name: "asc" } }],
  });

  const creators: CreatorCardData[] = rows.map((row) => ({
    name: row.user.name,
    handle: row.handle,
    tag: row.bio ?? row.city ?? row.category,
    category: row.category,
    followers: row.socials.reduce((sum, s) => sum + s.followers, 0),
    avatarUrl: row.avatarUrl,
    trending: false,
  }));

  return (
    <Container size="wide" className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <Eyebrow>The Pluggz collective</Eyebrow>
        <h1 className="mt-3 font-display text-4xl font-semibold text-text-strong sm:text-5xl">
          Creators
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-muted">
          Every creator on Pluggz, in one place. Browse their storefronts and
          shop the products they genuinely recommend.
        </p>
      </div>
      <CreatorsDirectory creators={creators} />
    </Container>
  );
}
