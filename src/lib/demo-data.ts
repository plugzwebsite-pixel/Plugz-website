/**
 * The lifestyle categories the shopper-facing pages are organised around.
 *
 * Everything else on the site — creators, products, prices, click counts — is
 * read from the database. This file used to carry stand-in arrays of all of
 * that from before the tracking engine existed; they were still referencing
 * brands that have since been deleted, so they have gone.
 */

export type Category = {
  name: string;
  slug: string;
  emoji: string;
  edits: number;
  /**
   * Cover photograph. These are the brands' own product shots, taken from
   * listings already live on the site, so the tile shows something real rather
   * than an approximation of it — and they arrive at 1600x2000 or better, which
   * is the size this tile actually renders at. Unset falls back to drawn
   * artwork.
   */
  cover?: string;
  /** Optional hover-to-play clip; drops in once real category videos exist. */
  video?: string;
};

export const CATEGORY_NAV: Category[] = [
  { name: "Women's Fashion", slug: "womens-fashion", emoji: "👗", edits: 12, cover: "https://clubllondon.com/cdn/shop/files/CL13639600206_1.jpg?v=1770423231&width=2000" },
  { name: "Beauty & Skincare", slug: "beauty-skincare", emoji: "✨", edits: 10, cover: "https://images.beautybay.com/eoaaqxyywn6o/BFBB1136F_1.jpg_s3.lmb_g5vod/c7e8edd0170a6ba75bbef8c2cb8dc69b/BFBB1136F_1.jpg" },
  { name: "Shoes & Accessories", slug: "shoes-accessories", emoji: "👜", edits: 7, cover: "https://media.kurtgeiger.com/product/6137891789/20/large-eagle-sling-40-orange-velvet-kurt-geiger-london-6137891789" },
  { name: "Home", slug: "home", emoji: "🕯️", edits: 5, cover: "https://www.charlesandivy.co.uk/cdn/shop/files/tessaro-186x90-arch-stone.jpg?v=1763470102&width=1920" },
  { name: "Fitness & Lifestyle", slug: "fitness-lifestyle", emoji: "🏋️", edits: 3, cover: "https://media.johnlewiscontent.com/i/JohnLewis/014247239" },
  { name: "Travel / Holiday", slug: "travel-holiday", emoji: "🌴", edits: 4, cover: "https://cdn-revamp.airalo.com/images/acadbcf2-0733-496a-b8db-7f48637ea016.png" },
  { name: "Festival Edit", slug: "festival-edit", emoji: "🎪", edits: 4, cover: "https://the-mabel.com/cdn/shop/files/violet-crystal-mirror-mini-dress-high-neck-short-sleeve-disco-party-dress-10.jpg?v=1777563884&width=1920" },
];

export const TRENDS = [
  "7-step skincare",
  "The holiday edit",
  "GRWM",
  "Gym bag essentials",
  "City break capsule",
  "Autumn layering",
  "The blowout",
  "Everyday gold",
  "Cosy corner",
  "Long-haul comfort",
  "Shop the look",
  "Trend of the week",
  "#PluggzPicks",
  "The reset",
  "Evening wind-down",
  "5k programme",
];
