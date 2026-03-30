---
title: "n8n + Claude API: Build AI-Powered Workflows"
description: "Connect n8n to Anthropic's Claude API for intelligent automation. Includes examples for content generation, classification, and document processing."
pubDate: "2026-03-30"
author: "FlipFactory Editorial Team"
tags: ["n8n", "claude", "ai", "api", "anthropic", "llm"]
aiDisclosure: true
faq:
  - q: "How much does using Claude API with n8n cost?"
    a: "Claude API pricing is usage-based. Claude Haiku 4.5 costs roughly $0.25 per million input tokens and $1.25 per million output tokens — a typical workflow processing 100 emails per day costs under $1/month. Claude Sonnet 4 is more capable but pricier. Combined with self-hosted n8n (no per-execution fees), AI-powered workflows are remarkably affordable."
  - q: "Should I use the n8n AI Agent node or direct HTTP Request for Claude?"
    a: "Use the built-in AI Agent node for conversational workflows that need memory, tool use, or multi-turn reasoning. Use the HTTP Request node when you need precise control over the API payload — specific system prompts, temperature settings, structured output schemas, or when using features not yet supported by the built-in node."
---

**TLDR:** Combining n8n with Anthropic's Claude API unlocks powerful AI-driven automation — document processing, email classification, content generation, and intelligent routing — all without writing application code. n8n's visual workflow builder handles the orchestration while Claude provides the intelligence. This guide covers both the built-in AI nodes and direct HTTP Request approaches, with three production-ready workflow examples you can import and customize today.

## Why Claude + n8n?

The Claude API from Anthropic is one of the most capable language model APIs available. Claude excels at nuanced text analysis, following complex instructions, and structured output — exactly the tasks that make automation workflows smarter.

n8n, with its 1200+ integrations and visual workflow builder, provides the perfect orchestration layer. Instead of writing Python scripts to call Claude and pipe results to Slack, you build it visually and deploy it in minutes.

Together, they enable workflows that were previously impossible without custom application development.

## Setting Up Claude Credentials in n8n

First, get your API key from the [Anthropic Console](https://console.anthropic.com/). Then configure it in n8n:

1. Go to **Settings > Credentials** in your n8n instance
2. Click **Add Credential** and search for "Anthropic" or "HTTP Header Auth"
3. For the Anthropic credential type, paste your API key
4. For HTTP Header Auth: set Header Name to `x-api-key` and Header Value to your key

The dedicated Anthropic credential works with n8n's built-in AI nodes. The HTTP Header Auth approach works with the HTTP Request node for direct API access.

## Method 1: Using n8n's Built-in AI Nodes

n8n includes dedicated AI nodes that simplify common LLM tasks:

**AI Agent Node** — for conversational workflows with tool use:

```
Trigger → AI Agent (Claude) → Process Result → Output
```

Configure the AI Agent:
- **Model**: Claude Sonnet 4 (best balance of quality and speed) or Claude Haiku 4.5 (fastest, cheapest)
- **System Message**: Define the agent's role and constraints
- **Tools**: Connect sub-workflows as tools the agent can call

**Text Classifier Node** — for categorization tasks:

```
Email Trigger → Text Classifier (Claude) → Switch → Route to Team
```

This node sends text to Claude with predefined categories and returns the classification, making it perfect for routing, triage, and sorting workflows.

## Method 2: Direct HTTP Request

For maximum control, use the HTTP Request node to call the Claude Messages API directly:

Configure an HTTP Request node:
- **Method**: POST
- **URL**: `https://api.anthropic.com/v1/messages`
- **Headers**:
  - `x-api-key`: `{{ $credentials.httpHeaderAuth.value }}`
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`

**Body (JSON):**

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "system": "You are a data extraction assistant. Return only valid JSON.",
  "messages": [
    {
      "role": "user",
      "content": "Extract the company name, contact email, and deal value from this email:\n\n{{ $json.emailBody }}"
    }
  ]
}
```

The response arrives as JSON. Access Claude's reply with:
```
{{ $json.content[0].text }}
```

## Example 1: Intelligent Email Router

This workflow monitors an inbox and routes emails to the right team automatically.

**Workflow structure:**
```
IMAP Trigger → HTTP Request (Claude) → Switch → Slack Channels
```

The Claude prompt:

```
Classify this email into exactly one category:
- support: customer needs help with existing product
- sales: potential customer interested in buying
- billing: payment or invoice related
- spam: irrelevant or promotional

Email subject: {{ $json.subject }}
Email body: {{ $json.text }}

Respond with only the category name, nothing else.
```

The Switch node routes based on Claude's response — support emails go to #support, sales to #sales-pipeline, billing to #finance, spam to trash. This eliminates manual email sorting and ensures every message reaches the right person within seconds.

## Example 2: Document Processing Pipeline

Process invoices, contracts, or reports that arrive by email.

**Workflow structure:**
```
IMAP → Extract Attachments → PDF to Text → HTTP Request (Claude) → Google Sheets + Slack
```

The Claude prompt for invoice extraction:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2048,
  "system": "Extract invoice data and return valid JSON with these fields: vendor_name, invoice_number, date, due_date, line_items (array of {description, quantity, unit_price, total}), subtotal, tax, total_amount, currency.",
  "messages": [
    {
      "role": "user",
      "content": "Extract all fields from this invoice:\n\n{{ $json.pdfText }}"
    }
  ]
}
```

Parse Claude's JSON response and send it to Google Sheets for the accounting team, Slack for notification, and optionally to QuickBooks or Xero via their API nodes.

## Example 3: Content Generation with Quality Gate

Generate blog content drafts with built-in quality review.

**Workflow structure:**
```
Schedule → RSS Feed → HTTP Request (Claude: Draft) → HTTP Request (Claude: Review) → If Score > 7 → Google Docs + Slack
```

The two-pass approach is key. The first Claude call generates content, the second evaluates it with a critical eye:

**Review prompt:**
```
Rate this draft blog post on a scale of 1-10 for:
- Accuracy (factual correctness)
- Clarity (easy to understand)
- Actionability (reader can apply this)

Return JSON: {"accuracy": N, "clarity": N, "actionability": N, "average": N, "issues": ["..."]}

Draft:
{{ $json.content[0].text }}
```

Only drafts scoring above 7 proceed to Google Docs. Lower scores trigger a Slack alert for human review. At FlipFactory, we use a similar pattern to ensure AI-generated content meets quality standards before publication.

## Cost Optimization Tips

AI API costs can surprise you. Here are practical ways to keep them low:

1. **Use Haiku for simple tasks** — classification, extraction, and routing rarely need Sonnet's power. Haiku is 10x cheaper.

2. **Cache repeated queries** — use n8n's Function node to check a database before calling Claude. If you have classified a similar email before, reuse the result.

3. **Limit output tokens** — set `max_tokens` to the minimum needed. A classification task needs 10 tokens, not 1024.

4. **Batch when possible** — instead of one API call per item, batch 10-20 items in a single prompt. Claude handles lists efficiently.

5. **Monitor usage** — add a Code node that logs token counts from Claude's response headers to a database. Track daily costs.

## Going Further

The combination of n8n's workflow orchestration and Claude's language understanding opens up automation possibilities that were science fiction just two years ago. Start with one of the examples above, customize it for your specific use case, and expand from there. The n8n community forum has a growing collection of AI workflow examples worth exploring as well.
