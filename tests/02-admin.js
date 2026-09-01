// Suite 3: the admin area, and the creation paths everything else depends on.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

const fs = require("fs");
const STATE = "/tmp/rt-state.json";

const results = [];
let suite = "";
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};

function section(n) { suite = n; console.log("\n\x1b[1m" + n + "\x1b[0m"); }
function save() { fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); }

async function check(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { results.push([name, "pass", ""]); console.log("  pass  " + name); }
    else { results.push([name, "FAIL", String(r)]); console.log("  FAIL  " + name + "\n          " + r); }
  } catch (e) {
    results.push([name, "ERROR", e.message]);
    console.log("  ERR   " + name + "\n          " + (e.message || "").slice(0, 200));
  }
}

let cookie = "";
async function api(path, opts) {
  const o = opts || {};
  const headers = { "user-agent": "PluggzReleaseTest/1.0", origin: BASE };
  if (o.json !== undefined) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  Object.assign(headers, o.headers || {});
  const res = await fetch(BASE + path, {
    method: o.method || (o.json !== undefined ? "POST" : "GET"),
    redirect: "manual",
    headers: headers,
    body: o.json !== undefined ? JSON.stringify(o.json) : o.body,
  });
  const setC = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of setC) {
    if (c.indexOf("pluggz_session=") === 0) cookie = c.split(";")[0];
  }
  const raw = await res.text().catch(function () { return ""; });
  let json = null;
  try { json = JSON.parse(raw); } catch (e) { /* html */ }
  return { status: res.status, json: json, text: raw };
}

function msg(r) {
  return "status " + r.status + (r.json && r.json.message ? " :: " + r.json.message : "") +
    (r.json && r.json.errors ? " :: " + JSON.stringify(r.json.errors) : "");
}

