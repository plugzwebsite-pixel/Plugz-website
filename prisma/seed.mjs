import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TERMS_VERSION = "2026-07-01";

async function hash(pw) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  // --- Admin (Lisa & Rachel share the single launch admin role) ---
  // No default password. A fallback here is how a password that lives in the
  // repository ends up being the live admin login on a public site.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@pluggz.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is not set. Set it in .env before seeding. The " +
        "admin account must never be created with a password from source control."
    );
  }
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Lisa & Rachel",
      role: "ADMIN",
      emailVerified: new Date(),
      passwordHash: await hash(adminPassword),
    },
  });

  // --- Demo approved creator (for logging into the creator dashboard) ---
  const creatorEmail = "freya@pluggz.com";
  // Guard on the handle as well as the email: a database seeded before the
  // Plugz -> Pluggz rename still holds this profile under the old address.
  const existing =
    (await db.user.findUnique({ where: { email: creatorEmail } })) ??
    (await db.creatorProfile.findUnique({ where: { handle: "freyasinclair" } }));
  if (!existing) {
    await db.user.create({
      data: {
        email: creatorEmail,
        name: "Freya Sinclair",
        role: "CREATOR",
        emailVerified: new Date(),
        passwordHash: await hash("Creator!2026"),
        creatorProfile: {
          create: {
            handle: "freyasinclair",
            category: "Women's Fashion",
            city: "London",
            bio: "High-street, styled sharp.",
            status: "APPROVED",
            source: "SELF_SERVE",
            termsVersion: TERMS_VERSION,
            termsAcceptedAt: new Date(),
            profileReleasedAt: new Date(),
            socials: {
              create: [
                { platform: "instagram", handle: "freyasinclair", followers: 342000 },
                { platform: "tiktok", handle: "freyastyles", followers: 128000 },
              ],
            },
          },
        },
      },
    });
  }

  // --- Pending applications powering the admin approval queue ---
  const pending = [
    { name: "Georgia Bennett", handle: "georgiabee", category: "Beauty & Skincare", city: "London", ig: 42000, tt: 88000, yt: 12000 },
    { name: "Harry Osei", handle: "harryoseifit", category: "Fitness & Lifestyle", city: "Leeds", ig: 61000, tt: 120000, yt: 34000 },
    { name: "Mia Ferguson", handle: "miaferg", category: "Women's Fashion", city: "Manchester", ig: 150000, tt: 70000, yt: 8000 },
    { name: "Zara Ahmed", handle: "zarastyles", category: "Home", city: "Bristol", ig: 23000, tt: 12000, yt: 4000 },
    { name: "Callum Wright", handle: "callumtravels", category: "Travel / Holiday", city: "Cardiff", ig: 210000, tt: 95000, yt: 61000 },
    { name: "Ruby Nolan", handle: "rubynolan", category: "Shoes & Accessories", city: "Glasgow", ig: 34000, tt: 56000, yt: 2000 },
  ];

  for (const [i, p] of pending.entries()) {
    const email = `${p.handle}@example.com`;
    const found = await db.user.findUnique({ where: { email } });
    if (found) continue;
    await db.user.create({
      data: {
        email,
        name: p.name,
        role: "CREATOR",
        passwordHash: await hash(`Pending!${i}2026`),
        creatorProfile: {
          create: {
            handle: p.handle,
            category: p.category,
            city: p.city,
            status: "PENDING",
            source: "SELF_SERVE",
            termsVersion: TERMS_VERSION,
            termsAcceptedAt: new Date(),
            socials: {
              create: [
                { platform: "instagram", handle: p.handle, followers: p.ig },
                { platform: "tiktok", handle: p.handle, followers: p.tt },
                { platform: "youtube", handle: p.handle, followers: p.yt },
              ],
            },
          },
        },
      },
    });
  }

  await seedCatalogue();

  const counts = {
    users: await db.user.count(),
    creators: await db.creatorProfile.count(),
    pending: await db.creatorProfile.count({ where: { status: "PENDING" } }),
    brands: await db.brand.count(),
    products: await db.product.count(),
    listings: await db.creatorProduct.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`Admin login:   ${adminEmail} / ${adminPassword}`);
  console.log(`Creator login: ${creatorEmail} / Creator!2026`);
}

