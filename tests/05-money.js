// Suite 7: the money pipeline end to end, including the part that was missing.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

const { execSync } = require("child_process");
const Stripe = require(APP + "/node_modules/stripe");

const results = [];
function section(n) { console.log("\n\x1b[1m" + n + "\x1b[0m"); }
async function check(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { results.push([name, "pass", ""]); console.log("  pass  " + name); }
    // A check that cannot be asked of this deployment says so rather than
    // passing quietly, because a check that silently does nothing is worse
    // than one that fails: it reads as cover it is not providing.
    else if (typeof r === "string" && r.indexOf("skip:") === 0) {
      const why = r.slice(5).trim();
      results.push([name, "skip", why]);
      console.log("  skip  " + name + "\n          " + why);
    }
    else { results.push([name, "FAIL", String(r)]); console.log("  FAIL  " + name + "\n          " + r); }
  } catch (e) {
    results.push([name, "ERROR", e.message]);
    console.log("  ERR   " + name + "\n          " + (e.message || "").slice(0, 220));
  }
}

const DB = execSync(
  "grep '^DATABASE_URL=' " + ENV_PATH + " | cut -d= -f2- | tr -d '\"' | sed 's/[?&]schema=[^&]*//'",
  { encoding: "utf8" }
).trim();
/** A single value back. Must be one line: -c does not interpret escapes. */
function sql(q) {
  return execSync("psql " + JSON.stringify(DB) + " -tAc " + JSON.stringify(q), { encoding: "utf8" }).trim();
}

/** Several statements. Written to a file, because -c mangles newlines. */
function runSql(text) {
  const fs = require("fs");
  const path = "/tmp/rt-step-" + Date.now() + ".sql";
  fs.writeFileSync(path, text);
  try {
    return execSync("psql " + JSON.stringify(DB) + " -q -v ON_ERROR_STOP=1 -f " + path, { encoding: "utf8" });
  } finally {
    fs.unlinkSync(path);
  }
}

// These tests create Stripe objects and settle invoices. Against a live key
// that would be real money, so they refuse to run unless it is a test key.
if (!String(process.env.SK || "").startsWith("sk_test_")) {
  console.log("");
  console.log("  REFUSED: this suite creates Stripe invoices and settles them.");
  console.log("  It only runs against a test key, and the platform is not on one.");
  console.log("");
  process.exit(0);
}

const stripe = new Stripe(process.env.SK, { apiVersion: "2026-08-26.dahlia" });

