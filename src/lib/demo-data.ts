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
  { name: "Women's Fashion", slug: "womens-fashion", emoji: "👗", edits: 5, cover: "https://www.oliverbonas.com/static/media/catalog/product/p/i/pink_jumper_1_.jpg" },
  { name: "Beauty & Skincare", slug: "beauty-skincare", emoji: "✨", edits: 6, cover: "https://www.oliverbonas.com/static/media/catalog/product/1/3/1360257_2.jpg" },
  { name: "Shoes & Accessories", slug: "shoes-accessories", emoji: "👜", edits: 4, cover: "https://www.oliverbonas.com/static/media/catalog/product/1/8/1846300_1.jpg" },
  { name: "Home", slug: "home", emoji: "🕯️", edits: 4, cover: "https://www.oliverbonas.com/static/media/catalog/product/1/3/1393170_2__.jpg" },
  { name: "Fitness & Lifestyle", slug: "fitness-lifestyle", emoji: "🏋️", edits: 5, cover: "https://cdn.media.amplience.net/i/SweatyBetty/sb9218_black.jpg" },
  { name: "Travel / Holiday", slug: "travel-holiday", emoji: "🌴", edits: 5, cover: "https://www.oliverbonas.com/static/media/catalog/product/1/9/1926804_1.jpg" },
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