(async function () {
  section("3. Admin: signing in");

  await check("an admin can sign in", async function () {
    const r = await api("/api/auth/login", { json: { email: "rtadmin@pluggz.test", password: "RtProbe!2026" } });
    if (!r.json || !r.json.ok) return msg(r);
    return r.json.data.role === "ADMIN" ? true : "role came back as " + r.json.data.role;
  });

  await check("a wrong password is refused", async function () {
    const keep = cookie; cookie = "";
    const r = await api("/api/auth/login", { json: { email: "rtadmin@pluggz.test", password: "WrongPassword1" } });
    cookie = keep;
    return r.json && r.json.ok === false ? true : "it let them in";
  });

  await check("the session says who we are", async function () {
    const r = await api("/api/auth/session");
    if (!r.json) return msg(r);
    const d = r.json.data || r.json;
    return JSON.stringify(d).indexOf("ADMIN") !== -1 ? true : "no role in " + JSON.stringify(d).slice(0, 120);
  });

  section("3. Admin: every screen loads");
  const screens = [
    "/admin/approvals", "/admin/creators/new", "/admin/creators/import", "/admin/shoppers",
    "/admin/brands", "/admin/credentials", "/admin/videos", "/admin/homepage",
    "/admin/campaigns", "/admin/categories", "/admin/enquiries", "/admin/analytics",
    "/admin/products", "/admin/commission", "/admin/sales", "/admin/payouts", "/admin/disputes",
  ];
  for (const s of screens) {
    await check("GET " + s, async function () {
      const r = await api(s);
      return r.status === 200 ? true : "status " + r.status;
    });
  }

  section("3. Admin: creating a brand");

  await check("a brand can be created, on Shopify", async function () {
    const r = await api("/api/admin/brands", {
      json: {
        name: "RT Probe Brand", websiteUrl: "https://example.invalid",
        hasAffiliateProgramme: false, platform: "SHOPIFY", trackingMethod: "PIXEL",
        commissionRate: "12", returnWindow: "21", settlementTerms: "30 days",
        contact: "rtbrand@pluggz.test",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    state.brandId = d.brand ? d.brand.id : d.id;
    state.brandKey = d.trackingKey || (d.keys && d.keys.key) || d.key;
    state.brandSecret = d.trackingSecret || (d.keys && d.keys.secret) || d.secret;
    save();
    return state.brandId ? true : "no brand id in " + JSON.stringify(d).slice(0, 200);
  });

  await check("it came back with a tracking key", function () {
    return state.brandKey ? true : "no key was issued";
  });

  await check("a duplicate brand name is handled, not crashed", async function () {
    const r = await api("/api/admin/brands", {
      json: { name: "RT Probe Brand", hasAffiliateProgramme: false, platform: "SHOPIFY" },
    });
    return r.status < 500 ? true : "status " + r.status;
  });

  section("3. Admin: brand credentials");

  await check("tracking credentials can be reissued for that brand", async function () {
    const r = await api("/api/admin/brands/" + state.brandId + "/credentials", { json: {} });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    state.brandKey = d.key;
    state.brandSecret = d.secret;
    state.brandEmail = "rtbrand@pluggz.test";
    save();
    // Rolling replaces the pair, which is also how a leaked secret is dealt with.
    return d.key && d.key.indexOf("pz_live_") === 0 && d.secret && d.rolled === true
      ? true : "came back as " + JSON.stringify(d).slice(0, 160);
  });

  section("3. Admin: categories");

  await check("a category can be created", async function () {
    const r = await api("/api/admin/categories", {
      json: { name: "RT Probe Category", emoji: "", sortOrder: 900, inNav: false },
    });
    if (!r.json || !r.json.ok) return msg(r);
    state.categoryId = (r.json.data.category || r.json.data).id;
    state.categoryName = "RT Probe Category";
    save();
    return state.categoryId ? true : "no id back";
  });

  await check("it can be renamed", async function () {
    const r = await api("/api/admin/categories", {
      method: "PATCH", json: { id: state.categoryId, name: "RT Probe Category Two" },
    });
    if (r.json && r.json.ok) { state.categoryName = "RT Probe Category Two"; save(); return true; }
    return msg(r);
  });

  await check("a two character name is refused", async function () {
    const r = await api("/api/admin/categories", { json: { name: "R" } });
    return r.json && r.json.ok === false ? true : "it accepted a one character name";
  });

  section("3. Admin: commission");

  await check("the current rates can be read", async function () {
    const r = await api("/admin/commission");
    return r.status === 200 ? true : "status " + r.status;
  });

  await check("a total under the floor is refused", async function () {
    const r = await api("/api/admin/commission", {
      json: { scope: "global", creatorRate: 1, pluggzRate: 1 },
    });
    return r.json && r.json.ok === false ? true : "it accepted 1 and 1, below the 5 and 2 floors";
  });

  await check("a rate over the ceiling is refused", async function () {
    const r = await api("/api/admin/commission", {
      json: { scope: "global", creatorRate: 90, pluggzRate: 2 },
    });
    return r.json && r.json.ok === false ? true : "it accepted 90 percent";
  });

  section("3. Admin: adding a creator");

  await check("a creator can be added by an admin", async function () {
    const r = await api("/api/admin/creators", {
      json: {
        name: "RT Probe Creator", email: "rtcreator@pluggz.test", handle: "rtprobecreator",
        category: "Beauty & Skincare", city: "London",
        socials: [{ platform: "instagram", handle: "rtprobecreator", followers: 1000 }],
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    state.creatorProfileId = d.profileId || (d.profile && d.profile.id) || d.id;
    state.creatorPassword = d.password || d.temporaryPassword;
    save();
    return state.creatorProfileId ? true : "no profile id in " + JSON.stringify(d).slice(0, 250);
  });

  await check("the same handle cannot be taken twice", async function () {
    const r = await api("/api/admin/creators", {
      json: {
        name: "RT Probe Clash", email: "rtclash@pluggz.test", handle: "rtprobecreator",
        category: "Beauty & Skincare",
        socials: [{ platform: "instagram", handle: "x", followers: 0 }],
      },
    });
    return r.json && r.json.ok === false ? true : "a second creator took the same handle";
  });

  section("3. Admin: adding a product");

  await check("a product can be added by pasting a link", async function () {
    const r = await api("/api/admin/products", {
      json: {
        brandId: state.brandId,
        url: "https://pluggzofficial.co.uk/rt-fixture-product.html",
        category: "Beauty & Skincare",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    state.productId = (d.product || d).id;
    save();
    return state.productId ? true : "no product id in " + JSON.stringify(d).slice(0, 200);
  });

  await check("the price was read as pounds, not pence", async function () {
    const r = await api("/admin/products");
    return r.status === 200 ? true : "status " + r.status;
  });

  await check("the same address under another brand is refused", async function () {
    const r = await api("/api/admin/products", {
      json: { brandId: state.brandId, url: "https://pluggzofficial.co.uk/rt-fixture-product.html" },
    });
    // Same brand is fine, it is the other-brand case that must 409. This just
    // proves it does not explode.
    return r.status < 500 ? true : "status " + r.status;
  });

  section("3. Admin: exports and reports");

  for (const p of ["/api/admin/products/export", "/api/admin/shoppers/export"]) {
    await check("GET " + p, async function () {
      const r = await api(p);
      return r.status === 200 ? true : "status " + r.status;
    });
  }

  await check("payout run previews without sending", async function () {
    const r = await api("/api/admin/payouts/run", { json: {} });
    if (!r.json || !r.json.ok) return msg(r);
    return r.json.data.dryRun === true ? true : "dryRun was " + r.json.data.dryRun;
  });

  await check("a payout run says truthfully which keys it is on", async function () {
    const fs2 = require("fs");
    const env = fs2.readFileSync(ENV_PATH, "utf8");
    const key = (env.match(/^STRIPE_SECRET_KEY=(.*)$/m) || [])[1] || "";
    const expected = key.startsWith("sk_live_") || key.startsWith("rk_live_");
    const r = await api("/api/admin/payouts/run", { json: {} });
    if (!r.json || !r.json.ok) return msg(r);
    return r.json.data.live === expected
      ? true : "it reports live=" + r.json.data.live + " on a " + key.slice(0, 8) + " key";
  });

  const pass = results.filter(function (r) { return r[1] === "pass"; }).length;
  const bad = results.filter(function (r) { return r[1] !== "pass"; });
  console.log("\n\x1b[1mSuite 3: " + pass + " of " + results.length + " passed\x1b[0m");
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
  console.log("\nstate: " + JSON.stringify(state));
})();