// ---------------------------------------------------------------------------
// Launch catalogue.
//
// These are placeholder creators and products so the site reads as a real shop
// before Lisa and Rachel load the first cohort. Every row is tagged
// `seeded: true` on the brand so the whole lot can be removed in one query once
// real content lands: db.brand.deleteMany({ where: { seeded: true } }) cascades
// through products, listings and their tracking links.
// ---------------------------------------------------------------------------

const DEMO_CREATORS = [
  { name: "Freya Sinclair", handle: "freyasinclair", bio: "High-street, styled sharp.", category: "Women's Fashion", city: "London", ig: 342000, tt: 128000 },
  { name: "Nadia Rahman", handle: "nadiarahman", bio: "GRWM & lip-oil obsessed.", category: "Beauty & Skincare", city: "Birmingham", ig: 512000, tt: 240000 },
  { name: "Jordan Reid", handle: "jordanreid", bio: "Everyday gold & loafers.", category: "Shoes & Accessories", city: "London", ig: 118000, tt: 46000 },
  { name: "Priya Kaur", handle: "priyakaur", bio: "Calm interiors & the reset.", category: "Home", city: "Leicester", ig: 96000, tt: 31000 },
  { name: "Tommy Fields", handle: "tommyfields", bio: "Strength & everyday kit.", category: "Fitness & Lifestyle", city: "Manchester", ig: 210000, tt: 88000 },
  { name: "Chloe Ferreira", handle: "chloeferreira", bio: "City breaks & long-hauls.", category: "Travel / Holiday", city: "London", ig: 456000, tt: 190000 },
  { name: "Aisha Nasser", handle: "aishanasser", bio: "7-step skincare & the glow.", category: "Beauty & Skincare", city: "London", ig: 128000, tt: 64000 },
  { name: "Elle Thompson", handle: "ellethompson", bio: "Slip dresses & staples.", category: "Women's Fashion", city: "Brighton", ig: 174000, tt: 52000 },
  { name: "Sophie Clarke", handle: "sophieclarke", bio: "Boutique stays, packed light.", category: "Travel / Holiday", city: "Bath", ig: 890000, tt: 410000 },
  { name: "Marcus Hale", handle: "marcushale", bio: "The finishing details.", category: "Shoes & Accessories", city: "Glasgow", ig: 64000, tt: 22000 },
  { name: "Dev Sharma", handle: "devsharma", bio: "5k plans & recovery.", category: "Fitness & Lifestyle", city: "Leeds", ig: 88000, tt: 37000 },
  { name: "Isla Murray", handle: "islamurray", bio: "Cosy corners & candles.", category: "Home", city: "Edinburgh", ig: 72000, tt: 26000 },
];

