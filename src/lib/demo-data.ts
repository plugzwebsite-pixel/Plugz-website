/**
 * Demo content for the shopper-facing pages and dashboard visualisations.
 * This is presentation seed data for the frontend phase — the real product
 * catalogue and analytics come from the tracking engine in a later phase.
 */

export type Creator = {
  name: string;
  handle: string;
  tag: string;
  category: string;
  followers: number;
  trending?: boolean;
};

export type Product = {
  name: string;
  brand: string;
  price: number;
  creator: string;
  category: string;
  heat: string;
  emoji: string;
  image: string;
};

/** Self-hosted portrait for a demo creator handle. */
export function creatorPhoto(handle: string) {
  return `/images/creators/${handle}.jpg`;
}

export const STATS = [
  { value: "£2.4M", label: "Shopped this month" },
  { value: "62", label: "UK creators live" },
  { value: "38k", label: "Products plugged" },
];

export const IMPACT_STATS = [
  { value: "2.4k", label: "products shopped this week" },
  { value: "62", label: "verified UK creators" },
  { value: "£38k", label: "creator commission paid" },
  { value: "4.9★", label: "average creator rating" },
];

export type Category = {
  name: string;
  slug: string;
  emoji: string;
  edits: number;
  cover: string;
  /** Optional hover-to-play clip; drops in once real category videos exist. */
  video?: string;
};

export const CATEGORY_NAV: Category[] = [
  { name: "Women's Fashion", slug: "womens-fashion", emoji: "👗", edits: 5, cover: "/images/products/p4.jpg" },
  { name: "Beauty & Skincare", slug: "beauty-skincare", emoji: "✨", edits: 6, cover: "/images/products/p3.jpg" },
  { name: "Shoes & Accessories", slug: "shoes-accessories", emoji: "👜", edits: 4, cover: "/images/products/p7.jpg" },
  { name: "Home", slug: "home", emoji: "🕯️", edits: 4, cover: "/images/products/p10.jpg" },
  { name: "Fitness & Lifestyle", slug: "fitness-lifestyle", emoji: "🏋️", edits: 5, cover: "/images/products/p11.jpg" },
  { name: "Travel / Holiday", slug: "travel-holiday", emoji: "🌴", edits: 5, cover: "/images/products/p9.jpg" },
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

export const CREATORS: Creator[] = [
  { name: "Freya Sinclair", handle: "freyasinclair", tag: "High-street, styled sharp", category: "Fashion", followers: 342000, trending: true },
  { name: "Nadia Rahman", handle: "nadiarahman", tag: "GRWM & lip-oil obsessed", category: "Beauty", followers: 512000, trending: true },
  { name: "Jordan Reid", handle: "jordanreid", tag: "Everyday gold & loafers", category: "Shoes", followers: 118000 },
  { name: "Priya Kaur", handle: "priyakaur", tag: "Calm interiors & the reset", category: "Home", followers: 96000 },
  { name: "Tommy Fields", handle: "tommyfields", tag: "Strength & everyday kit", category: "Fitness", followers: 210000, trending: true },
  { name: "Chloe Adeyemi", handle: "chloeadeyemi", tag: "City breaks & long-hauls", category: "Travel", followers: 456000, trending: true },
  { name: "Aisha Bello", handle: "aishabello", tag: "7-step skincare & the glow", category: "Beauty", followers: 128000, trending: true },
  { name: "Elle Thompson", handle: "ellethompson", tag: "Slip dresses & staples", category: "Fashion", followers: 174000 },
  { name: "Sophie Clarke", handle: "sophieclarke", tag: "Boutique stays, packed light", category: "Travel", followers: 890000, trending: true },
  { name: "Marcus Hale", handle: "marcushale", tag: "The finishing details", category: "Shoes", followers: 64000 },
  { name: "Dev Sharma", handle: "devsharma", tag: "5k plans & recovery", category: "Fitness", followers: 88000 },
  { name: "Isla Murray", handle: "islamurray", tag: "Cosy corners & candles", category: "Home", followers: 72000 },
];

export const PRODUCTS: Product[] = [
  { name: "Linen-blend holiday co-ord", brand: "Verano", price: 68, creator: "freyasinclair", category: "Women's Fashion", heat: "2.4k", emoji: "👚", image: "/images/products/p0.jpg" },
  { name: "Wide-leg denim", brand: "Shein", price: 29, creator: "freyasinclair", category: "Women's Fashion", heat: "3.2k", emoji: "👖", image: "/images/products/p1.jpg" },
  { name: "Vitamin C brightening serum", brand: "Lumen Skin", price: 38, creator: "aishabello", category: "Beauty & Skincare", heat: "4.1k", emoji: "🧴", image: "/images/products/p2.jpg" },
  { name: "Peptide glow moisturiser", brand: "Aura Rituals", price: 42, creator: "aishabello", category: "Beauty & Skincare", heat: "2.6k", emoji: "🧴", image: "/images/products/p3.jpg" },
  { name: "Satin slip midi dress", brand: "Halcyon London", price: 52, creator: "ellethompson", category: "Women's Fashion", heat: "1.9k", emoji: "👗", image: "/images/products/p4.jpg" },
  { name: "Oversized tailored blazer", brand: "North Row", price: 95, creator: "freyasinclair", category: "Women's Fashion", heat: "1.4k", emoji: "🧥", image: "/images/products/p5.jpg" },
  { name: "Ribbed knit lounge set", brand: "Marlowe & Co", price: 44, creator: "priyakaur", category: "Home", heat: "1.1k", emoji: "🧦", image: "/images/products/p6.jpg" },
  { name: "Everyday gold hoops", brand: "Aurate", price: 120, creator: "jordanreid", category: "Shoes & Accessories", heat: "2.0k", emoji: "💛", image: "/images/products/p7.jpg" },
  { name: "Trainer recovery slides", brand: "Kova", price: 34, creator: "tommyfields", category: "Fitness & Lifestyle", heat: "1.6k", emoji: "🩴", image: "/images/products/p8.jpg" },
  { name: "Carry-on cabin case", brand: "Vomo", price: 145, creator: "sophieclarke", category: "Travel / Holiday", heat: "3.0k", emoji: "🧳", image: "/images/products/p9.jpg" },
  { name: "Soy travel candle", brand: "Ember & Oak", price: 28, creator: "islamurray", category: "Home", heat: "0.9k", emoji: "🕯️", image: "/images/products/p10.jpg" },
  { name: "Compression run leggings", brand: "Stride", price: 58, creator: "devsharma", category: "Fitness & Lifestyle", heat: "1.2k", emoji: "🩱", image: "/images/products/p11.jpg" },
];

export function creatorByHandle(handle: string) {
  return CREATORS.find((c) => c.handle === handle);
}

export function productsForCreator(handle: string) {
  return PRODUCTS.filter((p) => p.creator === handle);
}

export function productsForCategory(name: string) {
  return PRODUCTS.filter((p) => p.category === name);
}
