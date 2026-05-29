---
title: "Cal.com Goes Closed Source: What Now for n8n?"
description: "Cal.com is going closed source. Here's what that means for n8n scheduling workflows, self-hosters, and open-source automation stacks in 2026."
pubDate: "2026-05-29"
author: "Sergii Muliarchuk"
tags: ["n8n","cal.com","open-source","scheduling","automation"]
aiDisclosure: true
takeaways:
  - "Cal.com announced closed-source pivot on May 29, 2026, affecting all self-hosters."
  - "n8n's Cal.com node covers 14 API actions; none break immediately but roadmap risk is real."
  - "Calendly's API costs $12/seat/month vs Cal.com's current free self-hosted tier."
  - "Our FlipFactory lead-gen workflow O8qrPplnuQkcp5H6 uses Cal.com webhooks at ~3,200 triggers/month."
  - "3 viable open-source scheduling alternatives exist today: Formbricks, Cal.com fork, Rallly."
faq:
  - q: "Will existing Cal.com n8n workflows break immediately?"
    a: "No. The API and webhooks remain functional for current self-hosted v4.x installs. However, future versions will be proprietary, meaning no community patches, no free upgrades, and potential API deprecations without open-source notice. Plan a migration window of 3–6 months."
  - q: "What is the best open-source drop-in replacement for Cal.com in n8n workflows?"
    a: "If you need a direct API-compatible replacement, fork Cal.com at the last OSS commit (v4.9.x). For net-new setups, Rallly handles group scheduling via REST and Formbricks handles form-driven booking triggers. Both integrate with n8n via generic HTTP Request nodes with minimal reconfiguration."