const DEMO_PRODUCTS = [
  { name: "Linen-blend holiday co-ord", brand: "Verano", host: "verano.co.uk", price: 6800, creator: "freyasinclair", category: "Women's Fashion", clicks: 2400 , review: "Packed this for Lisbon and wore it three days running. Doesn't crease in a suitcase." },
  { name: "Wide-leg denim", brand: "Shein", host: "shein.co.uk", price: 2900, creator: "freyasinclair", category: "Women's Fashion", clicks: 3200 , review: "The rise is the whole thing. Sizing runs generous, I took one down." },
  { name: "Vitamin C brightening serum", brand: "Lumen Skin", host: "lumenskin.co.uk", price: 3800, creator: "aishanasser", category: "Beauty & Skincare", clicks: 4100 , review: "Six weeks in and the pigmentation round my jaw has genuinely faded. Slots under SPF with no pilling." },
  { name: "Peptide glow moisturiser", brand: "Aura Rituals", host: "aurarituals.co.uk", price: 4200, creator: "aishanasser", category: "Beauty & Skincare", clicks: 2600 , review: "The one I reach for on a tired skin day. Cushiony, not greasy." },
  { name: "Satin slip midi dress", brand: "Halcyon London", host: "halcyonlondon.co.uk", price: 5200, creator: "ellethompson", category: "Women's Fashion", clicks: 1900 , review: "Wedding guest, dinner, Christmas Day. It does all three." },
  { name: "Oversized tailored blazer", brand: "North Row", host: "northrow.co.uk", price: 9500, creator: "freyasinclair", category: "Women's Fashion", clicks: 1400 , review: "Worth the money. The shoulder is properly structured, not a boxy sack." },
  { name: "Ribbed knit lounge set", brand: "Marlowe & Co", host: "marloweandco.co.uk", price: 4400, creator: "priyakaur", category: "Home", clicks: 1100 , review: "What I actually live in on a Sunday. Washes without bobbling." },
  { name: "Everyday gold hoops", brand: "Aurate", host: "aurate.co.uk", price: 12000, creator: "jordanreid", category: "Shoes & Accessories", clicks: 2000 , review: "Haven't taken these out in four months, including showers and the gym." },
  { name: "Trainer recovery slides", brand: "Kova", host: "kova.co.uk", price: 3400, creator: "tommyfields", category: "Fitness & Lifestyle", clicks: 1600 , review: "Straight on after a session. My feet stopped aching on rest days." },
  { name: "Carry-on cabin case", brand: "Vomo", host: "vomo.co.uk", price: 14500, creator: "sophieclarke", category: "Travel / Holiday", clicks: 3000 , review: "Fits every budget airline sizer I've thrown at it. The wheels are silent." },
  { name: "Soy travel candle", brand: "Ember & Oak", host: "emberandoak.co.uk", price: 2800, creator: "islamurray", category: "Home", clicks: 900 , review: "Burns clean for about 20 hours. The tin travels without leaking wax." },
  { name: "Compression run leggings", brand: "Stride", host: "stride.co.uk", price: 5800, creator: "devsharma", category: "Fitness & Lifestyle", clicks: 1200 , review: "Held up over a half marathon with no slipping or see-through moments." },
  // A second creator on an existing product, so the shared master record and
  // the "also plugged by" strip have something real to show.
  { name: "Vitamin C brightening serum", brand: "Lumen Skin", host: "lumenskin.co.uk", price: 3800, creator: "nadiarahman", category: "Beauty & Skincare", clicks: 1500 , review: "I use this before makeup and everything sits better. A little goes a long way." },
  { name: "Carry-on cabin case", brand: "Vomo", host: "vomo.co.uk", price: 14500, creator: "chloeferreira", category: "Travel / Holiday", clicks: 800 , review: "Four long-hauls this year, still looks new. Worth it if you fly a lot." },
];

const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
function shortCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function slugify(input) {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function seedCatalogue() {
  await db.platformSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Creators
  for (const c of DEMO_CREATORS) {
    const email = `${c.handle}@pluggz.com`;
    const existingProfile = await db.creatorProfile.findUnique({
      where: { handle: c.handle },
    });
    if (existingProfile) {
      await db.creatorProfile.update({
        where: { handle: c.handle },
        data: { avatarUrl: `/images/creators/${c.handle}.jpg`, bio: c.bio },
      });
      continue;
    }
    await db.user.create({
      data: {
        email,
        name: c.name,
        role: "CREATOR",
        emailVerified: new Date(),
        passwordHash: await hash("Creator!2026"),
        creatorProfile: {
          create: {
            handle: c.handle,
            category: c.category,
            city: c.city,
            bio: c.bio,
            status: "APPROVED",
            source: "SELF_SERVE",
            termsVersion: TERMS_VERSION,
            termsAcceptedAt: new Date(),
            profileReleasedAt: new Date(),
            socials: {
              create: [
                { platform: "instagram", handle: c.handle, url: `https://instagram.com/${c.handle}`, followers: c.ig },
                { platform: "tiktok", handle: c.handle, url: `https://tiktok.com/@${c.handle}`, followers: c.tt },
              ],
            },
          },
        },
      },
    });
  }

  // Brands, master products, and each creator's listing
  for (const p of DEMO_PRODUCTS) {
    const brandSlug = slugify(p.brand);
    const brand = await db.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: {
        name: p.brand,
        slug: brandSlug,
        websiteUrl: `https://${p.host}`,
        status: "ACTIVE",
        hasAffiliateProgramme: false,
        trackingMethod: "DISCOUNT_CODE",
        commissionRate: 11.0,
        returnWindowDays: 30,
        settlementDays: 30,
        seeded: true,
      },
    });

    const sourceUrl = `https://${p.host}/products/${slugify(p.name)}`;
    const product = await db.product.upsert({
      where: { sourceUrl },
      update: {},
      create: {
        brandId: brand.id,
        name: p.name,
        slug: slugify(p.name),
        imageUrl: p.image,
        pricePence: p.price,
        category: p.category,
        sourceUrl,
      },
    });

    const profile = await db.creatorProfile.findUnique({
      where: { handle: p.creator },
    });
    if (!profile) continue;

    const already = await db.creatorProduct.findUnique({
      where: {
        profileId_productId: { profileId: profile.id, productId: product.id },
      },
    });
    if (already) {
      await db.creatorProduct.update({
        where: { id: already.id },
        data: { review: p.review ?? null, rating: 5 },
      });
      continue;
    }

    await db.creatorProduct.create({
      data: {
        profileId: profile.id,
        productId: product.id,
        slug: slugify(p.name),
        review: p.review ?? null,
        rating: 5,
        trackingLink: {
          create: {
            code: shortCode(),
            // Placeholder until the brand deal is agreed. The code stays the
            // same when the real affiliate URL replaces this.
            destinationUrl: sourceUrl,
            isPlaceholder: true,
            discountCode: `PLUGGZ-${p.creator.slice(0, 6).toUpperCase()}`,
          },
        },
      },
    });
  }

  await seedClicks();
}

