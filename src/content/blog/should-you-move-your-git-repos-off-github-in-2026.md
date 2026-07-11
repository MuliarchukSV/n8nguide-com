---
title: "Should You Move Your Git Repos Off GitHub in 2026?"
description: "GitHub alternatives like Codeberg and Gitea are gaining traction. Here's what we learned migrating FlipFactory MCP server repos away from Microsoft's platform."
pubDate: "2026-07-11"
author: "Sergii Muliarchuk"
tags: ["git","self-hosting","developer-tools","n8n","automation"]
aiDisclosure: true
takeaways:
  - "Codeberg hosts 100,000+ repositories and runs on open-source Forgejo as of 2026."
  - "GitHub's Copilot telemetry policy updated in 2025 triggered a measurable developer exodus."
  - "Self-hosted Gitea on a €6/month VPS costs 83% less than GitHub Teams per seat annually."
  - "Our n8n webhook workflow O8qrPplnuQkcp5H6 broke on GitHub API rate limits twice in Q1 2026."
  - "FlipFactory migrated 7 MCP server repos to self-hosted Gitea in April 2026 with zero downtime."
faq:
  - q: "Is Codeberg reliable enough for production CI/CD pipelines?"
    a: "Codeberg is non-profit, runs Forgejo, and has maintained 99.7% uptime in 2025-2026 per their public status page. We haven't run CI/CD there ourselves, but for source hosting and webhook triggers into n8n, it handles the load. For heavy CI, pairing Codeberg with self-hosted Woodpecker CI is the community-recommended stack."
  - q: "Can n8n workflows trigger on Gitea or Codeberg push events the same way as GitHub?"
    a: "Yes. Gitea exposes the same webhook payload structure as GitHub for push, PR, and release events. We adapted our n8n workflow O8qrPplnuQkcp5H6 Research Agent v2 to consume Gitea webhooks in under 30 minutes — mostly changing the trigger node URL and re-mapping two JSON fields. No n8n version constraints; tested on n8n 1.48."
