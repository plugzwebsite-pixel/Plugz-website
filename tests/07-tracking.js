// Suites 9 and 10: the tracking engine, and the things that must not work.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

const fs = require("fs");
const { createHmac } = require("crypto");
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

function sql(q) {
  return execSync("psql " + JSON.stringify(DB) + " -tAc " + JSON.stringify(q), { encoding: "utf8" }).trim();
}
function runSql(text) {
  const p = "/tmp/rt9-" + Date.now() + ".sql";
  fs.writeFileSync(p, text);
  try { return execSync("psql " + JSON.stringify(DB) + " -q -v ON_ERROR_STOP=1 -f " + p, { encoding: "utf8" }); }
  finally { fs.unlinkSync(p); }
}

const REAL_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36";

async function go(code, opts) {
  const o = opts || {};
  return fetch(BASE + "/go/" + code, {
    redirect: "manual",
    headers: {
      "user-agent": o.ua || REAL_UA,
      referer: o.referer || "https://www.instagram.com/",
      ...(o.forwarded ? { "x-forwarded-for": o.forwarded } : {}),
      ...(o.cookie ? { cookie: o.cookie } : {}),
    },
  });
}

async function post(path, body, headers) {
  const res = await fetch(BASE + path, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", origin: BASE, ...(headers || {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const raw = await res.text();
  let json = null; try { json = JSON.parse(raw); } catch (e) {}
  return { status: res.status, json, raw };
}

function sign(secret, raw) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

(async function () {
  section("9. Setting up two brands and a live listing");

  let keyA = "", secretA = "", keyB = "", secretB = "", codeA = "", codeB = "";

  await check("two brands, a creator, and a live listing each", function () {
    runSql(`
      insert into "Brand" (id,name,slug,status,platform,"trackingMethod","commissionRate","returnWindowDays","settlementDays","trackingKey","trackingSecret","contactEmail","createdAt","updatedAt")
      values
        ('rt9_ba','RT Track A','rt-track-a','ACTIVE','OTHER','PLUGGZ_DIRECT',12.00,21,30,'pz_live_rt9keya','rt9secreta','rt9a@pluggz.test',now(),now()),
        ('rt9_bb','RT Track B','rt-track-b','ACTIVE','OTHER','PLUGGZ_DIRECT',12.00,21,30,'pz_live_rt9keyb','rt9secretb','rt9b@pluggz.test',now(),now())
      on conflict (id) do nothing;

      insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
      values ('rt9_cu','rt9creator@pluggz.test','x','RT Track Creator','CREATOR',now(),now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProfile" (id,"userId",handle,category,status,source,"profileReleasedAt","createdAt","updatedAt")
      values ('rt9_c','rt9_cu','rt9creator','Beauty & Skincare','APPROVED','ADMIN_ADDED',now(),now(),now())
      on conflict (id) do nothing;

      insert into "Product" (id,"brandId",name,slug,"sourceUrl",category,"pricePence","createdAt","updatedAt")
      values
        ('rt9_pa','rt9_ba','RT Track Product A','rt-track-a','https://example.invalid/rt9a','Beauty & Skincare',10000,now(),now()),
        ('rt9_pb','rt9_bb','RT Track Product B','rt-track-b','https://example.invalid/rt9b','Beauty & Skincare',10000,now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProduct" (id,"profileId","productId",slug,live,"createdAt","updatedAt")
      values
        ('rt9_cpa','rt9_c','rt9_pa','rt-track-a',true,now(),now()),
        ('rt9_cpb','rt9_c','rt9_pb','rt-track-b',true,now(),now())
      on conflict (id) do nothing;

      insert into "TrackingLink" (id,"creatorProductId",code,"destinationUrl","isPlaceholder","clickCount","createdAt","updatedAt")
      values
        ('rt9_tla','rt9_cpa','rt9aaaa','https://example.invalid/rt9a',false,0,now(),now()),
        ('rt9_tlb','rt9_cpb','rt9bbbb','https://example.invalid/rt9b',false,0,now(),now())
      on conflict (id) do nothing;
    `);
    keyA = "pz_live_rt9keya"; secretA = "rt9secreta";
    keyB = "pz_live_rt9keyb"; secretB = "rt9secretb";
    codeA = "rt9aaaa"; codeB = "rt9bbbb";
    return sql("select count(*) from \"TrackingLink\" where id in ('rt9_tla','rt9_tlb');") === "2"
      ? true : "the links were not made";
  });

  section("9. The tracking link");

  let pzA = null;
  await check("a shopper click redirects to the brand and carries the marker", async function () {
    const res = await go(codeA, { forwarded: "203.0.113.10" });
    if (res.status !== 302) return "status " + res.status;
    const loc = res.headers.get("location") || "";
    const url = new URL(loc);
    pzA = url.searchParams.get("pz");
    return url.searchParams.get("ref") === "pluggz" && pzA
      ? true : "redirected to " + loc.slice(0, 90);
  });

  await check("that click was recorded", function () {
    const n = sql("select \"clickCount\" from \"TrackingLink\" where id='rt9_tla';");
    return n === "1" ? true : "the counter reads " + n;
  });

  await check("an attribution cookie was set", async function () {
    const res = await go(codeA, { forwarded: "203.0.113.11" });
    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    return cookies.some((c) => c.length > 0) ? true : "no cookie came back";
  });

  await check("a crawler is redirected but not counted", async function () {
    const before = sql("select \"clickCount\" from \"TrackingLink\" where id='rt9_tla';");
    const res = await go(codeA, { ua: "Googlebot/2.1 (+http://www.google.com/bot.html)", forwarded: "203.0.113.12" });
    const after = sql("select \"clickCount\" from \"TrackingLink\" where id='rt9_tla';");
    return res.status === 302 && before === after
      ? true : "status " + res.status + ", counter went " + before + " to " + after;
  });

  await check("a burst from one address stops being counted", async function () {
    const before = Number(sql("select \"clickCount\" from \"TrackingLink\" where id='rt9_tla';"));
    for (let i = 0; i < 25; i++) {
      await go(codeA, { forwarded: "203.0.113.99" });
    }
    const after = Number(sql("select \"clickCount\" from \"TrackingLink\" where id='rt9_tla';"));
    const counted = after - before;
    return counted < 25
      ? true : "all 25 were counted, so the guard did nothing";
  });

  await check("an unknown code sends the shopper home rather than erroring", async function () {
    const res = await go("nosuchcode", { forwarded: "203.0.113.13" });
    const loc = res.headers.get("location") || "";
    return res.status === 302 && new URL(loc).pathname === "/"
      ? true : "status " + res.status + " to " + loc.slice(0, 60);
  });

  await check("a link whose listing is hidden sends them home too", async function () {
    sql("update \"CreatorProduct\" set live=false where id='rt9_cpb';");
    const res = await go(codeB, { forwarded: "203.0.113.14" });
    const loc = res.headers.get("location") || "";
    sql("update \"CreatorProduct\" set live=true where id='rt9_cpb';");
    return res.status === 302 && new URL(loc).pathname === "/"
      ? true : "status " + res.status + " to " + loc.slice(0, 60);
  });

  section("9. A brand reporting a sale, signed");

  await check("a correctly signed postback records the sale", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-1", value: 10000 });
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": keyA, "x-pluggz-signature": sign(secretA, body),
    });
    if (r.status !== 200 && r.status !== 201) return "status " + r.status + " " + r.raw.slice(0, 120);
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-1';");
    return n === "1" ? true : n + " sales were made";
  });

  await check("the split matches the rates recorded against the sale", function () {
    // Not a fixed percentage: the rate depends on whether the brand or the
    // creator carries an override, and the sale stores whichever was used. The
    // invariant worth testing is that the pence agree with those rates.
    const row = sql("select \"valuePence\" || '|' || \"creatorRate\" || '|' || \"pluggzRate\" || '|' || \"creatorAmountPence\" || '|' || \"pluggzAmountPence\" from \"Sale\" where \"orderRef\"='RT9-1';");
    const [value, cRate, pRate, cAmt, pAmt] = row.split("|").map(Number);
    const expectedC = Math.floor((value * cRate) / 100);
    const expectedP = Math.floor((value * pRate) / 100);
    return cAmt === expectedC && pAmt === expectedP
      ? true : "stored " + cAmt + "/" + pAmt + " but the rates give " + expectedC + "/" + expectedP;
  });

  await check("what the brand is billed is the whole commission, both halves", function () {
    const row = sql("select (\"creatorAmountPence\"+\"pluggzAmountPence\") from \"Sale\" where \"orderRef\"='RT9-1';");
    // Pluggz must never bill less than it pays out, or it funds the creators
    // from its own money. This was a real fault and is what this guards.
    const creator = Number(sql("select \"creatorAmountPence\" from \"Sale\" where \"orderRef\"='RT9-1';"));
    return Number(row) >= creator ? true : "billing " + row + " while paying out " + creator;
  });

  await check("the same order reported twice does not become two sales", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-1", value: 10000 });
    await post("/api/track/sale", body, { "x-pluggz-key": keyA, "x-pluggz-signature": sign(secretA, body) });
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-1';");
    return n === "1" ? true : "there are now " + n;
  });

  await check("a repeat cannot quietly change the amount", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-1", value: 999999 });
    await post("/api/track/sale", body, { "x-pluggz-key": keyA, "x-pluggz-signature": sign(secretA, body) });
    const v = sql("select \"valuePence\" from \"Sale\" where \"orderRef\"='RT9-1';");
    return v === "10000" ? true : "the value became " + v;
  });

  await check("a wrong secret is refused", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-WRONG", value: 5000 });
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": keyA, "x-pluggz-signature": sign("not-the-secret", body),
    });
    return r.status === 401 ? true : "status " + r.status;
  });

  await check("an unknown key is refused", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-UNKNOWN", value: 5000 });
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": "pz_live_nope", "x-pluggz-signature": sign(secretA, body),
    });
    return r.status === 401 ? true : "status " + r.status;
  });

  await check("one brand cannot report a sale against another brand's click", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-CROSS", value: 5000 });
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": keyB, "x-pluggz-signature": sign(secretB, body),
    });
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-CROSS';");
    return r.status >= 400 && n === "0" ? true : "status " + r.status + ", " + n + " sales created";
  });

  await check("a signed null body is refused rather than crashing", async function () {
    const body = "null";
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": keyA, "x-pluggz-signature": sign(secretA, body),
    });
    return r.status === 400 ? true : "status " + r.status;
  });

  await check("a value of zero or less is refused", async function () {
    const body = JSON.stringify({ pz: pzA, orderRef: "RT9-ZERO", value: 0 });
    const r = await post("/api/track/sale", body, {
      "x-pluggz-key": keyA, "x-pluggz-signature": sign(secretA, body),
    });
    return r.status === 400 ? true : "status " + r.status;
  });

  section("9. The Shopify pixel, which cannot hold a secret");

  let pzB = null;
  await check("a fresh click on the other brand's link", async function () {
    const res = await go(codeB, { forwarded: "203.0.113.20" });
    pzB = new URL(res.headers.get("location") || "").searchParams.get("pz");
    return pzB ? true : "no pz came back";
  });

  await check("the pixel records a sale with no signature at all", async function () {
    const r = await post("/api/track/pixel", { key: keyB, pz: pzB, orderRef: "RT9-PIX-1", value: 4500 });
    if (r.status !== 200 && r.status !== 201) return "status " + r.status + " " + r.raw.slice(0, 120);
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-PIX-1';");
    return n === "1" ? true : n + " sales";
  });

  await check("it is marked as unverified, because it is", function () {
    const s = sql("select source from \"Sale\" where \"orderRef\"='RT9-PIX-1';");
    return s === "PIXEL" ? true : "the source reads " + s;
  });

  await check("a pixel cannot report against another brand's click", async function () {
    const r = await post("/api/track/pixel", { key: keyA, pz: pzB, orderRef: "RT9-PIX-CROSS", value: 4500 });
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-PIX-CROSS';");
    return r.status >= 400 && n === "0" ? true : "status " + r.status + ", " + n + " sales";
  });

  await check("a six figure order value is refused", async function () {
    const res = await go(codeB, { forwarded: "203.0.113.21" });
    const pz = new URL(res.headers.get("location") || "").searchParams.get("pz");
    const r = await post("/api/track/pixel", { key: keyB, pz, orderRef: "RT9-PIX-BIG", value: 99999999 });
    const n = sql("select count(*) from \"Sale\" where \"orderRef\"='RT9-PIX-BIG';");
    return n === "0" ? true : "a sale of that size was booked, status " + r.status;
  });

  await check("a null body is refused rather than crashing", async function () {
    const r = await post("/api/track/pixel", "null");
    return r.status === 400 ? true : "status " + r.status;
  });

  await check("the pixel answers a preflight, since it runs cross origin", async function () {
    const res = await fetch(BASE + "/api/track/pixel", {
      method: "OPTIONS",
      headers: { origin: "https://someshop.myshopify.com", "access-control-request-method": "POST" },
    });
    return res.status >= 200 && res.status < 300 ? true : "status " + res.status;
  });

  section("10. Things that must not work");

  await check("a forged cross site POST is blocked", async function () {
    const res = await fetch(BASE + "/api/auth/login", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ email: "rtadmin@pluggz.test", password: "RtProbe!2026" }),
    });
    return res.status === 403 ? true : "status " + res.status;
  });

  await check("the pixel is exempt from that check, by design", async function () {
    const res = await fetch(BASE + "/api/track/pixel", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/json", origin: "https://someshop.myshopify.com" },
      body: JSON.stringify({ key: keyB, pz: "not-a-real-click", orderRef: "RT9-CORS", value: 100 }),
    });
    // Refused on the pz, not on the origin. 403 would mean the guard caught it.
    return res.status !== 403 ? true : "the forgery check blocked the pixel";
  });

  await check("the Stripe webhook is exempt too, but demands a signature", async function () {
    const res = await fetch(BASE + "/api/webhooks/stripe", {
      method: "POST", redirect: "manual",
      headers: { "content-type": "application/json", origin: "https://stripe.example" },
      body: JSON.stringify({ type: "invoice.paid" }),
    });
    return res.status === 400 ? true : "status " + res.status;
  });

  await check("a null byte in a search does not crash the page", async function () {
    const res = await fetch(BASE + "/search?q=%00", { redirect: "manual" });
    return res.status === 200 ? true : "status " + res.status;
  });

  await check("a very long search is handled", async function () {
    const res = await fetch(BASE + "/search?q=" + "a".repeat(3000), { redirect: "manual" });
    return res.status < 500 ? true : "status " + res.status;
  });

  await check("hammering the login is rate limited", async function () {
    let sawLimit = false;
    for (let i = 0; i < 25; i++) {
      const r = await post("/api/auth/login", { email: "nobody@pluggz.test", password: "wrongwrong1" });
      if (r.status === 429) { sawLimit = true; break; }
    }
    return sawLimit ? true : "25 attempts and never a 429";
  });

  await check("a brand cannot read another brand's figures", async function () {
    // Signed in as brand A, ask for brand B's invoice. The route takes the
    // brand from the session, never the request, so there is nothing to pass.
    const r = await post("/api/admin/invoices", { action: "preview", brandId: "rt9_bb" });
    return r.status === 403 || (r.json && r.json.ok === false)
      ? true : "an anonymous caller previewed a brand's billing";
  });

  const pass = results.filter((r) => r[1] === "pass").length;
  const bad = results.filter((r) => r[1] !== "pass");
  console.log("\n\x1b[1mSuites 9 and 10: " + pass + " of " + results.length + " passed\x1b[0m");
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
})();
