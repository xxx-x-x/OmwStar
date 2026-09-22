<div align="center">

<img src="assets/hero-planet.svg" alt="鼠鼠星球" width="128" />

# 鼠鼠星球

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-4479A1.svg)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-lightgrey.svg)](#license)

**A quiet archive for hamsters who were loved carefully — on the mouse star, or still on Earth.**

English | [中文](README_CN.md) | [日本語](README_JA.md)

[Demo](https://www.omwai.cn) · [Roadmap](./ROADMAP.md) · [Deployment](./deploy/deployment.md)

</div>

---

## Overview

鼠鼠星球 (OmwStar) is a lightweight archive for hamsters. The long-term goal is to collect the hamsters players loved: residents who have already arrived at the mouse star, and earth letters from hamsters still living with their people.

The current shape is **static memorial pages + Express backend + MySQL storage + Redis cache**. There is no account system. The core flow is:

```text
A player submits a memorial → an admin reviews it → approved star residents enter the memorial galaxy, earth letters enter their own page
```

There are no rankings and no pressure to perform. The site only wants a quiet place for hamsters that were loved carefully.

## Features

- **Quiet archive** - Record a hamster's name, personality, favorite food, a date, and a story. Star residents are remembered; earth letters stay in the present.
- **Submission review** - Player submissions start as pending and become public only after admin approval
- **Memorial galaxy** - Shows only approved star residents, keeping a quiet memorial tone
- **Earth letters** - A separate wall for hamsters still living on Earth
- **Individual memorial pages** - Each hamster has a shareable page, with copyable text and memorial-card generation
- **Planet map** - A rotatable 3D mouse star and Earth; tap a star region or Earth to browse residents
- **Timeline** - Star residents ordered by arrival date
- **Light rituals** - Homecoming star lamps, anonymous notes, and time-capsule emails
- **摸摸鼠鼠** - A squeeze, stretch, and tickle interaction page
- **鼠鼠绘本** - A page-turning picture book
- **Image uploads** - Submissions accept JPG / PNG / WebP / GIF, 2MB per file by default
- **Admin review APIs** - Review submissions and notes; unreviewed content never enters the public galaxy
- **Redis cache** - Public resident lists are cached with a TTL to reduce database load

## Pages

| Page            | Path                                         | Description                                            |
| --------------- | -------------------------------------------- | ------------------------------------------------------ |
| Home            | [`index.html`](./index.html)                 | Planet entrance, overview stats, and guardian showcase |
| Planet map      | [`map.html`](./map.html)                     | Rotatable 3D mouse star and Earth                      |
| Timeline        | [`timeline.html`](./timeline.html)           | Ordered by arrival date                                |
| Memorial galaxy | [`planet-wall.html`](./planet-wall.html)     | Approved star-resident wall                            |
| Earth letters   | [`earth-letters.html`](./earth-letters.html) | Approved letters from hamsters still on Earth          |
| 摸摸鼠鼠        | [`momo.html`](./momo.html)                   | Light interaction                                      |
| 鼠鼠绘本        | [`book.html`](./book.html)                   | Page-turning picture book                              |
| Submit          | [`submit.html`](./submit.html)               | Player memorial submissions                            |
| Memorial page   | [`resident.html`](./resident.html)           | One hamster's detail page, e.g. `resident.html?id=1`   |
| About           | [`about.html`](./about.html)                 | Project introduction                                   |
| Privacy         | [`privacy.html`](./privacy.html)             | Privacy policy                                         |
| Terms           | [`terms.html`](./terms.html)                 | Terms of use                                           |

## Tech Stack

| Component  | Technology                            |
| ---------- | ------------------------------------- |
| Runtime    | Node.js 18+                           |
| Backend    | Express 4, Helmet, Multer, Nodemailer |
| Frontend   | Vanilla HTML / CSS / JavaScript       |
| Database   | MySQL 8+ (utf8mb4)                    |
| Cache      | Redis 7+                              |
| Deployment | systemd + nginx reverse proxy         |

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+ (installed and running)
- Redis 7+ (installed and running)

### Installation

```bash
git clone https://github.com/xxx-x-x/OmwStar.git
cd OmwStar
npm install
cp .env.example .env
```

Edit `.env` with database, Redis, and admin credentials, then initialize and start:

```bash
npm run db:init
npm run db:migrate
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/
```

Health check:

```bash
curl -i http://127.0.0.1:4173/api/health
```

> To preview static pages only, run `npm run dev:static` or open `index.html` directly. Static mode shows sample data and browser-local drafts, and does not connect to MySQL or Redis.

## Configuration

`.env` is gitignored. Do not commit real passwords. See [`.env.example`](./.env.example):

```bash
PORT=4173
HOST=127.0.0.1

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=omwstar_user
DB_PASSWORD=replace-with-your-password
DB_NAME=omwstar

REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_SECONDS=300

UPLOAD_MAX_FILE_SIZE_MB=2

PUBLIC_SITE_URL=https://www.omwai.cn
VISITOR_KEY_SALT=replace-with-a-long-random-visitor-salt

SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=replace-with-smtp-user
SMTP_PASS=replace-with-smtp-password
SMTP_FROM=鼠鼠星球 <no-reply@example.com>
CAPSULE_SEND_LIMIT=50

ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-admin-password
ADMIN_TOKEN=replace-with-a-long-random-admin-token
ADMIN_SECONDARY_PASSWORD=replace-with-a-different-strong-secondary-password
```

| Variable                                            | Description                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PORT` / `HOST`                                     | Listen address. Local default is `127.0.0.1:4173`; production can use `127.0.0.1:3004` via systemd |
| `DB_*`                                              | MySQL connection settings                                                                          |
| `REDIS_URL`                                         | Redis connection string                                                                            |
| `CACHE_TTL_SECONDS`                                 | Public resident list cache TTL                                                                     |
| `UPLOAD_MAX_FILE_SIZE_MB`                           | Max upload size for submission images                                                              |
| `PUBLIC_SITE_URL`                                   | Public site URL for share links and time-capsule emails                                            |
| `VISITOR_KEY_SALT`                                  | Salt for visitor lamp identifiers                                                                  |
| `SMTP_*` / `CAPSULE_SEND_LIMIT`                     | Time-capsule email settings                                                                        |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN` | Admin review credentials                                                                           |

Generate a long random salt or token:

```bash
openssl rand -hex 32
```

## Deployment

Demo: [https://www.omwai.cn](https://www.omwai.cn)

In production, keep Node bound to localhost and let nginx serve the public site. Full steps are in [`deploy/deployment.md`](./deploy/deployment.md).

### Method 1: Local Development

Best for page work, API changes, and local integration.

```bash
npm install
npm run db:init
npm run db:migrate
npm run dev
```

Run a basic syntax check before committing:

```bash
npm run check
```

Time-capsule emails can be triggered by cron or a systemd timer:

```bash
npm run send:time-capsules
```

### Method 2: systemd + nginx

Best for a Linux server. The default path is:

```text
Browser → nginx :80/:443 → 127.0.0.1:3004 → node server/app.cjs
```

#### Prerequisites

- Linux server
- Node.js 18+, MySQL, Redis
- nginx
- A configured `.env` in the project root

#### Installation Steps

```bash
cd /path/to/OmwStar
npm install
npm run db:init
npm run db:migrate

sudo mkdir -p /var/www/certbot
sudo cp deploy/systemd/omwstar.service /etc/systemd/system/omwstar.service
sudo systemctl daemon-reload
sudo systemctl enable --now omwstar

sudo cp deploy/nginx/omwstar.xx-xzh.xyz.conf /etc/nginx/sites-available/omwstar
sudo ln -sf /etc/nginx/sites-available/omwstar /etc/nginx/sites-enabled/omwstar
sudo nginx -t
sudo systemctl reload nginx
```

The sample nginx domain is `omwstar.xx-xzh.xyz`, and the sample systemd working directory is `/home/ubuntu/OmwStar`. Change both to the real domain (for example `www.omwai.cn`) and the real project path before going live.

#### Post-Installation

```bash
# Check the local app
curl -i http://127.0.0.1:3004/api/health

# Check the public domain
curl -i https://www.omwai.cn/api/health
```

The nginx config already reserves `/.well-known/acme-challenge/`. Issue a certificate with certbot:

```bash
sudo certbot --nginx -d www.omwai.cn -d omwai.cn
```

#### Useful Commands

```bash
# Service status
sudo systemctl status omwstar

# Logs
sudo journalctl -u omwstar -f

# Restart
sudo systemctl restart omwstar

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Nginx Reverse Proxy Note

The app binds to `127.0.0.1` by default. Do not expose the Node process directly to the internet. Forward the real Host and protocol headers:

```nginx
location / {
    proxy_pass http://127.0.0.1:3004;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
}
```

Submissions include image uploads, so raise nginx `client_max_body_size` as well (the sample config uses `8m`).

## Project Structure

```text
OmwStar/
├── index.html                 # Home
├── map.html                   # Planet map
├── timeline.html              # Timeline
├── planet-wall.html           # Memorial galaxy
├── earth-letters.html         # Earth letters
├── momo.html                  # 摸摸鼠鼠
├── book.html                  # 鼠鼠绘本
├── submit.html                # Submissions
├── resident.html              # Individual memorial page
├── about.html                 # About
├── privacy.html               # Privacy policy
├── terms.html                 # Terms of use
├── assets/                    # Images and visual assets
├── data/
│   ├── guardians.json         # Home guardian config
│   └── memories.js            # Static sample data
├── src/
│   ├── app.js                 # Frontend app
│   ├── admin.js               # Admin review frontend
│   ├── planet-map.js          # Planet map
│   ├── momo-*.js / momo-soft.css
│   └── styles.css
├── server/
│   ├── app.cjs                # Express entry
│   ├── db.cjs                 # MySQL connection
│   ├── cache.cjs              # Redis cache
│   ├── repositories.cjs       # Data access
│   ├── schema.sql             # Database schema
│   └── scripts/               # Init, migrate, time capsules
├── deploy/
│   ├── deployment.md          # Deployment notes
│   ├── nginx/                 # nginx site config
│   └── systemd/               # systemd service config
├── sketchbook/                # Picture-book static assets
└── package.json
```

## Product Boundaries

Current rules:

- No account system, and no "my archive"
- Player submissions go into MySQL as pending
- Public pages only read approved records
- No follows, rankings, or heat lists
- Memorial pages support lamps, anonymous notes, and time capsules; notes are public by default but still reviewed

Not planned:

- Publishing unreviewed submissions
- A full community comment section
- Follow relationships
- Rankings or recommendation feeds
- Introducing accounts too early

See [`ROADMAP.md`](./ROADMAP.md) for the fuller product cadence.

## Scripts

| Command                      | Description                         |
| ---------------------------- | ----------------------------------- |
| `npm run dev`                | Start the full site (MySQL / Redis) |
| `npm start`                  | Start in production mode            |
| `npm run dev:static`         | Static preview only                 |
| `npm run db:init`            | Initialize the database             |
| `npm run db:migrate`         | Run schema migrations               |
| `npm run send:time-capsules` | Send due time-capsule emails        |
| `npm run check`              | Basic syntax check                  |

## License

This project is maintained by Omw. All rights reserved. Demo: [https://www.omwai.cn](https://www.omwai.cn).

Copyright (c) 2026 Omw

---

<div align="center">

**If this small planet means something to you, please give it a star.**

</div>

