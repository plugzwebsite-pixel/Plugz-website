// Suite 8: the whole chain running on its own, from a sale to the company bank.
// Part of the Pluggz release suite. See tests/README.md.
//
// Paths are read from the environment so this runs against any deployment
// rather than only the one it was written on.
const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || APP + "/.env";
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";

const fs = require("fs");
const { execSync } = require("child_process");
const Stripe = require(APP + "/node_modules/stripe");

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
  const path = "/tmp/rt8-" + Date.now() + ".sql";
  fs.writeFileSync(path, text);
  try { return execSync("psql " + JSON.stringify(DB) + " -q -v ON_ERROR_STOP=1 -f " + path, { encoding: "utf8" }); }
  finally { fs.unlinkSync(path); }
}


// These tests create Stripe accounts and move money. Against a live key that
// would mean real connected accounts and real transfers, so they refuse to run
// unless the platform is on test keys. A test that can cost money on a wrong
// day is not a test.
if (!envOf("STRIPE_SECRET_KEY").startsWith("sk_test_")) {
  console.log("");
  console.log("  REFUSED: this suite creates Stripe accounts and moves money.");
  console.log("  It only runs against a test key. The platform is on " +
    envOf("STRIPE_SECRET_KEY").slice(0, 8) + "..., so nothing was run.");
  console.log("");
  process.exit(0);
}

