// Suites 11 and 12: every remaining feature, admin side then public side.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

const fs = require("fs");
const { execSync } = require("child_process");

const results = [];
function section(n) { console.log("\n\x1b[1m" + n + "\x1b[0m"); }
async function check(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { results.push([name, "pass", ""]); console.log("  pass  " + name); }
    else { results.push([name, "FAIL", String(r)]); console.log("  FAIL  " + name + "\n          " + r); }
  } catch (e) {
    results.push([name, "ERROR", e.message]);
    console.log("  ERR   " + name + "\n          " + (e.message || "").slice(0, 220));
  }
}

const ENV = fs.readFileSync(ENV_PATH, "utf8");
const envOf = (k) => (ENV.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1] || "";
const DB = envOf("DATABASE_URL").replace(/"/g, "").replace(/[?&]schema=[^&]*/, "");
const CRON = envOf("CRON_SECRET");

function sql(q) {
  return execSync("psql " + JSON.stringify(DB) + " -tAc " + JSON.stringify(q), { encoding: "utf8" }).trim();
}
function runSql(text) {
  const p = "/tmp/rt11-" + Date.now() + ".sql";
  fs.writeFileSync(p, text);
  try { return execSync("psql " + JSON.stringify(DB) + " -q -v ON_ERROR_STOP=1 -f " + p, { encoding: "utf8" }); }
  finally { fs.unlinkSync(p); }
}

const jars = {};
async function req(role, path, opts) {
  const o = opts || {};
  const headers = { origin: BASE, "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/131" };
  if (o.json !== undefined) headers["content-type"] = "application/json";
  if (jars[role]) headers.cookie = jars[role];
  Object.assign(headers, o.headers || {});
  const res = await fetch(BASE + path, {
    method: o.method || (o.json !== undefined || o.body ? "POST" : "GET"),
    redirect: "manual", headers,
    body: o.json !== undefined ? JSON.stringify(o.json) : o.body,
  });
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
    if (c.indexOf("pluggz_session=") === 0) jars[role] = c.split(";")[0];
  }
  const raw = await res.text();
  let json = null; try { json = JSON.parse(raw); } catch (e) {}
  return { status: res.status, json, raw };
}
const msg = (r) => "status " + r.status + (r.json && r.json.message ? " :: " + r.json.message : "") +
  (r.json && r.json.errors ? " " + JSON.stringify(r.json.errors) : "");

