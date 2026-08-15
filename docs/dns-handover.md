# Pluggz DNS Setup

For Rachel to connect the domain. One-time, and everything after it is handled
by the dev team.

**Server:** Contabo Cloud VPS, Portsmouth, United Kingdom. The origin address
is sent separately rather than written here, because Cloudflare hides it, and
publishing it would let anyone bypass the proxy and reach the server directly.

---

## Which domain is the live one

Two are registered:

- `pluggzofficial.com`
- `pluggzofficial.co.uk`

**Only one can be the real site.** If both serve the same pages, Google splits
its ranking across the two and neither performs as well as one would alone. The
other should redirect to it.

**Decided: `pluggzofficial.co.uk` is the primary domain.** `pluggzofficial.com`
redirects to it.

That follows the company's own email. Google Workspace runs on
`pluggzofficial.co.uk`, so that's the address creators and brands already see
Pluggz from. A creator link reading `pluggzofficial.co.uk/go/a7f3k2` matches the
address in the email that invited them, which is exactly the consistency that
makes a link feel safe to click. It also suits a UK-only platform.

`pluggzofficial.com` keeps working, so anyone who types it lands in the right
place. Both domains still need connecting.

---

## What Rachel does: one change per domain, at GoDaddy

Both domains are registered with **GoDaddy**. The change is the same for each:

**GoDaddy → My Products → *(the domain)* → DNS → Nameservers → Change →
"I'll use my own nameservers"** → replace both entries → Save.

### 1. `pluggzofficial.co.uk`: the main site

Replace `ns17.domaincontrol.com` and `ns18.domaincontrol.com` with:

```
merlin.ns.cloudflare.com
paityn.ns.cloudflare.com
```

### 2. `pluggzofficial.com`: redirects to the above

Replace `ns23.domaincontrol.com` and `ns24.domaincontrol.com` with:

```
algin.ns.cloudflare.com
sonia.ns.cloudflare.com
```

> **The two pairs are different.** Cloudflare issues a separate pair per domain,
> so `merlin`/`paityn` must go on the `.co.uk` and `algin`/`sonia` on the
> `.com`. Swapping them stops both from working.

Nothing else at GoDaddy needs touching. In particular, do **not** remove any
email records. The Google Workspace mail on `pluggzofficial.co.uk` has already
been copied into Cloudflare and will keep working through the change.

**DNSSEC:** already checked on both domains. It's off, so there's no risk of
the domains going dark during the switch. Nothing to do here.

**Why nameservers rather than a list of records.** Once DNS is on Cloudflare,
every record (website, email, security) is managed by the dev team from
there. Rachel never has to be asked for another DNS change, including if the
site ever moves to a different server. Sending individual records instead means
going back to her every time anything moves, and each round trip risks hours of
downtime.

It also brings, free:

- SSL (the padlock), renewed automatically
- CDN caching, so pages load fast for UK shoppers
- DDoS protection

**The two nameserver values are issued when the domain is added to Cloudflare.**
they look like `alice.ns.cloudflare.com`. They'll be sent as soon as the
Cloudflare account exists; it takes about ten minutes to set up.

---

## Alternative: records at the registrar

If changing nameservers isn't possible, these go in at the current registrar
instead. Slower to change later, but it works.

| Type  | Name  | Value              | TTL  |
| ----- | ----- | ------------------ | ---- |
| A     | `@`   | *(origin IP, sent separately)* | Auto |
| A     | `www` | *(origin IP, sent separately)* | Auto |

---

## Email: one thing worth knowing

`pluggzofficial.co.uk` currently has **no SPF record at all**. Google Workspace
is running on it, so Lisa and Rachel's own business email is already going out
unauthenticated, so it is more likely to land in spam, and the domain can be spoofed by
anyone. This predates the platform work; it's worth fixing regardless.

The fix has to cover both senders in a single record, because a domain may only
have one SPF:

```
v=spf1 include:_spf.google.com include:spf.brevo.com ~all
```

- `_spf.google.com`: Lisa and Rachel's existing Workspace email
- `spf.brevo.com`: the platform's creator verification and invite emails

Adding only Brevo's half would authenticate the platform and break Workspace.
The dev team will add this, plus DKIM, in Cloudflare once DNS is live there.

The existing `_dmarc` record (inherited from GoDaddy) sends failure reports to
`onsecureserver.net` and is set to `p=quarantine`, so anything failing goes to
spam. It needs replacing once SPF and DKIM are correct, otherwise it works
against the domain rather than for it.

---

## Sequence

| Step | Owner | Status |
| ---- | ----- | ------ |
| Server built, app deployed and live | Dev team | ✅ done |
| Both domains added to Cloudflare, records configured | Dev team | ✅ done |
| Email records preserved, DNSSEC verified off | Dev team | ✅ done |
| **Nameservers updated at GoDaddy, both domains** | **Rachel** | ← waiting on this |
| DNS propagates | n/a | 15 min to 4 hrs after the change |
| SSL certificates issued | Dev team | 10 min after propagation |
| `.com` redirect to `.co.uk` | Dev team | 5 min |
| SPF, DKIM and DMARC | Dev team | 10 min |
| Live on the domain | n/a | same day as the nameserver change |

The site stays reachable throughout. Nothing goes dark while this happens.

---

## One thing to confirm

Both domains should be registered in **Pluggz's own account**, not a
developer's or an agency's. The development agreement puts production
infrastructure in the client's name, and the domain is the piece that matters
most: a site can be rebuilt, but a domain held in someone else's account can't
simply be taken back. Worth checking while this is being set up.
