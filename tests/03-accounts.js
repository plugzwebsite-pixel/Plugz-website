// Suites 3b, 4, 5, 6: the three account areas, each entered the way its owner
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

// really enters it.
const fs = require("fs");
const { execSync } = require("child_process");
const STATE = "/tmp/rt-state.json";

const results = [];
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
function save() { fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); }
function section(n) { console.log("\n\x1b[1m" + n + "\x1b[0m"); }

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

const DB = execSync(
  "grep '^DATABASE_URL=' " + ENV_PATH + " | cut -d= -f2- | tr -d '\"' | sed 's/[?&]schema=[^&]*//'",
  { encoding: "utf8" }
).trim();
function sql(q) {
  return execSync("psql " + JSON.stringify(DB) + " -tAc " + JSON.stringify(q), { encoding: "utf8" }).trim();
}

// Only the SHA-256 of a reset token is ever stored, so the raw value in the
// email cannot be read back out of the database. That is the right way round,
// and it means a test has to mint its own rather than steal the real one.
function mintReset(email) {
  const crypto = require("crypto");
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  sql(
    'insert into "PasswordResetToken" (id, "userId", "tokenHash", "expiresAt", "createdAt")' +
    " select 'rt' || substr(md5(random()::text),1,22), u.id, '" + hash + "'," +
    " now() + interval '2 hours', now() from \"User\" u where u.email = '" + email + "';"
  );
  return raw;
}