(async function () {
  section("11. Fixtures");

  await check("an admin, a brand, a creator, a listing and a cleared sale", function () {
    // Required directly rather than shelled out to: one process, and no
    // quoting to get wrong.
    const hash = require(APP + "/node_modules/bcryptjs").hashSync("RtProbe!2026", 10);
    runSql(`
      insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
      values ('rt11_admin','rtadmin@pluggz.test','${hash}','RT Admin','ADMIN',now(),now(),now())
      on conflict (email) do update set "passwordHash" = excluded."passwordHash", role='ADMIN';

      insert into "Brand" (id,name,slug,status,platform,"trackingMethod","commissionRate","returnWindowDays","settlementDays","contactEmail","createdAt","updatedAt")
      values ('rt11_b','RT Feature Brand','rt-feature-brand','ACTIVE','OTHER','DISCOUNT_CODE',12.00,21,30,'rt11@pluggz.test',now(),now())
      on conflict (id) do nothing;

      insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
      values ('rt11_cu','rt11creator@pluggz.test','x','RT Feature Creator','CREATOR',now(),now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProfile" (id,"userId",handle,category,status,source,"profileReleasedAt","createdAt","updatedAt")
      values ('rt11_c','rt11_cu','rt11creator','Beauty & Skincare','APPROVED','ADMIN_ADDED',now(),now(),now())
      on conflict (id) do nothing;

      insert into "Product" (id,"brandId",name,slug,"sourceUrl",category,"pricePence","imageUrl","createdAt","updatedAt")
      values ('rt11_p','rt11_b','RT Feature Product','rt-feature-product','https://example.invalid/rt11','Beauty & Skincare',10000,'https://example.invalid/i.jpg',now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProduct" (id,"profileId","productId",slug,live,"createdAt","updatedAt")
      values ('rt11_cp','rt11_c','rt11_p','rt-feature-product',true,now(),now())
      on conflict (id) do nothing;

      insert into "TrackingLink" (id,"creatorProductId",code,"destinationUrl","isPlaceholder","clickCount","createdAt","updatedAt")
      values ('rt11_tl','rt11_cp','rt11code','https://example.invalid/rt11',false,0,now(),now())
      on conflict (id) do nothing;

      insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","verifiedAt","createdAt","updatedAt")
      values ('rt11_s','rt11_cp','RT11-1',10000,'APPROVED','VERIFIED','CSV',7.00,5.00,700,500,now()-interval '40 days',now()-interval '19 days',now()-interval '19 days',now(),now())
      on conflict (id) do nothing;
    `);
    return sql("select count(*) from \"Sale\" where id='rt11_s';") === "1" ? true : "fixtures missing";
  });

  await check("sign in as admin", async function () {
    const r = await req("admin", "/api/auth/login", { json: { email: "rtadmin@pluggz.test", password: "RtProbe!2026" } });
    return r.json && r.json.ok ? true : msg(r);
  });

  section("11. Discount codes");

  await check("a discount code can be put on a listing", async function () {
    const r = await req("admin", "/api/admin/tracking-links", {
      method: "PATCH", json: { listingId: "rt11_cp", discountCode: "RT11-TEN" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select \"discountCode\" from \"TrackingLink\" where id='rt11_tl';") === "RT11-TEN"
      ? true : "not stored";
  });

  await check("a code with characters a checkout would reject is refused", async function () {
    const r = await req("admin", "/api/admin/tracking-links", {
      method: "PATCH", json: { listingId: "rt11_cp", discountCode: "<script>" },
    });
    return r.json && r.json.ok === false ? true : "it accepted markup as a code";
  });

  await check("an empty code clears it", async function () {
    const r = await req("admin", "/api/admin/tracking-links", {
      method: "PATCH", json: { listingId: "rt11_cp", discountCode: "" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const v = sql("select coalesce(\"discountCode\",'(null)') from \"TrackingLink\" where id='rt11_tl';");
    return v === "(null)" || v === "" ? true : "still reads " + v;
  });

  section("11. Seasonal return windows");

  let windowId = null;
  await check("a seasonal override can be added", async function () {
    const r = await req("admin", "/api/admin/return-windows", {
      json: {
        brandId: "rt11_b", label: "RT Christmas", days: 45,
        startsAt: "2026-12-01", endsAt: "2027-01-15",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    windowId = sql("select id from \"ReturnWindowOverride\" where \"brandId\"='rt11_b' limit 1;");
    return windowId.length > 3 ? true : "nothing was stored";
  });

  await check("one shorter than the brand's own is refused, so it can only ever delay", async function () {
    const r = await req("admin", "/api/admin/return-windows", {
      json: {
        brandId: "rt11_b", label: "RT Too Short", days: 5,
        startsAt: "2026-11-01", endsAt: "2026-11-30",
      },
    });
    return r.json && r.json.ok === false ? true : "it accepted a window shorter than the brand's 21 days";
  });

  await check("an end date before the start is refused", async function () {
    const r = await req("admin", "/api/admin/return-windows", {
      json: {
        brandId: "rt11_b", label: "RT Backwards", days: 40,
        startsAt: "2026-12-01", endsAt: "2026-11-01",
      },
    });
    return r.json && r.json.ok === false ? true : "it accepted a backwards window";
  });

  await check("it can be removed again", async function () {
    // The id goes in the address, not the body.
    const r = await req("admin", "/api/admin/return-windows?id=" + windowId, { method: "DELETE" });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select count(*) from \"ReturnWindowOverride\" where id='" + windowId + "';") === "0"
      ? true : "still there";
  });

  section("11. Commission overrides");

  await check("a per brand override can be set", async function () {
    const r = await req("admin", "/api/admin/commission", {
      json: { scope: "override", brandId: "rt11_b", creatorRate: 6, pluggzRate: 4, note: "RT test" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select \"creatorRate\" || '/' || \"pluggzRate\" from \"CommissionOverride\" where \"brandId\"='rt11_b';")
      === "6.00/4.00" ? true : "stored wrongly";
  });

  await check("naming both a brand and a creator is refused", async function () {
    const r = await req("admin", "/api/admin/commission", {
      json: { scope: "override", brandId: "rt11_b", creatorProfileId: "rt11_c", creatorRate: 6, pluggzRate: 4 },
    });
    return r.json && r.json.ok === false ? true : "it accepted both at once";
  });

  await check("a creator override overrides the brand's", async function () {
    const r = await req("admin", "/api/admin/commission", {
      json: { scope: "override", creatorProfileId: "rt11_c", creatorRate: 9, pluggzRate: 3 },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select \"creatorRate\" from \"CommissionOverride\" where \"creatorProfileId\"='rt11_c';") === "9.00"
      ? true : "not stored";
  });

  await check("an override can be removed", async function () {
    const id = sql("select id from \"CommissionOverride\" where \"creatorProfileId\"='rt11_c';");
    const r = await req("admin", "/api/admin/commission?id=" + id, { method: "DELETE" });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select count(*) from \"CommissionOverride\" where id='" + id + "';") === "0" ? true : "still there";
  });

  section("11. Disputes");

  let disputeId = null;
  await check("a dispute can be raised against a sale", async function () {
    const r = await req("admin", "/api/admin/disputes", {
      json: { saleId: "rt11_s", reason: "CREATOR_QUERY", detail: "Creator says the amount looks wrong.", raisedBy: "RT Tester" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    disputeId = sql("select id from \"Dispute\" where \"saleId\"='rt11_s' limit 1;");
    return disputeId.length > 3 ? true : "nothing stored";
  });

  await check("a sale with an open dispute is not swept up by the verify job", async function () {
    runSql(`update "Sale" set status='PENDING', stage='PENDING', "verifiesAt" = now() - interval '1 day' where id='rt11_s';`);
    await fetch(BASE + "/api/cron/verify-sales", { method: "POST", headers: { "x-cron-secret": CRON, origin: BASE } });
    const s = sql("select status || '/' || stage from \"Sale\" where id='rt11_s';");
    runSql(`update "Sale" set status='APPROVED', stage='VERIFIED', "verifiedAt"=now() where id='rt11_s';`);
    return s === "PENDING/PENDING" ? true : "it was released to " + s + " despite an open dispute";
  });

  await check("a dispute can be moved on and resolved", async function () {
    const a = await req("admin", "/api/admin/disputes", {
      method: "PATCH", json: { id: disputeId, status: "WITH_BRAND" },
    });
    if (!a.json || !a.json.ok) return msg(a);
    const b = await req("admin", "/api/admin/disputes", {
      method: "PATCH", json: { id: disputeId, status: "RESOLVED", resolution: "Brand confirmed the figure." },
    });
    if (!b.json || !b.json.ok) return msg(b);
    return sql("select status from \"Dispute\" where id='" + disputeId + "';") === "RESOLVED"
      ? true : "status did not stick";
  });

  section("11. Campaigns and sponsored storefronts");

  let campaignId = null;
  await check("a campaign can be created", async function () {
    const r = await req("admin", "/api/admin/campaigns", {
      json: {
        scope: "create", name: "RT Feature Campaign", tagline: "A release test",
        brandId: "rt11_b", startsAt: "2026-09-01", endsAt: "2026-12-31",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    campaignId = sql("select id from \"Campaign\" where name='RT Feature Campaign';");
    return campaignId.length > 3 ? true : "nothing stored";
  });

  await check("a creator and a listing can be put in it", async function () {
    const a = await req("admin", "/api/admin/campaigns", {
      json: { scope: "creator", id: campaignId, profileId: "rt11_c", include: true },
    });
    if (!a.json || !a.json.ok) return msg(a);
    const b = await req("admin", "/api/admin/campaigns", {
      json: { scope: "listing", id: campaignId, listingId: "rt11_cp", include: true },
    });
    if (!b.json || !b.json.ok) return msg(b);
    const n = sql("select count(*) from \"CampaignListing\" where \"campaignId\"='" + campaignId + "';");
    return n === "1" ? true : "listings in the campaign: " + n;
  });

  await check("a draft campaign is not public", async function () {
    const slug = sql("select slug from \"Campaign\" where id='" + campaignId + "';");
    const res = await fetch(BASE + "/campaign/" + slug, { redirect: "manual" });
    return res.status === 404 ? true : "a draft campaign was public, status " + res.status;
  });

  await check("published, it appears and keeps each listing's own tracking link", async function () {
    const r = await req("admin", "/api/admin/campaigns", {
      json: { scope: "update", id: campaignId, status: "LIVE" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const slug = sql("select slug from \"Campaign\" where id='" + campaignId + "';");
    const res = await fetch(BASE + "/campaign/" + slug, { redirect: "manual" });
    if (res.status !== 200) return "status " + res.status;
    const html = await res.text();
    return html.includes("rt11code") || html.includes("rt-feature-product")
      ? true : "the campaign page does not carry the listing";
  });

  section("11. The homepage");

  await check("a piece of homepage copy can be changed", async function () {
    const r = await req("admin", "/api/admin/homepage", {
      json: { scope: "content", values: { heroTitle: "RT release test headline" } },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select count(*) from \"SiteContent\" where key='heroTitle';") === "1" ? true : "not stored";
  });

  await check("a product can be featured and unfeatured", async function () {
    const on = await req("admin", "/api/admin/homepage", {
      json: { scope: "product", listingId: "rt11_cp", featured: true },
    });
    if (!on.json || !on.json.ok) return msg(on);
    if (sql("select featured::text from \"CreatorProduct\" where id='rt11_cp';") !== "true") return "not featured";
    const off = await req("admin", "/api/admin/homepage", {
      json: { scope: "product", listingId: "rt11_cp", featured: false },
    });
    return off.json && off.json.ok &&
      sql("select featured::text from \"CreatorProduct\" where id='rt11_cp';") === "false"
      ? true : "could not unfeature it";
  });

  await check("the homepage refuses a thirteenth featured creator", async function () {
    // Twelve are already featured, which is the cap. Above that the homepage
    // stops being a selection and becomes a catalogue, so the refusal is the
    // behaviour worth testing rather than an obstacle to work around.
    const featured = Number(sql("select count(*) from \"CreatorProfile\" where featured;"));
    const r = await req("admin", "/api/admin/homepage", {
      json: { scope: "creator", profileId: "rt11_c", featured: true },
    });
    if (featured >= 12) {
      return r.status === 409 && sql("select featured::text from \"CreatorProfile\" where id='rt11_c';") === "false"
        ? true : "the cap was not enforced, status " + r.status;
    }
    if (!r.json || !r.json.ok) return msg(r);
    await req("admin", "/api/admin/homepage", { json: { scope: "creator", profileId: "rt11_c", featured: false } });
    return true;
  });

  section("11. Bulk imports");

  await check("a creator import is a dry run until told otherwise", async function () {
    const csv = "name,email,handle,category,city,instagram\n" +
      "RT Import One,rtimport1@pluggz.test,rtimport1,Beauty & Skincare,Leeds,1000\n";
    const r = await req("admin", "/api/admin/creators/import", { json: { csv, commit: false } });
    if (!r.json || !r.json.ok) return msg(r);
    const n = sql("select count(*) from \"User\" where email='rtimport1@pluggz.test';");
    return n === "0" ? true : "a dry run created " + n + " creator(s)";
  });

  await check("committing it creates them", async function () {
    const csv = "name,email,handle,category,city,instagram\n" +
      "RT Import One,rtimport1@pluggz.test,rtimport1,Beauty & Skincare,Leeds,1000\n";
    const r = await req("admin", "/api/admin/creators/import", { json: { csv, commit: true } });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select count(*) from \"User\" where email='rtimport1@pluggz.test';") === "1"
      ? true : "not created";
  });

  await check("importing the same row twice does not duplicate them", async function () {
    const csv = "name,email,handle,category,city,instagram\n" +
      "RT Import One,rtimport1@pluggz.test,rtimport1,Beauty & Skincare,Leeds,1000\n";
    await req("admin", "/api/admin/creators/import", { json: { csv, commit: true } });
    return sql("select count(*) from \"User\" where email='rtimport1@pluggz.test';") === "1"
      ? true : "it created a second";
  });

  await check("a European spreadsheet reads 48,50 as forty eight pounds fifty", async function () {
    // Semicolon separated with a comma decimal, which is how Excel writes a CSV
    // across most of Europe. Read as a thousands separator this becomes 4850.00.
    const csv = "orderref;value;date;handle\nRT-EURO-1;48,50;2026-08-01;rt11creator\n";
    const form = new FormData();
    form.append("file", new File([csv], "euro.csv", { type: "text/csv" }));
    form.append("commit", "false");
    const res = await fetch(BASE + "/api/admin/sales/import", {
      method: "POST", headers: { origin: BASE, cookie: jars.admin }, body: form, redirect: "manual",
    });
    const j = await res.json().catch(() => null);
    if (!j || !j.ok) return "status " + res.status + " " + JSON.stringify(j).slice(0, 160);
    const row = (j.data.results || [])[0];
    return row && row.value === "£48.50"
      ? true : "it read the value as " + (row ? row.value : "nothing");
  });

  await check("a file with no value column is refused by name", async function () {
    const csv = "orderref;date\nRT-NOVAL-1;2026-08-01\n";
    const form = new FormData();
    form.append("file", new File([csv], "noval.csv", { type: "text/csv" }));
    form.append("commit", "false");
    const res = await fetch(BASE + "/api/admin/sales/import", {
      method: "POST", headers: { origin: BASE, cookie: jars.admin }, body: form, redirect: "manual",
    });
    const j = await res.json().catch(() => null);
    return j && j.ok === false && /value/i.test(j.message || "")
      ? true : "it was accepted, or refused without saying why";
  });

  // ------------------------------------------------------------------ 12
  section("12. The public side");

  await check("a brand can send an enquiry", async function () {
    const r = await req("anon", "/api/brands/enquiry", {
      json: {
        brand: "RT Enquiry Brand", website: "https://example.invalid",
        contactName: "RT Contact", contactEmail: "rtenquiry@pluggz.test",
        hasAffiliateProgramme: false, categories: "Beauty", message: "A release test enquiry.",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select count(*) from \"BrandEnquiry\" where \"contactEmail\"='rtenquiry@pluggz.test';") === "1"
      ? true : "not stored";
  });

  await check("an enquiry without a real email is refused", async function () {
    const r = await req("anon", "/api/brands/enquiry", {
      json: { brand: "RT Bad", contactName: "RT", contactEmail: "not-an-email", hasAffiliateProgramme: false },
    });
    return r.json && r.json.ok === false ? true : "it accepted a malformed address";
  });

  await check("somebody can join the waitlist", async function () {
    const r = await req("anon", "/api/waitlist", {
      json: { name: "RT Waitlist", email: "rtwait@pluggz.test", handle: "rtwait", interest: "CREATOR" },
    });
    return r.json && r.json.ok ? true : msg(r);
  });

  section("12. The shopper");

  await check("a shopper signs up with marketing on", async function () {
    const r = await req("shopper", "/api/auth/signup/shopper", {
      json: {
        name: "RT Feature Shopper", email: "rtshopper2@pluggz.test", password: "RtShopper!2026",
        city: "York", interests: ["Beauty & Skincare"], marketing: true, acceptTerms: true,
      },
    });
    return r.json && r.json.ok ? true : msg(r);
  });

  await check("they can change their details", async function () {
    await req("shopper", "/api/auth/login", { json: { email: "rtshopper2@pluggz.test", password: "RtShopper!2026" } });
    const r = await req("shopper", "/api/account", {
      method: "PATCH",
      json: { name: "RT Renamed Shopper", city: "Bath", interests: ["Home"], marketing: true },
    });
    if (!r.json || !r.json.ok) return msg(r);
    return sql("select name from \"User\" where email='rtshopper2@pluggz.test';") === "RT Renamed Shopper"
      ? true : "the name did not change";
  });

  await check("withdrawing marketing consent is recorded with a date", async function () {
    const r = await req("shopper", "/api/account", {
      method: "PATCH", json: { name: "RT Renamed Shopper", interests: [], marketing: false },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const row = sql(
      "select \"marketingOptIn\"::text || '|' || (\"marketingOptOutAt\" is not null)::text" +
      " from \"ShopperProfile\" p join \"User\" u on u.id=p.\"userId\" where u.email='rtshopper2@pluggz.test';"
    );
    return /^(f|false)\|(t|true)$/.test(row) ? true : "row reads " + row;
  });

  await check("a wishlist item can be added and removed", async function () {
    const add = await req("shopper", "/api/wishlist", { json: { listingId: "rt11_cp" } });
    if (!add.json || !add.json.ok) return msg(add);
    const res = await fetch(BASE + "/api/wishlist?listingId=rt11_cp", {
      method: "DELETE", headers: { origin: BASE, cookie: jars.shopper }, redirect: "manual",
    });
    const n = sql(
      "select count(*) from \"WishlistItem\" w join \"User\" u on u.id=w.\"userId\"" +
      " where u.email='rtshopper2@pluggz.test';"
    );
    return res.status < 400 && n === "0" ? true : "delete gave " + res.status + ", " + n + " left";
  });

  section("12. Views and video");

  await check("a product view is recorded", async function () {
    const before = sql("select count(*) from \"ProductView\" where \"creatorProductId\"='rt11_cp';");
    await req("anon", "/api/track/view", { json: { listingId: "rt11_cp" } });
    const after = sql("select count(*) from \"ProductView\" where \"creatorProductId\"='rt11_cp';");
    return Number(after) > Number(before) ? true : "nothing was recorded";
  });

  await check("the same visitor viewing again within the hour is not counted twice", async function () {
    const before = sql("select count(*) from \"ProductView\" where \"creatorProductId\"='rt11_cp';");
    for (let i = 0; i < 3; i++) await req("anon", "/api/track/view", { json: { listingId: "rt11_cp" } });
    const after = sql("select count(*) from \"ProductView\" where \"creatorProductId\"='rt11_cp';");
    return before === after ? true : "it went from " + before + " to " + after;
  });

  await check("asking for a video upload fails cleanly, not with a server error", async function () {
    await req("creator2", "/api/auth/login", { json: { email: "rt11creator@pluggz.test", password: "nope" } });
    const r = await req("admin", "/api/creator/videos", { json: { listingId: "rt11_cp" } });
    // An admin has no creator profile, so this must be a clean refusal either
    // way. What matters is that it is never a 500.
    return r.status < 500 ? true : "status " + r.status;
  });

  const pass = results.filter((r) => r[1] === "pass").length;
  const bad = results.filter((r) => r[1] !== "pass");
  console.log("\n\x1b[1mSuites 11 and 12: " + pass + " of " + results.length + " passed\x1b[0m");
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
})();