const stripe = new Stripe(envOf("STRIPE_SECRET_KEY"), { apiVersion: "2026-08-26.dahlia" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cron(path, method) {
  const res = await fetch(BASE + path, {
    method: method || "POST",
    headers: { "x-cron-secret": CRON, origin: BASE },
    redirect: "manual",
  });
  const raw = await res.text();
  let json = null; try { json = JSON.parse(raw); } catch (e) {}
  return { status: res.status, json, raw };
}
function msg(r) { return "status " + r.status + (r.json && r.json.message ? " :: " + r.json.message : ""); }

(async function () {
  section("8. A sale, with nobody touching anything");

  let readyAccount = null;

  await check("build a brand, a creator with a Stripe account, and a sale still in its window", async function () {
    // A connected account that Stripe will actually pay, so the last step is
    // real rather than skipped.
    const acct = await stripe.v2.core.accounts.create({
      contact_email: "rt8creator@pluggzofficial.co.uk", display_name: "RT8 Creator", dashboard: "none",
      identity: { country: "gb", entity_type: "individual",
        individual: { given_name: "Rt", surname: "Eight",
          date_of_birth: { day: 1, month: 1, year: 1990 },
          address: { line1: "1 Test Street", city: "London", postal_code: "SW1A 1AA", country: "gb" } },
        attestations: { terms_of_service: { account: { date: new Date().toISOString(), ip: "1.2.3.4" } } } },
      defaults: { currency: "gbp", profile: { business_url: "https://pluggzofficial.co.uk/@rt8creator" },
        responsibilities: { fees_collector: "application", losses_collector: "application" } },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    });
    await stripe.accounts.createExternalAccount(acct.id, { external_account: {
      object: "bank_account", country: "GB", currency: "gbp", account_number: "00012345", routing_number: "108800" } });
    await stripe.v2.core.accounts.update(acct.id, { identity: { individual: { documents: { primary_verification: {
      type: "front_back", front_back: { front: "file_identity_document_success", back: "file_identity_document_success" } } } } } });
    readyAccount = acct.id;

    // Stripe verifies in its own time. Waiting here keeps the test about the
    // payout run rather than about how quickly Stripe happened to answer.
    for (let i = 0; i < 40; i++) {
      const a = await stripe.v2.core.accounts.retrieve(acct.id, { include: ["configuration.recipient"] });
      const b = a.configuration?.recipient?.capabilities?.stripe_balance || {};
      if (b.stripe_transfers?.status === "active" && b.payouts?.status === "active") break;
      await sleep(1500);
    }

    runSql(`
      insert into "Brand" (id,name,slug,status,platform,"trackingMethod","commissionRate","returnWindowDays","settlementDays","contactEmail","createdAt","updatedAt")
      values ('rt8_b','RT Auto Brand','rt-auto-brand','ACTIVE','OTHER','PLUGGZ_DIRECT',12.00,21,14,'rt8billing@pluggz.test',now(),now())
      on conflict (id) do nothing;

      insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
      values ('rt8_cu','rt8creator@pluggz.test','x','RT Auto Creator','CREATOR',now(),now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProfile" (id,"userId",handle,category,status,source,"profileReleasedAt","stripeAccountId","stripePayoutsEnabled","createdAt","updatedAt")
      values ('rt8_c','rt8_cu','rt8creator','Beauty & Skincare','APPROVED','ADMIN_ADDED',now(),'${acct.id}',false,now(),now())
      on conflict (id) do nothing;

      insert into "Product" (id,"brandId",name,slug,"sourceUrl",category,"pricePence","createdAt","updatedAt")
      values ('rt8_p','rt8_b','RT Auto Product','rt-auto-product','https://example.invalid/rt8','Beauty & Skincare',20000,now(),now())
      on conflict (id) do nothing;

      insert into "CreatorProduct" (id,"profileId","productId",slug,live,"createdAt","updatedAt")
      values ('rt8_cp','rt8_c','rt8_p','rt-auto-product',false,now(),now())
      on conflict (id) do nothing;

      -- Still PENDING, and its window ran out yesterday. Nothing has touched it.
      insert into "Sale" (id,"creatorProductId","orderRef","valuePence",status,stage,source,"creatorRate","pluggzRate","creatorAmountPence","pluggzAmountPence","soldAt","verifiesAt","createdAt","updatedAt")
      values ('rt8_s','rt8_cp','RT8-ORDER-1',50000,'PENDING','PENDING','POSTBACK',7.00,5.00,3500,2500,now()-interval '30 days',now()-interval '1 day',now(),now())
      on conflict (id) do nothing;
    `);
    const s = sql("select status || '/' || stage from \"Sale\" where id='rt8_s';");
    return s === "PENDING/PENDING" ? true : "the sale reads " + s;
  });

  await check("our copy says the creator is not ready to be paid", function () {
    const v = sql("select \"stripePayoutsEnabled\"::text from \"CreatorProfile\" where id='rt8_c';");
    return v === "false" ? true : "it already says " + v;
  });

  section("8. Step one: the nightly sweep releases it");

  await check("the verify job moves it to cleared", async function () {
    const r = await cron("/api/cron/verify-sales");
    if (!r.json || !r.json.ok) return msg(r);
    const s = sql("select status || '/' || stage from \"Sale\" where id='rt8_s';");
    return s === "APPROVED/VERIFIED" ? true : "the sale reads " + s;
  });

  section("8. Step two: the nightly billing invoices the brand");

  await check("a preview shows the brand is about to be billed", async function () {
    const r = await cron("/api/cron/billing", "GET");
    if (!r.json || !r.json.ok) return msg(r);
    const would = (r.json.data.wouldRaise || []).find((x) => x.brand === "RT Auto Brand");
    if (!would || would.amountPence !== 6000) {
      return "preview says " + JSON.stringify(r.json.data.wouldRaise || []).slice(0, 160);
    }
    // And it must not have raised anything by being asked.
    const n = sql("select count(*) from \"BrandInvoice\" where \"brandId\"='rt8_b';");
    return n === "0" ? true : "asking created " + n + " invoice(s)";
  });

  let stripeInvoiceId = null;
  await check("the run raises the invoice and Stripe sends it", async function () {
    const r = await cron("/api/cron/billing");
    if (!r.json || !r.json.ok) return msg(r);
    const sent = (r.json.data.sent || []).find((x) => x.brand === "RT Auto Brand");
    if (!sent) {
      return "not sent. raised=" + JSON.stringify(r.json.data.raised || []) +
             " skipped=" + JSON.stringify(r.json.data.skipped || []).slice(0, 200) +
             " failed=" + JSON.stringify(r.json.data.failed || []).slice(0, 200);
    }
    stripeInvoiceId = sql("select \"stripeInvoiceId\" from \"BrandInvoice\" where \"brandId\"='rt8_b';");
    return stripeInvoiceId.startsWith("in_") ? true : "no Stripe invoice id";
  });

  await check("running it again does not bill the same brand twice", async function () {
    const r = await cron("/api/cron/billing");
    const raised = (r.json.data.raised || []).find((x) => x.brand === "RT Auto Brand");
    const n = sql("select count(*) from \"BrandInvoice\" where \"brandId\"='rt8_b';");
    return !raised && n === "1" ? true : "there are now " + n + " invoices";
  });

  section("8. Step three: the brand pays, and nobody is told to do anything");

  await check("Stripe reports the payment and the sale is released", async function () {
    await stripe.invoices.pay(stripeInvoiceId, { paid_out_of_band: true });
    for (let i = 0; i < 20; i++) {
      if (sql("select stage from \"Sale\" where id='rt8_s';") === "PAID_TO_PLUGGZ") return true;
      await sleep(1500);
    }
    return "the sale is still " + sql("select stage from \"Sale\" where id='rt8_s';");
  });

  section("8. Step four: the creators are paid on the 1st and the 15th");

  await check("on an ordinary day the schedule pays nothing", async function () {
    const r = await cron("/api/cron/payouts");
    if (!r.json || !r.json.ok) return msg(r);
    const today = new Date().getUTCDate();
    if (today === 1 || today === 15) return true; // it would be right to pay
    return r.json.data.skipped === true ? true : "it paid on a day that is not the 1st or the 15th";
  });

  await check("forced, it pays the creator and asks Stripe about them first", async function () {
    // Fund the platform balance the way real income would.
    const bal = await stripe.balance.retrieve();
    const gbp = bal.available.filter((b) => b.currency === "gbp").reduce((t, b) => t + b.amount, 0);
    if (gbp < 5000) {
      await stripe.charges.create({ amount: 20000, currency: "gbp", source: "tok_bypassPending",
        description: "Test balance for an automatic payout run" });
    }
    const r = await cron("/api/cron/payouts?force=1");
    if (!r.json || !r.json.ok) return msg(r);
    const row = (r.json.data.results || []).find((x) => x.handle === "rt8creator");
    if (!row) return "the creator does not appear in the run";
    return row.outcome === "Sent" && row.pence === 3500
      ? true : "outcome was " + row.outcome + " for " + row.pence;
  });

  await check("our copy of their readiness was corrected on the way", function () {
    const v = sql("select \"stripePayoutsEnabled\"::text from \"CreatorProfile\" where id='rt8_c';");
    return v === "true" ? true : "it still says " + v;
  });

  await check("the sale is now paid to the creator, with a transfer against it", function () {
    const s = sql("select stage from \"Sale\" where id='rt8_s';");
    const t = sql("select coalesce(\"stripeTransferId\",'') || '|' || coalesce(\"paidBy\"::text,'') from \"Payout\" where \"profileId\"='rt8_c';");
    return s === "PAID_TO_CREATOR" && t.startsWith("tr_") && t.endsWith("|STRIPE")
      ? true : "stage " + s + ", payout " + t;
  });

  await check("a second forced run sends nothing further", async function () {
    const r = await cron("/api/cron/payouts?force=1");
    const row = (r.json.data.results || []).find((x) => x.handle === "rt8creator");
    return !row ? true : "it tried to pay them again: " + row.outcome;
  });

  section("8. Step five: the company's own share, and the books");

  await check("Stripe's payments into the company bank are recorded", async function () {
    const r = await cron("/api/cron/billing");
    if (!r.json || !r.json.ok) return msg(r);
    const synced = r.json.data.companyPayoutsSynced;
    return synced && typeof synced.seen === "number"
      ? true : "no sync result came back";
  });

  await check("the ledger adds up", function () {
    const inFrom = Number(sql("select coalesce(sum(\"amountPence\"),0) from \"BrandInvoice\" where status='PAID';"));
    const outTo = Number(sql("select coalesce(sum(\"amountPence\"),0) from \"Payout\" where status='SENT';"));
    const earned = Number(sql("select coalesce(sum(\"pluggzAmountPence\"),0) from \"Sale\" where status='APPROVED' and stage in ('PAID_TO_PLUGGZ','PAID_TO_CREATOR');"));
    // Everything a brand paid is either a creator's or Pluggz's, and nothing else.
    return inFrom === outTo + earned
      ? true : "in " + inFrom + " does not equal out " + outTo + " plus earned " + earned;
  });

  await check("the money screen loads", async function () {
    const r = await fetch(BASE + "/admin/money", { redirect: "manual" });
    return [200, 302, 307].includes(r.status) ? true : "status " + r.status;
  });

  console.log("\nSTRIPE_ACCT=" + readyAccount);
  const pass = results.filter((r) => r[1] === "pass").length;
  const bad = results.filter((r) => r[1] !== "pass");
  console.log("\n\x1b[1mSuite 8: " + pass + " of " + results.length + " passed\x1b[0m");
  for (const b of bad) console.log("  " + b[0] + "  ::  " + b[2]);
})();