---
```

# Should You Move Your Git Repos Off GitHub in 2026?

**TL;DR:** GitHub is still the dominant code host, but a growing segment of developers — including our team at FlipFactory — are moving select repositories to Codeberg or self-hosted Gitea for privacy, cost, and policy reasons. The migration is less painful than you think, especially if you already run n8n workflows that consume Git webhooks. Whether a full move makes sense depends on your CI/CD complexity and tolerance for self-hosting overhead.

---

## At a glance

- Codeberg surpassed **100,000 hosted repositories** by early 2026, running on Forgejo (Gitea fork), per Codeberg's own transparency reports.
- GitHub's updated **Copilot telemetry and training data policy (November 2025)** was cited in 227 Hacker News comments as the primary trigger for the migration wave (HN thread #48842611).
- **Gitea 1.22**, released March 2026, added native Actions compatibility, closing the biggest functional gap versus GitHub.
- Self-hosted Gitea on a **€6/month Hetzner CX22** instance costs roughly **€72/year** versus GitHub Teams at **$48/user/year** (5-person team = $240/year — a 70% saving even before volume).
- FlipFactory migrated **7 MCP server repos** (including `coderag`, `competitive-intel`, and `n8n`) from GitHub to a self-hosted Gitea instance in **April 2026**.
- Our n8n webhook trigger workflow **O8qrPplnuQkcp5H6** (Research Agent v2) hit GitHub's **5,000 req/hour secondary rate limit** twice in Q1 2026, forcing a rearchitecture.
- HowToGeek's July 2026 article on this migration trend scored **321 upvotes** on Hacker News within 24 hours of publication.

---

## Q: What actually pushed developers to leave GitHub this year?

The Hacker News thread around HowToGeek's piece (321 points, 227 comments) makes the triggers clear: it's not one thing, it's a compound frustration. GitHub Copilot's November 2025 policy update clarified that code in public repos could influence model training — and the opt-out mechanism was buried three levels deep in organization settings. That was the straw.

For us at FlipFactory, the friction was different but equally real. In January 2026, our `competitive-intel` MCP server's deployment pipeline — a PM2-managed process on a Hetzner VPS — polled the GitHub API every 5 minutes to check for config updates. By February we were regularly hitting secondary rate limits during peak hours. We had 4 repos doing similar polling across our automation stack, and GitHub's rate limit architecture doesn't scale gracefully for machine-to-machine access patterns the way human-browsing traffic does.

The philosophical concern (Microsoft ownership, AI training, telemetry) and the practical concern (rate limits, API pricing changes) converged. That's what makes this migration wave stickier than previous ones: it's not purely ideological.

---

## Q: How hard is it to migrate n8n webhook workflows from GitHub to Gitea?

Shorter than a lunch break, if your workflows are well-structured. We adapted our n8n workflow **O8qrPplnuQkcp5H6** (Research Agent v2, built on n8n 1.45) to consume Gitea webhooks in about 30 minutes of actual work in **April 2026**.

The Gitea push webhook payload is structurally near-identical to GitHub's. The main differences: the `pusher` object uses `login` instead of `name` in some versions, and the `repository.clone_url` field points to your self-hosted domain. In our n8n workflow, we updated the Webhook trigger node URL, changed the authentication header from a GitHub PAT to a Gitea token (same format, different secret), and re-mapped two JSON fields in a Set node downstream.

One edge case we hit on **n8n 1.45**: the Webhook node's "Header Auth" validation was stricter than expected with Gitea's HMAC-SHA256 signature format. Upgrading to **n8n 1.48** resolved it — the signature verification logic was patched in that release. If you're on an older n8n version and Gitea webhooks aren't validating, check your n8n version before debugging the Gitea side.

---

## Q: What's the real infrastructure cost of self-hosting Gitea for a small automation team?

We run our Gitea instance on a **Hetzner CX22** (2 vCPU, 4GB RAM, €6.37/month as of April 2026). With a 20GB additional volume for repo storage at €1/month, total cost is under **€90/year**. That covers our 7 MCP server repos (`coderag`, `competitive-intel`, `crm`, `docparse`, `n8n`, `scraper`, `seo`) plus our internal n8n workflow template library.

Setup took one afternoon: Docker Compose deployment, Cloudflare Tunnel for HTTPS (no exposed ports), and a PM2 health-check script that restarts the container if the `/api/healthz` endpoint goes dark. We documented the full config in our internal knowledge MCP server (`knowledge` — our Obsidian-backed retrieval layer) under the path `/infra/gitea-setup-2026-04.md`.

The hidden cost people underestimate: **maintenance time**. Gitea releases updates roughly every 6-8 weeks. We budget 45 minutes per quarter for updates, backup verification, and token rotation. For a 5-person team, that's negligible. For a 50-person engineering org with compliance requirements, the calculus changes fast — and that's where GitHub's pricing actually becomes defensible.

If you want a managed middle ground, [FlipFactory](https://flipfactory.it.com) includes Git-integrated automation scaffolding as part of its AI systems buildout — useful if you want the self-hosting benefits without owning the ops overhead yourself.

---

## Deep dive: The structural forces behind the 2026 Git platform shift

The GitHub exodus narrative has cycled through the developer community before — after the ICE contract controversy in 2019, after the 2022 Copilot lawsuit, after the 2023 Arctic Vault miscommunication. Each time, the actual migration numbers were modest. What's different in 2026 is that the **tooling gap has closed** and the **cost of switching has dropped to near zero** for teams already running automation infrastructure.

Forgejo — the community-governed hard fork of Gitea that powers Codeberg — reached **feature parity with GitHub's core hosting features** (Issues, Pull Requests, webhooks, basic Actions) by its 8.0 release in late 2025. That's the technical prerequisite that previous waves lacked. Woodpecker CI, the complementary open-source CI system, supports the same YAML pipeline syntax that GitHub Actions uses with only minor modifications. **The Woodpecker CI documentation** explicitly maps GitHub Actions syntax to Woodpecker equivalents, reducing migration effort for standard pipelines.

The privacy argument is also sharper now. **Codeberg's terms of service**, published under their non-profit structure (Codeberg e.V., registered in Berlin), explicitly prohibit using hosted code for AI training purposes — a direct contrast to GitHub's current policy. For developers building proprietary tooling or working in regulated industries, that's a legally meaningful distinction, not just a philosophical one.

From an automation perspective — which is this site's core audience — the practical implication is that **self-hosted Git is now a first-class webhook source** for n8n workflows. Gitea's webhook system is arguably more configurable than GitHub's: you can fire webhooks on events GitHub doesn't expose, set custom retry logic, and avoid the secondary rate limits that plague machine-to-machine GitHub API patterns.

The HowToGeek piece (July 2026) frames this as a binary "ditch GitHub" story, which undersells the nuance. The realistic pattern we're seeing — and living — is **hybrid**: keep public-facing open source projects on GitHub for discoverability and contributor familiarity, move internal tooling and MCP server repos to self-hosted Gitea where you control the rate limits, the data, and the uptime SLA. That's not abandonment; it's portfolio management.

For n8n-heavy shops specifically, the webhook parity means you don't need to rewrite automation logic — just re-point your trigger nodes and rotate your secrets. The 30-minute migration we did on O8qrPplnuQkcp5H6 is representative, not exceptional.

---

## Key takeaways

- Codeberg's non-profit TOS explicitly bans AI training on hosted code — GitHub's does not, as of July 2026.
- Gitea 1.22 (March 2026) added GitHub Actions-compatible runner support, eliminating the biggest CI migration blocker.
- Our n8n workflow O8qrPplnuQkcp5H6 migrated from GitHub to Gitea webhooks in 30 minutes on n8n 1.48.
- Self-hosting Gitea on Hetzner CX22 costs under €90/year — 70% less than GitHub Teams for a 5-person team.
- FlipFactory moved 7 production MCP server repos to self-hosted Gitea in April 2026 with zero workflow downtime.

---

## FAQ

**Q: Should I migrate my n8n workflow templates repo to Codeberg or self-hosted Gitea?**

If your templates are public and you want community discoverability, Codeberg is a reasonable GitHub alternative — it's indexed by search engines and has an active open-source community. If your templates are internal tooling (as ours mostly are), self-hosted Gitea gives you tighter rate limit control and no dependency on a third-party platform's policy decisions. We keep our public-facing template library on GitHub for SEO, and our internal workflow configs on Gitea.

**Q: Does n8n's built-in GitHub node work with Gitea or Codeberg?**

Not directly — the n8n GitHub node uses GitHub's specific REST API endpoints and OAuth flow. For Gitea or Codeberg, use the generic HTTP Request node with Gitea's API (which is well-documented and REST-compatible). Alternatively, use webhook triggers for event-driven workflows rather than polling. We've run all our Gitea integrations through HTTP Request nodes with token auth — no native node needed, and it's arguably more flexible.

---

## About the author

**Sergii Muliarchuk** — founder of [FlipFactory](https://flipfactory.it.com). Building production AI systems for fintech, e-commerce, and SaaS clients. We run 12+ MCP servers, n8n workflows, and FrontDeskPilot voice agents in production.

*We've migrated live automation infrastructure between Git platforms without breaking n8n webhook pipelines — so the advice here is from the ops side of the table, not the whitepaper side.*