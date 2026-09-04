#!/usr/bin/env node
//
// The Pluggz release suite. Run it on the server, against the running app.
//
//   sudo -u pluggz node tests/run.js
//
// It clears its own data between suites, so one suite can never leave state
// that makes the next one pass or fail for the wrong reason. That is not
// fussiness: the first time these ran back to back, a suite that deliberately
// exhausts the login rate limit left the next one unable to sign in, and the
// failure looked like a broken login rather than a test running too soon.
//
// Everything it creates is prefixed rt, and teardown.sql finds all of it by
// that pattern. The last thing this prints is what is left over, which should
// be nothing.

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const APP = process.env.PLUGGZ_APP || "/srv/pluggz";
const ENV_PATH = process.env.PLUGGZ_ENV || path.join(APP, ".env");
const BASE = process.env.PLUGGZ_BASE || "http://127.0.0.1:3000";
const HERE = __dirname;

const ENV = fs.readFileSync(ENV_PATH, "utf8");
const envOf = (k) => (ENV.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1] || "";
const DB = envOf("DATABASE_URL").replace(/"/g, "").replace(/[?&]schema=[^&]*/, "");
const STRIPE_KEY = envOf("STRIPE_SECRET_KEY");

// Ordered deliberately. The tracking suite deliberately exhausts the login
// rate limit to prove it works, so it runs last and nothing follows it.
const SUITES = [
  "01-public.js",
  "02-admin.js",
  "03-accounts.js",   // reads state left by 02
  "04-features.js",
  "05-money.js",
  "06-automatic.js",
  "07-tracking.js",
];

// 02 and 03 are a pair: the second continues where the first left off, so the
// database is not cleared between them.
const KEEPS_STATE_FROM_PREVIOUS = new Set(["03-accounts.js"]);

function psql(args, input) {
  return spawnSync("psql", [DB, ...args], { input, encoding: "utf8" });
}

/**
 * Forget that this machine has been signing in.
 *
 * Every suite drives the site from the loopback address, so they all share one
 * rate-limit budget: ten sign-ins a minute. A suite that signs in a few times
 * leaves the next one locked out, and the failure reads as a broken login
 * rather than a test running too soon. Suite 07 makes this worse on purpose by
 * exhausting the limit to prove it works.
 *
 * Only the loopback counters are cleared, never a real visitor's, so this
 * cannot weaken the limit for anybody the platform is actually protecting
 * against. If Redis is not reachable the counters are in the application's own
 * memory and expire in a minute by themselves, so there is nothing to do and
 * nothing worth failing over.
 */
function forgetLoopbackLimits() {
  const url = envOf("REDIS_URL").replace(/"/g, "");
  if (!url) return;
  const res = spawnSync("redis-cli", ["-u", url, "--scan", "--pattern", "rl:*"], {
    encoding: "utf8",
  });
  if (res.status !== 0 || !res.stdout) return;
  const mine = res.stdout
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.endsWith(":127.0.0.1") || k.endsWith(":::1") || k.endsWith(":unknown"));
  for (const k of mine) spawnSync("redis-cli", ["-u", url, "DEL", k], { encoding: "utf8" });
}

function wipe() {
  psql(["-q", "-f", path.join(HERE, "teardown.sql")]);
  // The probe administrator, which most suites sign in as.
  const bcrypt = require(path.join(APP, "node_modules", "bcryptjs"));
  const hash = bcrypt.hashSync("RtProbe!2026", 10);
  psql(["-q", "-c",
    `insert into "User" (id,email,"passwordHash",name,role,"emailVerified","createdAt","updatedAt")
     values ('rt_admin_user','rtadmin@pluggz.test','${hash}','Release Test Admin','ADMIN',now(),now(),now())
     on conflict (email) do update set "passwordHash" = excluded."passwordHash", role='ADMIN';`]);
  try { fs.unlinkSync("/tmp/rt-state.json"); } catch { /* not there */ }
}

/**
 * The importer is tested against a fixture page the site serves itself, which
 * lives in public/ and is committed.
 *
 * It is not copied in here because the application reads its public directory
 * once at boot: a file dropped in afterwards is not served until the app is
 * reloaded, and reloading production to run a test is the wrong trade. The
 * scraper also refuses loopback addresses, correctly, so the suite cannot just
 * serve it on a local port.
 */
function fixtureIsServed() {
  return fs.existsSync(path.join(APP, "public", "rt-fixture-product.html"));
}

function heading(text) {
  process.stdout.write("\n\x1b[1m════ " + text + " ════\x1b[0m\n");
}

(function main() {
  if (!DB) {
    console.error("No DATABASE_URL found in " + ENV_PATH);
    process.exit(1);
  }

  console.log("Pluggz release suite");
  console.log("  app      " + APP);
  console.log("  against  " + BASE);
  console.log("  stripe   " + (STRIPE_KEY ? STRIPE_KEY.slice(0, 8) + "..." : "not configured"));
  if (STRIPE_KEY && !STRIPE_KEY.startsWith("sk_test_")) {
    console.log("  note     the money suites will refuse to run: they create Stripe");
    console.log("           accounts and move money, so they need a test key");
  }

  if (!fixtureIsServed()) {
    console.error("");
    console.error("  public/rt-fixture-product.html is missing from the deployment.");
    console.error("  The catalogue import checks need it. Deploy it and try again.");
    process.exit(1);
  }
  const tally = [];

  try {
    for (const suite of SUITES) {
      if (!KEEPS_STATE_FROM_PREVIOUS.has(suite)) wipe();
      // Before every suite, including the one that carries state over, because
      // that one signs in too.
      forgetLoopbackLimits();
      heading(suite);
      const r = spawnSync("node", [path.join(HERE, suite)], {
        encoding: "utf8",
        env: { ...process.env, PLUGGZ_APP: APP, PLUGGZ_ENV: ENV_PATH, PLUGGZ_BASE: BASE, SK: STRIPE_KEY },
      });
      const out = (r.stdout || "") + (r.stderr || "");
      process.stdout.write(out);
      const line = (out.match(/(\d+) of (\d+) passed/) || []);
      if (line.length) tally.push({ suite, passed: Number(line[1]), total: Number(line[2]) });
      else if (/REFUSED/.test(out)) tally.push({ suite, passed: 0, total: 0, refused: true });
      else tally.push({ suite, passed: 0, total: 0, broken: true });
    }
  } finally {
    wipe();
    // Take the probe administrator with it. Nothing should be left behind.
    psql(["-q", "-c", `delete from "User" where email like 'rt%@pluggz.test';`]);
  }

  heading("Summary");
  let passed = 0, total = 0;
  for (const t of tally) {
    const note = t.refused ? "refused, needs a test key" : t.broken ? "DID NOT REPORT" : t.passed + " of " + t.total;
    console.log("  " + t.suite.padEnd(20) + note);
    passed += t.passed; total += t.total;
  }
  console.log("\n  " + passed + " of " + total + " checks passed");

  console.log("\n  anything left behind:");
  const left = psql(["-q", "-f", path.join(HERE, "teardown.sql")]);
  process.stdout.write((left.stdout || "").split("\n").map((l) => "  " + l).join("\n"));

  process.exit(passed === total ? 0 : 1);
})();