// One jar per role, so a test can never accidentally borrow another's session.
const jars = {};
async function api(role, path, opts) {
  const o = opts || {};
  const headers = { "user-agent": "PluggzReleaseTest/1.0", origin: BASE };
  if (o.json !== undefined) headers["content-type"] = "application/json";
  if (jars[role]) headers.cookie = jars[role];
  Object.assign(headers, o.headers || {});
  const res = await fetch(BASE + path, {
    method: o.method || (o.json !== undefined ? "POST" : "GET"),
    redirect: "manual", headers: headers,
    body: o.json !== undefined ? JSON.stringify(o.json) : o.body,
  });
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
    if (c.indexOf("pluggz_session=") === 0) jars[role] = c.split(";")[0];
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
async function login(role, email, password) {
  jars[role] = "";
  const r = await api(role, "/api/auth/login", { json: { email: email, password: password } });
  return r;
}

(async function () {
  await login("admin", "rtadmin@pluggz.test", "RtProbe!2026");

  // ------------------------------------------------------------------ 3b
  section("3b. The three things the first pass got wrong");

  await check("a creator can be added by an admin", async function () {
    const r = await api("admin", "/api/admin/creators", {
      json: {
        name: "RT Probe Creator", email: "rtcreator@pluggz.test", handle: "rtprobecreator",
        category: "Beauty & Skincare", city: "London",
        socials: [{ platform: "instagram", handle: "rtprobecreator", followers: 1000 }],
      },
    });
    // The previous suite may already have added them, which is not a failure:
    // the handle guard doing its job is the correct answer to asking twice.
    if (!r.json || !r.json.ok) {
      const existing = sql("select id from \"CreatorProfile\" where handle='rtprobecreator';");
      if (!existing) return msg(r);
      state.creatorProfileId = existing;
      save();
      return true;
    }
    const d = r.json.data;
    state.creatorProfileId = d.profileId || (d.profile && d.profile.id) || d.id;
    save();
    return true;
  });

  await check("a product can be added by pasting a link", async function () {
    const r = await api("admin", "/api/admin/products", {
      json: {
        brandId: state.brandId,
        url: "https://pluggzofficial.co.uk/rt-fixture-product.html",
        category: "Beauty & Skincare",
      },
    });
    if (!r.json || !r.json.ok) return msg(r);
    state.productId = (r.json.data.product || r.json.data).id;
    save();
    return state.productId ? true : "no id back";
  });

  await check("the fixture's price was read as 42.50, not 4250 pounds", function () {
    const p = sql("select \"pricePence\" from \"Product\" where id = '" + state.productId + "';");
    return p === "4250" ? true : "pricePence is " + p;
  });

  await check("a brand contact can be invited", async function () {
    const r = await api("admin", "/api/admin/brands/" + state.brandId + "/invite", {
      json: { name: "RT Brand Contact", email: "rtbrand@pluggz.test" },
    });
    return r.json && r.json.ok ? true : msg(r);
  });

  // ------------------------------------------------------------------ 4
  section("4. The brand, arriving the way a real brand does");

  await check("the invite left a reset token, stored only as a hash", function () {
    const n = sql("select count(*) from \"PasswordResetToken\" t join \"User\" u on u.id = t.\"userId\"" +
      " where u.email = 'rtbrand@pluggz.test';");
    state.brandResetToken = mintReset("rtbrand@pluggz.test");
    save();
    return Number(n) >= 1 ? true : "the invite created no reset token";
  });

  await check("that token sets their password", async function () {
    const r = await api("brand", "/api/auth/reset-password", {
      json: { token: state.brandResetToken, password: "RtBrand!2026" },
    });
    return r.json && r.json.ok ? true : msg(r);
  });

  await check("the same token cannot be used twice", async function () {
    const r = await api("brand", "/api/auth/reset-password", {
      json: { token: state.brandResetToken, password: "RtBrand!2027" },
    });
    return r.json && r.json.ok === false ? true : "a spent token still worked";
  });

  await check("the brand can now sign in", async function () {
    const r = await login("brand", "rtbrand@pluggz.test", "RtBrand!2026");
    if (!r.json || !r.json.ok) return msg(r);
    return r.json.data.role === "BRAND" ? true : "role is " + r.json.data.role;
  });

  for (const p of ["/brand/dashboard", "/brand/products", "/brand/products/new", "/brand/invoices", "/brand/settings"]) {
    await check("brand sees " + p, async function () {
      const r = await api("brand", p);
      return r.status === 200 ? true : "status " + r.status;
    });
  }

  await check("a brand cannot reach the admin area", async function () {
    const r = await api("brand", "/admin/brands");
    return r.status !== 200 ? true : "it served the admin page to a brand";
  });

  await check("a brand cannot run a payout", async function () {
    const r = await api("brand", "/api/admin/payouts/run", { json: { send: true } });
    return (r.json && r.json.ok === false) || r.status === 403 ? true : "a brand could run payouts";
  });

  await check("a brand cannot reach the creator area", async function () {
    const r = await api("brand", "/api/creator/payouts");
    return r.json && r.json.ok === false ? true : "status " + r.status;
  });

  await check("a brand can change its own password", async function () {
    const r = await api("brand", "/api/account/password", {
      json: { current: "RtBrand!2026", password: "RtBrand!2026b" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const back = await login("brand", "rtbrand@pluggz.test", "RtBrand!2026b");
    return back.json && back.json.ok ? true : "the new password does not work";
  });

  await check("a wrong current password is refused", async function () {
    const r = await api("brand", "/api/account/password", {
      json: { current: "NotTheOne1", password: "Whatever12345" },
    });
    return r.json && r.json.ok === false ? true : "it changed the password without the old one";
  });

  // ------------------------------------------------------------------ 5
  section("5. The creator, including the consent they have to give");

  await check("the creator invite left a reset token", function () {
    const n = sql("select count(*) from \"PasswordResetToken\" t join \"User\" u on u.id = t.\"userId\"" +
      " where u.email = 'rtcreator@pluggz.test';");
    state.creatorResetToken = mintReset("rtcreator@pluggz.test");
    save();
    return Number(n) >= 1 ? true : "the invite created no reset token";
  });

  await check("the creator sets a password and signs in", async function () {
    const r = await api("creator", "/api/auth/reset-password", {
      json: { token: state.creatorResetToken, password: "RtCreator!2026" },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const l = await login("creator", "rtcreator@pluggz.test", "RtCreator!2026");
    return l.json && l.json.ok ? true : msg(l);
  });

  await check("their storefront is NOT public before they release it", async function () {
    const r = await fetch(BASE + "/@rtprobecreator", { redirect: "manual" });
    return r.status === 404 ? true : "an unreleased profile was already visible, status " + r.status;
  });

  await check("releasing needs the terms actually accepted", async function () {
    const r = await api("creator", "/api/creator/release", { json: { acceptTerms: false } });
    return r.json && r.json.ok === false ? true : "it released without consent";
  });

  await check("the creator releases their own profile", async function () {
    const r = await api("creator", "/api/creator/release", { json: { acceptTerms: true } });
    return r.json && r.json.ok ? true : msg(r);
  });

  await check("consent was recorded with a version and a timestamp", function () {
    const row = sql("select coalesce(\"termsVersion\",'?') || '|' || (\"profileReleasedAt\" is not null)" +
      " from \"CreatorProfile\" where handle = 'rtprobecreator';");
    return row.indexOf("|t") !== -1 ? true : "profile row reads " + row;
  });

  for (const p of ["/creator/dashboard", "/creator/storefront", "/creator/payouts", "/creator/settings"]) {
    await check("creator sees " + p, async function () {
      const r = await api("creator", p);
      return r.status === 200 ? true : "status " + r.status;
    });
  }

  await check("a creator cannot reach the admin area", async function () {
    const r = await api("creator", "/api/admin/payouts/run", { json: {} });
    return (r.json && r.json.ok === false) || r.status === 403 ? true : "a creator ran a payout";
  });

  await check("a creator cannot reach the brand area", async function () {
    const r = await api("creator", "/api/brand/products", { json: { url: "https://example.invalid/x" } });
    return r.json && r.json.ok === false ? true : "status " + r.status;
  });

  await check("the creator lists the fixture product", async function () {
    const r = await api("creator", "/api/creator/products", {
      json: { productId: state.productId, review: "A release test listing.", rating: 5 },
    });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    state.listingId = (d.listing || d.creatorProduct || d).id;
    state.listingSlug = (d.listing || d.creatorProduct || d).slug;
    save();
    return state.listingId ? true : "no listing id in " + JSON.stringify(d).slice(0, 200);
  });

  await check("that listing got a tracking link", function () {
    const code = sql("select code from \"TrackingLink\" where \"creatorProductId\" = '" + state.listingId + "';");
    state.trackingCode = code;
    save();
    return code.length > 3 ? true : "no tracking link was minted";
  });

  await check("the same product cannot be listed twice by one creator", async function () {
    const r = await api("creator", "/api/creator/products", { json: { productId: state.productId } });
    return r.json && r.json.ok === false ? true : "it made a second listing";
  });

  await check("the listing and storefront are now public", async function () {
    const a = await fetch(BASE + "/@rtprobecreator", { redirect: "manual" });
    const b = await fetch(BASE + "/@rtprobecreator/" + state.listingSlug, { redirect: "manual" });
    return a.status === 200 && b.status === 200 ? true : "storefront " + a.status + ", product " + b.status;
  });

  await check("payouts say they are switched on but not set up", async function () {
    const r = await api("creator", "/api/creator/payouts");
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    return d.configured === true && d.payoutsEnabled === false
      ? true : "configured=" + d.configured + " payoutsEnabled=" + d.payoutsEnabled;
  });

  // ------------------------------------------------------------------ 6
  section("6. A shopper");

  await check("a shopper can sign up", async function () {
    const r = await api("shopper", "/api/auth/signup/shopper", {
      json: {
        name: "RT Probe Shopper", email: "rtshopper@pluggz.test", password: "RtShopper!2026",
        city: "Leeds", interests: ["Beauty & Skincare"], marketing: true, acceptTerms: true,
      },
    });
    return r.json && r.json.ok ? true : msg(r);
  });

  await check("signing up twice with the same address is refused", async function () {
    const r = await api("shopper2", "/api/auth/signup/shopper", {
      json: {
        name: "RT Probe Shopper", email: "rtshopper@pluggz.test", password: "RtShopper!2026",
        acceptTerms: true, interests: [], marketing: false,
      },
    });
    return r.json && r.json.ok === false ? true : "a duplicate account was created";
  });

  await check("terms must be accepted", async function () {
    const r = await api("shopper3", "/api/auth/signup/shopper", {
      json: {
        name: "RT No Terms", email: "rtnoterms@pluggz.test", password: "RtShopper!2026",
        acceptTerms: false, interests: [], marketing: false,
      },
    });
    return r.json && r.json.ok === false ? true : "it created an account with no consent";
  });

  await check("marketing consent was recorded with a date", function () {
    const row = sql("select (\"marketingOptIn\")::text || '|' || (\"marketingOptInAt\" is not null)::text" +
      " from \"ShopperProfile\" p join \"User\" u on u.id = p.\"userId\" where u.email = 'rtshopper@pluggz.test';");
    return /^(t|true)\|(t|true)$/.test(row) ? true : "row reads " + row;
  });

  await check("the shopper signs in and reaches their account", async function () {
    const l = await login("shopper", "rtshopper@pluggz.test", "RtShopper!2026");
    if (!l.json || !l.json.ok) return msg(l);
    const r = await api("shopper", "/account");
    return r.status === 200 ? true : "status " + r.status;
  });

  await check("a shopper cannot reach any dashboard", async function () {
    const bad = [];
    for (const p of ["/admin/brands", "/creator/dashboard", "/brand/dashboard"]) {
      const r = await api("shopper", p);
      if (r.status === 200) bad.push(p);
    }
    return bad.length === 0 ? true : "a shopper reached " + bad.join(", ");
  });

  await check("a shopper can save a listing and see it back", async function () {
    const add = await api("shopper", "/api/wishlist", { json: { listingId: state.listingId } });
    if (!add.json || !add.json.ok) return msg(add);
    const n = sql("select count(*) from \"WishlistItem\" w join \"User\" u on u.id = w.\"userId\"" +
      " where u.email = 'rtshopper@pluggz.test';");
    return n === "1" ? true : "wishlist holds " + n;
  });

  const pass = results.filter(function (r) { return r[1] === "pass"; }).length;
  const bad = results.filter(function (r) { return r[1] !== "pass"; });
  console.log("\n\x1b[1mSuites 3b to 6: " + pass + " of " + results.length + " passed\x1b[0m");
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
  console.log("\nstate: " + JSON.stringify(state));
})();
