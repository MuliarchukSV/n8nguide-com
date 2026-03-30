---
title: "Self-Hosting n8n: Complete Setup Guide"
description: "Deploy n8n on your own server with Docker. Covers installation, SSL, PostgreSQL, backups, and production hardening for reliable self-hosted automation."
pubDate: "2026-03-30"
author: "FlipFactory Editorial Team"
tags: ["n8n", "self-hosting", "docker", "devops", "tutorial"]
aiDisclosure: true
faq:
  - q: "What are the minimum server requirements for self-hosting n8n?"
    a: "n8n runs comfortably on a server with 1 CPU core, 2GB RAM, and 20GB storage. This handles dozens of active workflows and thousands of daily executions. For heavier loads (100+ workflows, high-frequency triggers), we recommend 2 cores and 4GB RAM. A $5-10/month VPS from Hetzner, DigitalOcean, or Contabo is sufficient for most teams."
  - q: "How do I update n8n when a new version is released?"
    a: "With Docker Compose, updating is two commands: `docker compose pull` to download the latest image, then `docker compose up -d` to restart with the new version. Your data persists in the PostgreSQL database and Docker volumes. We recommend testing updates on a staging instance first if you run critical production workflows."
---

**TLDR:** Self-hosting n8n gives you unlimited workflow executions, full data control, and zero per-task fees — all for the cost of a basic server ($5-20/month). This guide walks through the complete setup: Docker Compose deployment with PostgreSQL, nginx reverse proxy, SSL certificates, environment configuration, backups, and production hardening. By the end, you will have a production-ready n8n instance accessible via HTTPS on your own domain.

## Why Self-Host n8n?

Self-hosting n8n is the most popular deployment option for good reason. Compared to n8n Cloud, you get:

- **No execution limits** — run as many workflows as your server handles
- **Full data sovereignty** — credentials and workflow data never leave your infrastructure
- **Cost savings** — a $10/month server replaces a $50-300/month cloud subscription
- **Customization** — configure memory limits, execution timeouts, and queue modes
- **Compliance** — meet GDPR, HIPAA, or internal security requirements

The trade-off is responsibility: you handle updates, backups, and uptime. This guide covers all of that.

## Step 1: Server Setup

Start with a VPS from any provider. We recommend at least 2GB RAM for comfortable operation. SSH into your server and install Docker:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

Log out and back in for the group change to take effect.

## Step 2: Docker Compose Configuration

Create a project directory and the compose file:

```bash
mkdir -p /opt/n8n && cd /opt/n8n
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
      - GENERIC_TIMEZONE=UTC
      - N8N_LOG_LEVEL=info
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  n8n_data:
  postgres_data:
```

Create the `.env` file with your secrets:

```bash
# Generate secure values
POSTGRES_PASSWORD=$(openssl rand -hex 24)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)

cat > .env << EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
N8N_HOST=n8n.yourdomain.com
EOF
```

**Important:** The `N8N_ENCRYPTION_KEY` encrypts stored credentials. Back it up securely — losing it means losing access to all saved credentials.

## Step 3: Nginx Reverse Proxy with SSL

Install nginx and Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create the nginx configuration at `/etc/nginx/sites-available/n8n`:

```nginx
server {
    listen 80;
    server_name n8n.yourdomain.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

Enable the site and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d n8n.yourdomain.com
```

Certbot automatically configures HTTPS and sets up auto-renewal.

## Step 4: Launch and Verify

Start the stack:

```bash
cd /opt/n8n
docker compose up -d

# Check logs
docker compose logs -f n8n
```

Wait for the message `n8n ready on 0.0.0.0, port 5678`. Navigate to `https://n8n.yourdomain.com` in your browser. You should see the n8n setup screen where you create your admin account.

## Step 5: Automated Backups

Create a backup script at `/opt/n8n/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/n8n/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U n8n n8n | gzip > "$BACKUP_DIR/n8n_db_$DATE.sql.gz"

# Backup n8n data volume
docker run --rm -v n8n_n8n_data:/data -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/n8n_data_$DATE.tar.gz" -C /data .

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Schedule it with cron:

```bash
chmod +x /opt/n8n/backup.sh
echo "0 3 * * * /opt/n8n/backup.sh >> /var/log/n8n-backup.log 2>&1" | crontab -
```

## Production Hardening Checklist

Before running critical workflows, address these items:

**Security:**
- Change the default n8n port or restrict access via firewall (`ufw allow from YOUR_IP to any port 5678`)
- Set `N8N_BASIC_AUTH_ACTIVE=true` with a strong password if not using n8n's built-in user management
- Keep Docker images updated (`docker compose pull && docker compose up -d` weekly)
- Restrict the `.env` file permissions: `chmod 600 .env`

**Reliability:**
- Set `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` to avoid storing large files in the database
- Configure execution timeout: `EXECUTIONS_TIMEOUT=600` (10 minutes max per workflow)
- Enable execution pruning: `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE=168` (7 days)
- Monitor disk space — execution logs and binary data can grow fast

**Performance:**
- For high-throughput setups, enable queue mode with Redis for horizontal scaling
- Increase PostgreSQL `shared_buffers` and `work_mem` for large datasets
- Consider separate servers for n8n and PostgreSQL if running 100+ active workflows

Self-hosted n8n is a reliable automation platform that teams at FlipFactory and thousands of others depend on daily. With this setup, you have a production-grade instance that costs a fraction of cloud alternatives while giving you full control over your automation infrastructure.