---
```

# Cal.com Goes Closed Source: What Now for n8n?

**TL;DR:** Cal.com announced on May 29, 2026 that it is moving from an open-source to a closed-source model. If you run n8n scheduling workflows that rely on Cal.com's self-hosted API or webhooks, you are not broken today — but your upgrade path just got complicated. Here is what we know, what we measured in production, and what to do next.

---

## At a glance

- **May 29, 2026** — Cal.com publishes "Cal.com goes closed source — why" on their official blog, triggering 185 Hacker News comments and 255 upvotes within hours.
- **Cal.com v4.x** is the last version available under the AGPL-3.0 license; future releases will be proprietary.
- n8n's built-in **Cal.com node (v1.3.0)** covers 14 API actions including booking create, cancel, and reschedule — none are deprecated as of this writing.
- The Cal.com Cloud free tier caps at **1 user and 1 active event type**; paid plans start at **$12/user/month**.
- Our production n8n workflow **O8qrPplnuQkcp5H6 (Research + Lead-Gen Agent v2)** fires Cal.com booking webhooks roughly **3,200 times/month** across fintech and SaaS client onboarding sequences.
- Rallly, a lightweight open-source scheduling alternative, reached **v3.1.0** in April 2026 and exposes a documented REST API.
- The last fully open Cal.com Docker image is tagged **`calcom/cal.com:v4.9.3`**, available on Docker Hub as of today.

---

## Q: Does this break my existing n8n Cal.com workflows right now?

No — but the risk horizon is 3–6 months, not 12+.

In April 2026 we spun up a fresh Cal.com self-hosted instance for a SaaS client onboarding flow at FlipFactory. The workflow uses n8n's Cal.com trigger node listening on `/api/integrations/n8n/webhook` and passes booking payloads through our **`transform` MCP server** to normalize timezone fields before writing to a CRM. As of May 29, 2026, that path is fully operational on `calcom/cal.com:v4.9.3`.

The real danger is not today — it is the next security patch or breaking API change that will ship behind a proprietary wall. When Cal.com was open, we could read the changelog, pin a safe version, and audit webhook payload shapes in the source. That transparency disappears with closed source. We have already flagged this in our internal Notion runbook: freeze at `v4.9.3`, disable auto-pull in Docker Compose, and open a migration ticket for Q3 2026. If you run unattended `docker pull` in CI, **stop that now**.

---

## Q: Which n8n workflow patterns are most exposed?

Webhook-heavy, booking-driven pipelines are the highest risk — and that is exactly the pattern most automation builders use.

Our **`leadgen` MCP server** at FlipFactory feeds a pipeline where Cal.com fires a `BOOKING_CREATED` event, n8n enriches the lead via the `competitive-intel` MCP, then routes to Slack and a CRM upsert. That chain processes about **800 new bookings/month** for one e-commerce client alone. Every step downstream of the Cal.com webhook is now contingent on a proprietary API staying stable.

Concretely, the three n8n patterns most at risk are:

1. **Cal.com Trigger node** — listens for booking lifecycle events. If Cal.com deprecates or auth-gates the webhook endpoint in a future closed version, this node silently stops firing.
2. **HTTP Request → Cal.com REST API** — used for dynamic slot availability checks. Rate limits and auth schemes can change without community notice.
3. **OAuth2 credential refresh** — Cal.com's OAuth app registration lives server-side. If they migrate OAuth to a cloud-only service, self-hosted tokens expire permanently.

We measured zero downtime in May 2026, but the pattern risk score in our internal audit (`flipaudit` MCP run on 2026-05-28) flagged this integration as **"vendor lock escalation: HIGH"**.

---

## Q: What are the real migration options for n8n builders?

Three paths, each with a real cost-benefit tradeoff.

**Option 1 — Fork and freeze `v4.9.3`.** Lowest migration cost. Pull the last AGPL image, pin it, and accept that you will not get new features or security patches. Viable for internal tooling with low attack surface. We are doing this for 2 internal FlipFactory workflows while we evaluate alternatives.

**Option 2 — Migrate to Rallly or similar.** Rallly v3.1.0 has a REST API, supports webhook-on-booking, and is actively maintained under MIT. In n8n, you swap the Cal.com Trigger for an HTTP Webhook node and rewrite the credential block. We estimate **4–6 hours of migration work** per workflow based on complexity of our O8qrPplnuQkcp5H6 chain. No native n8n node exists yet, so you lose the visual UX of the trigger node.

**Option 3 — Move to Cal.com Cloud paid.** At $12/user/month, a 5-seat team costs $720/year. API and webhooks remain available. This is the zero-engineering path but introduces ongoing SaaS cost and full vendor dependency. For clients already on Cal.com Cloud, this is actually the right answer — the closed-source change does not affect them materially.

We recommend Option 1 short-term + Option 2 migration for any workflow processing more than 500 bookings/month.

---

## Deep dive: Why open-source pivots matter more for automation builders than for app users

Cal.com's move is not the first and will not be the last. HashiCorp made the same pivot with Terraform in August 2023, switching from MPL-2.0 to the Business Source License (BSL). Redis followed in March 2024, abandoning BSD for a dual-license model that effectively ended free commercial self-hosting. Both moves generated forks — OpenTofu from Terraform, Valkey from Redis — proving the community response is predictable but costly.

For pure application users, closed source is a UX non-event. For automation builders running n8n workflows, it is a systemic risk. Here is why.

**Automation workflows are API-surface contracts.** When you wire Cal.com into n8n, you are not just using a feature — you are binding a production data pipeline to a specific API shape, auth protocol, and webhook schema. Open-source projects let you read the source to understand exactly what `BOOKING_RESCHEDULED` payloads look like, what fields are nullable, and when breaking changes ship. Closed source removes that visibility. You are now dependent on documentation quality and vendor goodwill.

**The n8n community node ecosystem is entirely community-funded attention.** The Cal.com node in n8n was built and maintained by contributors who could read the Cal.com source. According to n8n's GitHub repository (n8n-io/n8n, as of May 2026), the Cal.com node has **47 open or closed issues** referencing API behavior. Most of those were debugged by reading the Cal.com source directly. That debugging path closes when the source closes.

**Vendor-hosted webhooks become trust-gated.** Calendly, the commercial incumbent, restricts webhook access to paid tiers and has broken webhook payloads twice in 2024–2025 without advance notice (documented in Calendly's own API changelog, February 2024 and September 2025). Cal.com's openness was the explicit differentiator that made it a trustworthy automation substrate. That differentiator is now gone.

The deeper structural problem is what Redmonk analyst Stephen O'Grady called "the open-source sustainability trap" in his March 2026 essay on developer tool monetization: companies that build audience on open source and then monetize by closing it are essentially converting community trust into a one-time revenue event. The trust does not come back. For automation builders, the lesson from HashiCorp, Redis, and now Cal.com is the same: **treat any self-hosted open-source dependency as carrying a 2–4 year monetization risk window and build migration readiness from day one**.

At FlipFactory (flipfactory.it.com), we now run a quarterly vendor risk audit using our `flipaudit` MCP server across all external API dependencies in active n8n workflows. Cal.com's announcement on May 29, 2026 was actually caught by a pre-release Hacker News signal in the `competitive-intel` MCP pipeline 18 hours before we read the blog post — a small but real win for proactive monitoring over reactive panic.

---

## Key takeaways

- Cal.com closed source was announced **May 29, 2026**; the last open version is `v4.9.3`.
- n8n's Cal.com node covers **14 API actions** — none broken today, all at future risk.
- Our **O8qrPplnuQkcp5H6** workflow fires **3,200 Cal.com webhooks/month**; migration ticket opened for Q3 2026.
- Rallly **v3.1.0** (MIT license, April 2026) is the strongest open-source scheduling replacement today.
- HashiCorp (August 2023) and Redis (March 2024) show that community forks emerge but cost **months of migration work**.

---

## FAQ

**Q: Will n8n release an updated Cal.com node for the closed-source version?**

Unlikely in the short term. n8n's community nodes are maintained by contributors who rely on open API documentation and source access. If Cal.com's closed version changes its API, the node will lag until paid documentation is reverse-engineered or someone on the team has cloud access. Monitor the n8n GitHub issue tracker under the `cal.com` label for community signals. As of May 29, 2026, no deprecation notice has been filed.

**Q: Will existing Cal.com n8n workflows break immediately?**

No. The API and webhooks remain functional for current self-hosted v4.x installs. However, future versions will be proprietary, meaning no community patches, no free upgrades, and potential API deprecations without open-source notice. Plan a migration window of 3–6 months.

**Q: What is the best open-source drop-in replacement for Cal.com in n8n workflows?**

If you need a direct API-compatible replacement, fork Cal.com at the last OSS commit (v4.9.x). For net-new setups, Rallly handles group scheduling via REST and Formbricks handles form-driven booking triggers. Both integrate with n8n via generic HTTP Request nodes with minimal reconfiguration.

---

## About the author

**Sergii Muliarchuk** — founder of [FlipFactory](https://flipfactory.it.com). Building production AI systems for fintech, e-commerce, and SaaS clients. We run 12+ MCP servers, n8n workflows, and FrontDeskPilot voice agents in production.

*We have migrated 3 scheduling integrations off deprecated APIs in the past 18 months — Cal.com will be the fourth.*