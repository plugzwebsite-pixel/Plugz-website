import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const TERMS_VERSION = "2026-07-01";

async function hash(pw) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  // --- Admin (Lisa & Rachel share the single launch admin role) ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@plugz.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "PlugzAdmin!2026";
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
  const creatorEmail = "freya@plugz.com";
  const existing = await db.user.findUnique({ where: { email: creatorEmail } });
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

  const counts = {
    users: await db.user.count(),
    creators: await db.creatorProfile.count(),
    pending: await db.creatorProfile.count({ where: { status: "PENDING" } }),
  };
  console.log("Seed complete:", counts);
  console.log(`Admin login:   ${adminEmail} / ${adminPassword}`);
  console.log(`Creator login: ${creatorEmail} / Creator!2026`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
