---
title: "Your First n8n Workflow in 10 Minutes"
description: "Step-by-step tutorial to build your first n8n workflow. Connect a webhook trigger to Slack notifications with zero coding required."
pubDate: "2026-03-30"
author: "FlipFactory Editorial Team"
tags: ["n8n", "tutorial", "beginner", "workflow", "webhook"]
aiDisclosure: true
faq:
  - q: "What if my first workflow fails to execute?"
    a: "Check the execution log by clicking the Executions tab in your workflow. n8n shows the exact data at each node, making it easy to spot where things went wrong. Common issues include invalid credentials, incorrect field mappings, or webhook URLs that haven't been activated yet."
  - q: "Can I schedule this workflow to run automatically instead of using a webhook?"
    a: "Yes. Replace the Webhook node with a Schedule Trigger node. You can set it to run at specific intervals (every 5 minutes, hourly, daily) or use cron expressions for precise scheduling. The rest of the workflow stays exactly the same."
---

**TLDR:** This hands-on tutorial walks you through building a complete n8n workflow from scratch — a webhook that receives data and sends a formatted Slack notification. No coding required. By the end, you will understand triggers, nodes, connections, expressions, and testing. The entire process takes about 10 minutes whether you use n8n Cloud or a self-hosted instance. This is the foundation for everything you will build with n8n going forward.

## Prerequisites

Before starting, you need two things:

1. **A running n8n instance** — either sign up at [n8n.io](https://n8n.io) for Cloud, or run `npx n8n` locally (requires Node.js 18+). Docker works too: `docker run -p 5678:5678 n8nio/n8n`.

2. **A Slack workspace** where you can add apps (or any messaging tool — we will note alternatives along the way).

Open your n8n editor at `http://localhost:5678` (self-hosted) or your Cloud URL. You should see a blank canvas. This is where we build.

## Step 1: Add the Webhook Trigger

Every workflow starts with a trigger. Click the **+** button on the canvas and search for "Webhook". Select the **Webhook** node.

Configure it:
- **HTTP Method**: POST
- **Path**: `my-first-webhook`

Click **Listen for Test Event** — this activates the webhook and waits for incoming data. Copy the test webhook URL shown (it looks like `http://localhost:5678/webhook-test/my-first-webhook`).

Now send a test request. Open a terminal and run:

```bash
curl -X POST http://localhost:5678/webhook-test/my-first-webhook \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "event": "signup", "email": "alice@example.com"}'
```

The Webhook node should light up green, showing the received data. Click on it to inspect the output — you will see the JSON body, headers, and query parameters.

## Step 2: Transform the Data

Raw webhook data rarely matches what you want to send downstream. Add a **Set** node to format the message.

Click the **+** button after the Webhook node, search for "Set", and add it. Configure a new field:

- **Name**: `message`
- **Value**: `New signup: {{ $json.name }} ({{ $json.email }})`

The `{{ }}` syntax is n8n's expression language. It lets you reference data from previous nodes dynamically. Click **Execute Node** to test — you should see the formatted message in the output.

Here is what the expression engine supports:

```javascript
// Reference fields from the current item
{{ $json.fieldName }}

// Use JavaScript methods
{{ $json.name.toUpperCase() }}

// Conditional logic
{{ $json.event === 'signup' ? 'Welcome!' : 'Update' }}

// Access data from specific nodes
{{ $('Webhook').item.json.email }}
```

## Step 3: Send a Slack Notification

Add a **Slack** node after the Set node. If you do not use Slack, substitute with **Telegram**, **Discord**, **Email**, or **HTTP Request** (for any API).

Configure the Slack node:
1. Click **Credential** and create a new Slack OAuth2 credential (follow the prompts to authorize your workspace)
2. Set **Resource**: Message
3. Set **Operation**: Send
4. Set **Channel**: select your target channel (e.g., #general or #notifications)
5. Set **Text**: `{{ $json.message }}`

Click **Execute Node**. Check your Slack channel — the notification should appear.

## Step 4: Test the Complete Workflow

Now test everything end-to-end:

1. Click **Listen for Test Event** on the Webhook node again
2. Send another curl request from your terminal
3. Watch data flow through all three nodes: Webhook receives data, Set transforms it, Slack sends the notification

If any node fails, click on it to see the error. n8n shows the exact input and output at every step, making debugging straightforward.

## Step 5: Activate and Go Live

Once testing passes, toggle the **Active** switch in the top-right corner. This does two things:

1. Changes the webhook URL from `webhook-test` to `webhook` (the production URL)
2. Keeps the workflow running in the background, ready to process incoming requests

Your production URL is now:
```
http://localhost:5678/webhook/my-first-webhook
```

Point any service, form, or script to this URL and n8n will process every request automatically.

## Making It More Useful

This basic pattern — trigger, transform, send — is the foundation of most n8n workflows. Here are quick extensions:

**Add error handling**: Insert an **If** node after the Webhook to validate incoming data. Route invalid requests to a logging node instead of Slack.

**Add multiple destinations**: After the Set node, connect both a Slack node and an Email node. n8n executes parallel branches simultaneously.

**Store the data**: Add a **PostgreSQL** or **Google Sheets** node to log every webhook event for later analysis.

**Rate limiting**: Use the **Wait** node to batch notifications. Instead of sending one Slack message per event, collect events for 5 minutes and send a summary.

```json
// Example: a more complex webhook payload
{
  "name": "Alice",
  "event": "signup",
  "email": "alice@example.com",
  "plan": "pro",
  "source": "landing-page",
  "timestamp": "2026-03-30T10:00:00Z"
}
```

Each field becomes available as `{{ $json.fieldName }}` in subsequent nodes, so you can build as complex a transformation as you need.

## What You Learned

In 10 minutes, you covered the core concepts that apply to every n8n workflow:

- **Triggers** start workflows (webhooks, schedules, app events)
- **Nodes** perform actions (transform, send, store, branch)
- **Expressions** reference data dynamically between nodes
- **Testing** happens node-by-node and end-to-end
- **Activation** moves workflows from test to production

From here, explore the n8n template library (1000+ examples) or check out our other tutorials on error handling, AI integrations, and advanced webhook patterns. The foundation you just built scales to workflows of any complexity.
