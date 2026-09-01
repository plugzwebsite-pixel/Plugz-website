// Suite 1 and 2: every public page, and what an anonymous visitor must not reach.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";


const results = [];
let suite = "";

function section(name) { suite = name; console.log("\n[1m" + name + "[0m"); }

async function check(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { results.push([suite, name, "pass", ""]); console.log("  pass  " + name); }
    else { results.push([suite, name, "FAIL", String(r)]); console.log("  FAIL  " + name + "\n          " + r); }
  } catch (e) {
    results.push([suite, name, "ERROR", e.message]);
    console.log("  ERR   " + name + "\n          " + (e.message || "").slice(0, 160));
  }
}

async function get(path, opts) {
  const o = opts || {};
  const res = await fetch(BASE + path, {
    method: o.method || "GET",
    redirect: "manual",
    headers: Object.assign({ "user-agent": "PluggzReleaseTest/1.0" }, o.headers || {}),
    body: o.body,
  });
  const text = o.noBody ? "" : await res.text().catch(function () { return ""; });
  return { status: res.status, headers: res.headers, text: text };
}

function want(r, codes) {
  const list = Array.isArray(codes) ? codes : [codes];
  return list.indexOf(r.status) !== -1 ? true : "expected " + list.join("/") + ", got " + r.status;
}

(async function () {
  // ---------------------------------------------------------------- suite 1
  section("1. Public pages");

  const pages = [
    "/", "/brands", "/campaigns", "/login", "/signup", "/signup/shopper",
    "/waitlist", "/forgot-password", "/legal/creator-terms", "/verify-email",
    "/reset-password", "/search", "/search?q=dress",
  ];
  for (const p of pages) {
    await check("GET " + p, async function () {
      const r = await get(p);
      return want(r, 200);
    });
  }

  await check("robots.txt names the sitemap", async function () {
    const r = await get("/robots.txt");
    if (r.status !== 200) return "status " + r.status;
    return r.text.toLowerCase().indexOf("sitemap") !== -1 ? true : "no sitemap line";
  });

  let sitemapUrls = [];
  await check("sitemap.xml parses and carries urls", async function () {
    const r = await get("/sitemap.xml");
    if (r.status !== 200) return "status " + r.status;
    sitemapUrls = (r.text.match(/<loc>([^<]+)<\/loc>/g) || []).map(function (m) {
      return m.replace(/<\/?loc>/g, "");
    });
    return sitemapUrls.length > 20 ? true : "only " + sitemapUrls.length + " urls";
  });

  // Everything the sitemap advertises must actually be there. A sitemap that
  // lists a dead page is worse than no sitemap.
  await check("every sitemap url resolves", async function () {
    const paths = sitemapUrls.map(function (u) { return u.replace(/^https?:\/\/[^/]+/, "") || "/"; });
    const bad = [];
    for (const p of paths) {
      const r = await get(p, { noBody: true });
      if (r.status !== 200) bad.push(p + " -> " + r.status);
      if (bad.length > 4) break;
    }
    return bad.length === 0 ? true : bad.length + " dead: " + bad.join(", ");
  });

  await check("category pages all answer", async function () {
    const paths = sitemapUrls
      .map(function (u) { return u.replace(/^https?:\/\/[^/]+/, ""); })
      .filter(function (p) { return p.indexOf("/category/") === 0; });
    if (paths.length === 0) return "no category urls in the sitemap";
    const bad = [];
    for (const p of paths) {
      const r = await get(p, { noBody: true });
      if (r.status !== 200) bad.push(p + " -> " + r.status);
    }
    return bad.length === 0 ? true : bad.join(", ");
  });

  await check("a storefront and a product page answer", async function () {
    const paths = sitemapUrls
      .map(function (u) { return u.replace(/^https?:\/\/[^/]+/, ""); })
      .filter(function (p) { return p.indexOf("/@") === 0; });
    const store = paths.filter(function (p) { return p.split("/").length === 2; })[0];
    const prod = paths.filter(function (p) { return p.split("/").length === 3; })[0];
    if (!store || !prod) return "sitemap has no storefront or product url";
    const a = await get(store, { noBody: true });
    const b = await get(prod, { noBody: true });
    return a.status === 200 && b.status === 200 ? true : store + "=" + a.status + " " + prod + "=" + b.status;
  });

  await check("an unknown page is a 404, not a crash", async function () {
    const r = await get("/@nobody-at-all/nothing-here", { noBody: true });
    return want(r, 404);
  });

  await check("an unknown category is a 404", async function () {
    const r = await get("/category/does-not-exist", { noBody: true });
    return want(r, 404);
  });

  // ---------------------------------------------------------------- suite 2
  section("2. What an anonymous visitor must not reach");

  const guarded = [
    "/creator/dashboard", "/creator/storefront", "/creator/payouts", "/creator/settings",
    "/brand/dashboard", "/brand/products", "/brand/products/new", "/brand/invoices", "/brand/settings",
    "/admin/approvals", "/admin/creators/new", "/admin/brands", "/admin/credentials",
    "/admin/analytics", "/admin/commission", "/admin/sales", "/admin/payouts", "/admin/disputes",
    "/admin/categories", "/admin/homepage", "/admin/campaigns", "/admin/videos",
    "/admin/products", "/admin/shoppers", "/admin/enquiries", "/account",
  ];
  for (const p of guarded) {
    await check("anonymous is turned away from " + p, async function () {
      const r = await get(p, { noBody: true });
      // A redirect to login, or a refusal. Never the page itself.
      if (r.status === 200) return "served the page to nobody";
      return [302, 303, 307, 308, 401, 403, 404].indexOf(r.status) !== -1
        ? true : "unexpected " + r.status;
    });
  }

  const guardedApis = [
    ["GET", "/api/creator/payouts"], ["POST", "/api/creator/payouts"],
    ["GET", "/api/creator/products"], ["POST", "/api/admin/payouts/run"],
    ["POST", "/api/admin/sales/import"], ["POST", "/api/admin/brands"],
    ["POST", "/api/admin/campaigns"], ["POST", "/api/admin/categories"],
    ["POST", "/api/uploads/product-image"], ["POST", "/api/brand/products"],
  ];
  for (const pair of guardedApis) {
    await check("anonymous is refused " + pair[0] + " " + pair[1], async function () {
      const r = await get(pair[1], {
        method: pair[0],
        headers: { "content-type": "application/json", origin: BASE },
        body: pair[0] === "POST" ? "{}" : undefined,
      });
      if (r.status === 200) {
        let j = null;
        try { j = JSON.parse(r.text); } catch (e) { /* not json */ }
        if (j && j.ok === false) return true;
        return "answered 200 to nobody";
      }
      return [301, 302, 303, 307, 308, 400, 401, 403, 404, 405].indexOf(r.status) !== -1
        ? true : "unexpected " + r.status;
    });
  }

  // ---------------------------------------------------------------- summary
  const pass = results.filter(function (r) { return r[2] === "pass"; }).length;
  const bad = results.filter(function (r) { return r[2] !== "pass"; });
  console.log("\n[1mSuites 1 and 2: " + pass + " of " + results.length + " passed[0m");
  if (bad.length) {
    console.log("Not passing:");
    for (const b of bad) console.log("  [" + b[0] + "] " + b[1] + "  ::  " + b[3]);
  }
})();