/**
 * Real Click rows, spread over the last 14 days.
 *
 * The counter on TrackingLink is derived from these rather than written
 * directly: a dashboard showing "7 click-throughs" next to a product badged
 * "4.1K clicks" is obviously broken, and every figure in the admin analytics
 * (totals, the daily chart, unique shoppers, repeat rate) is computed from
 * this table.
 */
async function seedClicks() {
  const existing = await db.click.count();
  if (existing > 200) return; // already populated

  const links = await db.trackingLink.findMany({
    select: { id: true, creatorProduct: { select: { product: { select: { name: true } } } } },
  });
  if (links.length === 0) return;

  // Build shoppers first, then their clicks. Roughly a quarter come back on a
  // second or third day; the rest visit once. Assigning sessions at random
  // instead would put every session on nearly every day and report a 100%
  // repeat rate, which reads as a broken metric.
  const rows = [];
  let session = 0;

  const weightedLink = () => {
    // Skewed so a handful of products clearly lead the "most clicked" list.
    const i = Math.floor(Math.pow(Math.random(), 2) * links.length);
    return links[Math.min(i, links.length - 1)];
  };

  const referrer = () => {
    const r = Math.random();
    if (r < 0.55) return "https://l.instagram.com/";
    if (r < 0.8) return "https://www.tiktok.com/";
    return null;
  };

  for (let s = 0; s < 620; s++) {
    const sessionId = `seed-session-${session++}`;
    const returning = Math.random() < 0.25;
    const dayCount = returning ? 2 + Math.floor(Math.random() * 2) : 1;

    const days = new Set();
    while (days.size < dayCount) {
      // Recent-weighted: more traffic in the last few days than a fortnight ago.
      days.add(Math.floor(Math.sqrt(Math.random()) * 14));
    }

    for (const daysAgo of days) {
      // Anchor to midnight of that date first. Offsetting each click
      // independently would push some of them across a date boundary, so a
      // one-day visitor would be counted as a returning one.
      const midnight = new Date(Date.now() - daysAgo * 86_400_000);
      midnight.setUTCHours(0, 0, 0, 0);

      const perDay = 1 + Math.floor(Math.random() * 3);
      for (let c = 0; c < perDay; c++) {
        rows.push({
          trackingLinkId: weightedLink().id,
          sessionId,
          // Daytime-ish, and always within the same calendar day.
          clickedAt: new Date(
            midnight.getTime() + (7 + Math.random() * 15) * 3_600_000
          ),
          referrer: referrer(),
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        });
      }
    }
  }

  await db.click.createMany({ data: rows });

  // Bring each counter in line with the rows just written.
  for (const link of links) {
    const count = await db.click.count({ where: { trackingLinkId: link.id } });
    await db.trackingLink.update({
      where: { id: link.id },
      data: { clickCount: count },
    });
  }
  console.log(`Seeded ${rows.length} clicks across ${links.length} links`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
