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
  /**
   * Cover photograph. These are the brands' own product shots, taken from
   * listings already live on the site, so the tile shows something real rather
   * than an approximation of it — and they arrive at 1600x2000 or better, which
   * is the size this tile actually renders at. Unset falls back to drawn
   * artwork.
   *
   * Pick something taller than it is wide. The tile is 4:5, so a square shot
   * loses a fifth of the subject off each edge and a landscape banner gets
   * scaled up until it is soft.
   */
  cover?: string;
  /** Optional hover-to-play clip; drops in once real category videos exist. */
  video?: string;
};

export const CATEGORY_NAV: Category[] = [
  { name: "Women's Fashion", slug: "womens-fashion", emoji: "👗", cover: "https://clubllondon.com/cdn/shop/files/CL13639600206_1.jpg?v=1770423231&width=2000" },
  { name: "Beauty & Skincare", slug: "beauty-skincare", emoji: "✨", cover: "https://images.beautybay.com/eoaaqxyywn6o/BFBB1136F_1.jpg_s3.lmb_g5vod/c7e8edd0170a6ba75bbef8c2cb8dc69b/BFBB1136F_1.jpg" },
  { name: "Shoes & Accessories", slug: "shoes-accessories", emoji: "👜", cover: "https://www.barbour.com/dw/image/v2/blcl_prd/on/demandware.static/-/Sites-master-catalog/default/dwf17e871f/images/LRF0091TN10/LRF0091TN10_01front.jpg?sw=1500&q=70&strip=false" },
  { name: "Home", slug: "home", emoji: "🕯️", cover: "https://chloejadehome.com/cdn/shop/files/39_cb810163-85f5-47ef-9bdd-b1b3684c2698.png?v=1760700787&width=1920" },
  { name: "Fitness & Lifestyle", slug: "fitness-lifestyle", emoji: "🏋️", cover: "https://media.johnlewiscontent.com/i/JohnLewis/014247239" },
  { name: "Travel / Holiday", slug: "travel-holiday", emoji: "🌴", cover: "https://bondisands.co.uk/cdn/shop/files/DESKTOP-WEB-PDP-SPEC-PNG-PRODUCT-IMAGE-988x1296px_3_328ac8bd-0301-46ad-b441-7e5e1b3598f7.png?v=1782186737&width=988" },
  { name: "Festival Edit", slug: "festival-edit", emoji: "🎪", cover: "https://the-mabel.com/cdn/shop/files/violet-crystal-mirror-mini-dress-high-neck-short-sleeve-disco-party-dress-10.jpg?v=1777563884&width=1920" },
  { name: "Cocktail Edit", slug: "cocktail-edit", emoji: "🍸", cover: "https://clubllondon.com/cdn/shop/files/CL13516100206_1.jpg?v=1770380484&width=2000" },
  { name: "Day at the Races", slug: "day-at-the-races", emoji: "🏇", cover: "https://www.hollandcooper.com/cdn/shop/files/AimeeSleevelessShirtDress_LightBlueChambray__1.jpg?v=1777388019" },
  { name: "Christmas Edit", slug: "christmas-edit", emoji: "🎄", cover: "https://hrd-live.cdn.scayle.cloud/images/3d3067abd06ac4158b4ba5109d499e43.jpg?quality=75" },
  { name: "Mini Edit", slug: "mini-edit", emoji: "🧸", cover: "https://ellaandjo.co.uk/cdn/shop/files/10_1968208f-8443-4066-b013-9a37dddffcda.png?v=1773677788&width=1024" },
  { name: "New You", slug: "new-you", emoji: "💫", cover: "https://cdn.shopify.com/s/files/1/0259/5448/4284/products/SKIMS-SHAPEWEAR-BD-BRF-3370-ONX.jpg?v=1742584261" },
  { name: "IT Girl Edit", slug: "it-girl-edit", emoji: "💅", cover: "https://www.nakeddresses.com/cdn/shop/files/MultiDarkNude_ASHLEYlauren_4755_Lira_Mini_Dress.jpg?crop=top&height=1500&v=1767974125&width=1200" },
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