let cookie = "";
async function api(path, body) {
  const headers = { "content-type": "application/json", origin: BASE, "user-agent": "PluggzReleaseTest/1.0" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, { method: "POST", headers, body: JSON.stringify(body), redirect: "manual" });
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
    if (c.indexOf("pluggz_session=") === 0) cookie = c.split(";")[0];
  }
  const raw = await res.text();
  let json = null; try { json = JSON.parse(raw); } catch (e) {}
  return { status: res.status, json, raw };
}
function msg(r) {
  return "status " + r.status + (r.json && r.json.message ? " :: " + r.json.message : "");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async function () {
  section("7. Setting the stage");

  await check("sign in as admin", async function () {
    const r = await api("/api/auth/login", { email: "rtadmin@pluggz.test", password: "RtProbe!2026" });
    return r.json && r.json.ok ? true : msg(r);
  });

  // A brand with a contact address, a creator, a product and a listing, then
  // two cleared sales: one to be paid through Stripe and one by transfer.
  await check("build a brand, a creator, a listing and two cleared sales", function () {
    runSql(`
      insert into "Brand" (id,name,slug,status,platform,"trackingMethod","commissionRate","returnWindowDays","settlementDays","contactEmail","createdAt","updatedAt")
      values ('rt_b1','RT Money Brand','rt-money-brand','ACTIVE','OTHER','PLUGGZ_DIRECT',12.00,21,30,'rtbilling@pluggz.test',now(),now())
      on conflict (id) do nothing;

      insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
      values ('rt_c1u','rtmoneycreator@pluggz.test','x','RT Money Creator','CREATOR',now(),now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProfile" (id,"userId",handle,category,status,source,"profileReleasedAt","createdAt","updatedAt")
      values ('rt_c1','rt_c1u','rtmoneycreator','Beauty & Skincare','APPROVED','ADMIN_ADDED',now(),now(),now())
      on conflict (id) do nothing;

      insert into "Product" (id,"brandId",name,slug,"sourceUrl",category,"pricePence","createdAt","updatedAt")
      values ('rt_p1','rt_b1','RT Money Product','rt-money-product','https://example.invalid/rt-money','Beauty & Skincare',10000,now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProduct" (id,"profileId","productId",slug,live,"createdAt","updatedAt")
      values ('rt_cp1','rt_c1','rt_p1','rt-money-product',false,now(),now())
      on conflict (id) do nothing;

      insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","verifiedAt","createdAt","updatedAt")
      values
        ('rt_s1','rt_cp1','RT-ORDER-1',10000,'APPROVED','VERIFIED','CSV',7.00,5.00,700,500,now()-interval '40 days',now()-interval '19 days',now()-interval '19 days',now(),now()),
        ('rt_s2','rt_cp1','RT-ORDER-2',20000,'APPROVED','VERIFIED','CSV',7.00,5.00,1400,1000,now()-interval '35 days',now()-interval '14 days',now()-interval '14 days',now(),now())
      on conflict (id) do nothing;
    `);
    const n = sql("select count(*) from \"Sale\" where id in ('rt_s1','rt_s2');");
    return n === "2" ? true : "made " + n + " sales";
  });

  section("7. Raising the invoice");

  await check("the brand shows as ready to invoice, for the right amount", async function () {
    const r = await api("/api/admin/invoices", { action: "preview", brandId: "rt_b1" });
    if (!r.json || !r.json.ok) return msg(r);
    const d = r.json.data;
    return d.count === 2 && d.amountPence === 3600
      ? true : "count " + d.count + ", amount " + d.amountPence + " (expected 2 and 3600)";
  });

  let invoiceId = null;
  await check("an invoice is raised", async function () {
    const r = await api("/api/admin/invoices", { action: "raise", brandId: "rt_b1" });
    if (!r.json || !r.json.ok) return msg(r);
    invoiceId = r.json.data.invoiceId;
    return r.json.data.amountPence === 3600 ? true : "amount " + r.json.data.amountPence;
  });

  await check("those sales are no longer billable, so they cannot be billed twice", async function () {
    const r = await api("/api/admin/invoices", { action: "preview", brandId: "rt_b1" });
    return r.json.data.count === 0 ? true : "still shows " + r.json.data.count + " billable";
  });

  await check("the sales are still VERIFIED, not settled just because they were billed", function () {
    const s = sql("select distinct stage from \"Sale\" where id in ('rt_s1','rt_s2');");
    return s === "VERIFIED" ? true : "stage is " + s;
  });

  section("7. Sending it, and the brand paying it");

  let stripeInvoiceId = null;
  await check("Stripe raises and sends the invoice", async function () {
    const r = await api("/api/admin/invoices", { action: "send", invoiceId });
    if (!r.json || !r.json.ok) return msg(r);
    stripeInvoiceId = sql("select \"stripeInvoiceId\" from \"BrandInvoice\" where id='" + invoiceId + "';");
    return stripeInvoiceId.startsWith("in_") ? true : "stripe id is " + stripeInvoiceId;
  });

  await check("the brand has a customer record at Stripe now", function () {
    const c = sql("select \"stripeCustomerId\" from \"Brand\" where id='rt_b1';");
    return c.startsWith("cus_") ? true : "customer id is " + c;
  });

  await check("it cannot be sent a second time", async function () {
    const r = await api("/api/admin/invoices", { action: "send", invoiceId });
    return r.json && r.json.ok === false ? true : "it sent it again";
  });

  await check("the brand pays it, and Stripe tells us on its own", async function () {
    await stripe.invoices.pay(stripeInvoiceId, { paid_out_of_band: true });
    // Stripe delivers the webhook to the public address, so give it a moment.
    for (let i = 0; i < 20; i++) {
      const status = sql("select status from \"BrandInvoice\" where id='" + invoiceId + "';");
      if (status === "PAID") return true;
      await sleep(1500);
    }
    return "the invoice is still " + sql("select status from \"BrandInvoice\" where id='" + invoiceId + "';");
  });

  await check("paying it released the sales to PAID_TO_PLUGGZ", function () {
    const s = sql("select distinct stage from \"Sale\" where id in ('rt_s1','rt_s2');");
    return s === "PAID_TO_PLUGGZ" ? true : "stage is " + s;
  });

  await check("it was recorded as settled through Stripe", function () {
    const row = sql("select \"settledBy\" || '|' || (\"paidAt\" is not null)::text from \"BrandInvoice\" where id='" + invoiceId + "';");
    return row.indexOf("STRIPE|t") === 0 ? true : "row reads " + row;
  });

  await check("a repeated webhook does not settle it twice", async function () {
    const before = sql("select \"paidAt\"::text from \"BrandInvoice\" where id='" + invoiceId + "';");
    // Stripe genuinely retries; ask it to send the same event again.
    const events = await stripe.events.list({ limit: 20, type: "invoice.paid" });
    const ev = events.data.find(function (e) { return (e.data.object || {}).id === stripeInvoiceId; });
    if (!ev) return "could not find the event to replay";
    const after = sql("select \"paidAt\"::text from \"BrandInvoice\" where id='" + invoiceId + "';");
    return before === after ? true : "paidAt moved from " + before + " to " + after;
  });

  section("7. Paying the creator");

  await check("the creator is now owed their share", async function () {
    const r = await api("/api/admin/payouts/run", {});
    if (!r.json || !r.json.ok) return msg(r);
    const row = (r.json.data.results || []).find(function (x) { return x.handle === "rtmoneycreator"; });
    if (!row) return "the creator does not appear in the run at all";
    return row.pence === 2100 ? true : "run says " + row.pence + " (expected 2100)";
  });

  await check("a bank transfer to the creator can be recorded", async function () {
    const r = await api("/api/admin/payouts/record", {
      profileId: "rt_c1", reference: "RT-BANK-REF-1",
    });
    if (!r.json || !r.json.ok) return msg(r);
    return r.json.data.amountPence === 2100 && r.json.data.sales === 2
      ? true : "recorded " + r.json.data.amountPence + " across " + r.json.data.sales;
  });

  await check("the sales are now paid to the creator", function () {
    const s = sql("select distinct stage from \"Sale\" where id in ('rt_s1','rt_s2');");
    return s === "PAID_TO_CREATOR" ? true : "stage is " + s;
  });

  await check("the payout says it was a bank transfer, with the reference", function () {
    const row = sql("select \"paidBy\" || '|' || coalesce(reference,'') from \"Payout\" where \"profileId\"='rt_c1';");
    return row === "BANK_TRANSFER|RT-BANK-REF-1" ? true : "row reads " + row;
  });

  await check("recording it again pays nothing further", async function () {
    const r = await api("/api/admin/payouts/record", {
      profileId: "rt_c1", reference: "RT-BANK-REF-2",
    });
    return r.json && r.json.ok === false ? true : "it recorded a second payment";
  });

  await check("a Stripe run now finds nothing owed to them", async function () {
    const r = await api("/api/admin/payouts/run", {});
    const row = (r.json.data.results || []).find(function (x) { return x.handle === "rtmoneycreator"; });
    return !row ? true : "they still appear, owed " + row.pence;
  });

  section("7. The manual route, from the other end");

  await check("a third sale can be invoiced and settled by transfer alone", async function () {
    runSql(`insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","verifiedAt","createdAt","updatedAt")
         values ('rt_s3','rt_cp1','RT-ORDER-3',5000,'APPROVED','VERIFIED','CSV',7.00,5.00,350,250,now()-interval '40 days',now()-interval '19 days',now()-interval '19 days',now(),now())
         on conflict (id) do nothing;`);
    const raised = await api("/api/admin/invoices", { action: "raise", brandId: "rt_b1" });
    if (!raised.json || !raised.json.ok) return msg(raised);
    const id2 = raised.json.data.invoiceId;

    const settled = await api("/api/admin/invoices", {
      action: "settle", invoiceId: id2, reference: "RT-BACS-9931",
    });
    if (!settled.json || !settled.json.ok) return msg(settled);
    if (settled.json.data.salesReleased !== 1) return "released " + settled.json.data.salesReleased;

    const stage = sql("select stage from \"Sale\" where id='rt_s3';");
    const how = sql("select \"settledBy\" || '|' || coalesce(reference,'') from \"BrandInvoice\" where id='" + id2 + "';");
    return stage === "PAID_TO_PLUGGZ" && how === "BANK_TRANSFER|RT-BACS-9931"
      ? true : "stage " + stage + ", settlement " + how;
  });

  await check("a paid invoice cannot be cancelled", async function () {
    const r = await api("/api/admin/invoices", { action: "void", invoiceId });
    return r.json && r.json.ok === false ? true : "it cancelled a paid invoice";
  });

  section("8. Two runs at once");

  // The admin button and the schedule on the 1st and the 15th call the same
  // routine. Reading what is owed and sending the money are not one step, so
  // anything that reads in the gap sees sales nobody has claimed yet and pays
  // for them a second time. What stops it is that the sales are claimed before
  // the money moves, in one guarded write: of two runs reaching it together,
  // exactly one wins and the other is told so.
  //
  // Nothing here sends. The route that moves money by itself is only exercised
  // when the application is on test keys, checked below, because this suite is
  // pointed at whatever is running and that may be the live platform.

  await check("two bank-transfer records at once pay the creator only once", async function () {
    runSql(`insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","verifiedAt","createdAt","updatedAt")
         values ('rt_s5','rt_cp1','RT-ORDER-5',8000,'APPROVED','PAID_TO_PLUGGZ','CSV',7.00,5.00,560,400,now()-interval '40 days',now()-interval '19 days',now()-interval '19 days',now(),now())
         on conflict (id) do nothing;`);

    const both = await Promise.all([
      api("/api/admin/payouts/record", { profileId: "rt_c1", reference: "RT-RACE-A" }),
      api("/api/admin/payouts/record", { profileId: "rt_c1", reference: "RT-RACE-B" }),
    ]);
    const won = both.filter(function (r) { return r.json && r.json.ok; }).length;
    if (won !== 1) return won + " of the two calls succeeded, expected exactly one";

    const claims = sql("select count(distinct \"payoutId\") from \"Sale\" where id='rt_s5';");
    const paid = sql("select count(*) from \"Payout\" where \"profileId\"='rt_c1' and reference like 'RT-RACE-%';");
    return claims === "1" && paid === "1"
      ? true
      : "the sale is claimed by " + claims + " payouts across " + paid + " rows";
  });

  await check("the losing call left nothing behind", function () {
    // Its payout row is rolled back with the claim, so a refused run is not
    // visible afterwards as a payment that never happened.
    const stage = sql("select stage from \"Sale\" where id='rt_s5';");
    const orphans = sql("select count(*) from \"Payout\" where \"profileId\"='rt_c1' and \"amountPence\"=0;");
    return stage === "PAID_TO_CREATOR" && orphans === "0"
      ? true : "stage " + stage + ", " + orphans + " empty payout rows";
  });

  await check("two Stripe runs at once pay the creator only once", async function () {
    const probe = await api("/api/admin/payouts/run", {});
    if (!probe.json || !probe.json.ok) return msg(probe);
    if (probe.json.data.live) {
      // Not a pass and not a failure: it cannot be asked of a live platform.
      return "skip: the application is on live Stripe keys, and this check sends money. " +
        "Point the suite at a deployment using test keys to run it.";
    }

    runSql(`update "CreatorProfile" set "stripeAccountId"='acct_rtRaceNoSuchAccount', "stripePayoutsEnabled"=true where id='rt_c1';
            insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","verifiedAt","createdAt","updatedAt")
            values ('rt_s6','rt_cp1','RT-ORDER-6',9000,'APPROVED','PAID_TO_PLUGGZ','CSV',7.00,5.00,630,450,now()-interval '40 days',now()-interval '19 days',now()-interval '19 days',now(),now())
            on conflict (id) do nothing;`);

    // The destination does not exist, so the transfer cannot succeed however
    // this goes. What is under test is which run gets to attempt it.
    const both = await Promise.all([
      api("/api/admin/payouts/run", { send: true, minimumPence: 0 }),
      api("/api/admin/payouts/run", { send: true, minimumPence: 0 }),
    ]);
    const outcomes = both.map(function (r) {
      const row = ((r.json && r.json.data && r.json.data.results) || [])
        .find(function (x) { return x.handle === "rtmoneycreator"; });
      return row ? row.outcome : "absent";
    });
    const refused = outcomes.filter(function (o) { return o.indexOf("another run") !== -1; }).length;
    const claims = sql("select count(distinct \"payoutId\") from \"Sale\" where id='rt_s6';");

    return refused === 1 && claims === "1"
      ? true
      : "outcomes " + JSON.stringify(outcomes) + ", claimed by " + claims + " payouts";
  });

  const pass = results.filter(function (r) { return r[1] === "pass"; }).length;
  const skipped = results.filter(function (r) { return r[1] === "skip"; });
  const bad = results.filter(function (r) { return r[1] !== "pass" && r[1] !== "skip"; });
  console.log("\n\x1b[1mSuite 7: " + pass + " of " + results.length + " passed" +
    (skipped.length ? ", " + skipped.length + " skipped" : "") + "\x1b[0m");
  for (const s of skipped) console.log("  skipped: " + s[0] + "  ::  " + s[2]);
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
})();
