<div align="center">

<img src="assets/hero-planet.svg" alt="鼠鼠星球" width="128" />

# 鼠鼠星球

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-4479A1.svg)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-lightgrey.svg)](#license)

**给被认真爱过的小仓鼠留下名字、故事和星光。已经抵达鼠星的会被记住，还在地球的也可以先寄来一封信。**

[English](README.md) | 中文 | [日本語](README_JA.md)

[演示网站](https://www.omwai.cn) · [产品路线图](./ROADMAP.md) · [部署说明](./deploy/deployment.md)

</div>

---

## 项目概述

鼠鼠星球（OmwStar）是一个轻量的仓鼠档案网站。长期愿景是收录各个玩家心爱的鼠鼠：已经抵达鼠星的会被轻轻记住，还在地球的也可以先寄来一封故事。

当前定位是：**静态纪念页面 + Express 后端 + MySQL 存储 + Redis 缓存**。不做账号系统，核心流程是：

```text
玩家在页面投稿 → 管理员审核 → 审核通过后进入公开纪念星河
```

这里不做排名，不制造焦虑，只希望每一只被认真爱过的小鼠，都能有一个安静的归档处。

## 核心功能

- **安静档案** - 记录鼠鼠名字、性格、爱吃的东西、相关日期和故事。鼠星居民会被纪念，地球来信则保留此刻的语气
- **投稿审核** - 玩家投稿默认进入待审核状态，管理员通过后才会公开展示
- **纪念星河** - 只展示审核通过的公开档案，保持安静的纪念气质
- **独立纪念页** - 每只鼠鼠都有可分享的独立页面，支持复制文案和生成纪念卡
- **星球地图** - 3D 可旋转的鼠鼠星球地图，按区域浏览居民
- **时光轴** - 按被记录的日期排列，并用很轻的标记区分鼠星居民与地球来信
- **轻仪式互动** - 归家星灯、匿名回忆便签、时间胶囊邮件
- **摸摸鼠鼠** - 可捏、可拖、可挠痒的互动体验页
- **鼠鼠绘本** - 可翻页的绘本画册
- **图片上传** - 投稿支持 JPG / PNG / WebP / GIF，默认单文件不超过 2MB
- **管理审核 API** - 审核投稿和便签，未审核内容不会进入公开星河
- **Redis 缓存** - 公开居民列表带 TTL 缓存，减轻数据库压力

## 页面入口

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | [`index.html`](./index.html) | 星球入口、概览数据和守护者展示 |
| 星球地图 | [`map.html`](./map.html) | 3D 可旋转地图 |
| 时光轴 | [`timeline.html`](./timeline.html) | 按抵达日期排列 |
| 纪念星河 | [`planet-wall.html`](./planet-wall.html) | 审核通过的公开档案墙 |
| 摸摸鼠鼠 | [`momo.html`](./momo.html) | 轻互动体验 |
| 鼠鼠绘本 | [`book.html`](./book.html) | 翻页画册 |
| 投稿 | [`submit.html`](./submit.html) | 玩家提交纪念档案 |
| 纪念页 | [`resident.html`](./resident.html) | 单只鼠鼠详情，例如 `resident.html?id=1` |
| 关于我们 | [`about.html`](./about.html) | 项目介绍 |
| 隐私政策 | [`privacy.html`](./privacy.html) | 隐私说明 |
| 用户协议 | [`terms.html`](./terms.html) | 使用条款 |

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 18+ |
| 后端 | Express 4、Helmet、Multer、Nodemailer |
| 前端 | 原生 HTML / CSS / JavaScript |
| 数据库 | MySQL 8+（utf8mb4） |
| 缓存 | Redis 7+ |
| 部署 | systemd + nginx 反代 |

## 快速开始

### 前置条件

- Node.js 18+
- MySQL 8+（已安装并运行）
- Redis 7+（已安装并运行）

### 安装步骤

```bash
git clone https://github.com/xxx-x-x/OmwStar.git
cd OmwStar
npm install
cp .env.example .env
```

编辑 `.env`，填入数据库、Redis 和管理员口令，然后初始化并启动：

```bash
npm run db:init
npm run db:migrate
npm run dev
```

启动后访问：

```text
http://127.0.0.1:4173/
```

健康检查：

```bash
curl -i http://127.0.0.1:4173/api/health
```

> 如果只想预览静态页面，可以运行 `npm run dev:static`，或直接打开 `index.html`。静态模式会显示示例数据和浏览器本地草稿，不会连接 MySQL 或 Redis。

## 配置说明

`.env` 已加入 `.gitignore`，不要提交真实密码。可参考 [`.env.example`](./.env.example)：

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
```

| 变量 | 说明 |
|------|------|
| `PORT` / `HOST` | 应用监听地址。本地开发默认 `127.0.0.1:4173`，生产可由 systemd 设为 `127.0.0.1:3004` |
| `DB_*` | MySQL 连接信息 |
| `REDIS_URL` | Redis 连接串 |
| `CACHE_TTL_SECONDS` | 公开居民列表缓存秒数 |
| `UPLOAD_MAX_FILE_SIZE_MB` | 投稿图片大小上限 |
| `PUBLIC_SITE_URL` | 对外站点地址，用于分享链接和时间胶囊邮件 |
| `VISITOR_KEY_SALT` | 访客点灯标识盐值 |
| `SMTP_*` / `CAPSULE_SEND_LIMIT` | 时间胶囊邮件发送配置 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN` | 管理审核凭证 |

生成较长的随机盐值和口令：

```bash
openssl rand -hex 32
```

## 部署方式

演示站点：[https://www.omwai.cn](https://www.omwai.cn)

生产环境建议让 Node 只监听本机，再由 nginx 对外提供访问。更完整的步骤见 [`deploy/deployment.md`](./deploy/deployment.md)。

### 方式一：本地开发

适合改页面、调接口和本地联调。

```bash
npm install
npm run db:init
npm run db:migrate
npm run dev
```

提交前可做基础语法校验：

```bash
npm run check
```

时间胶囊邮件可由 cron 或 systemd timer 定时触发：

```bash
npm run send:time-capsules
```

### 方式二：systemd + nginx

适合 Linux 服务器。默认模式是：

```text
浏览器 → nginx :80/:443 → 127.0.0.1:3004 → node server/app.cjs
```

#### 前置条件

- Linux 服务器
- Node.js 18+、MySQL、Redis
- nginx
- 已配置项目根目录 `.env`

#### 安装步骤

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

仓库里的 nginx 示例域名是 `omwstar.xx-xzh.xyz`，systemd 示例工作目录是 `/home/ubuntu/OmwStar`。上线前请改成实际域名（例如 `www.omwai.cn`）和实际项目路径。

#### 安装后检查

```bash
# 检查本机应用
curl -i http://127.0.0.1:3004/api/health

# 检查对外域名
curl -i https://www.omwai.cn/api/health
```

nginx 配置已预留 `/.well-known/acme-challenge/`，可用 certbot 签发证书：

```bash
sudo certbot --nginx -d www.omwai.cn -d omwai.cn
```

#### 常用命令

```bash
# 查看服务状态
sudo systemctl status omwstar

# 查看日志
sudo journalctl -u omwstar -f

# 重启服务
sudo systemctl restart omwstar

# 重载 nginx
sudo nginx -t && sudo systemctl reload nginx
```

## Nginx 反向代理注意事项

应用默认只绑定 `127.0.0.1`，不要把 Node 进程直接暴露到公网。反代时请转发真实 Host 和协议头，例如：

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

投稿包含图片上传，建议同步提高 nginx 的 `client_max_body_size`（示例配置为 `8m`）。

## 项目结构

```text
OmwStar/
├── index.html                 # 首页
├── map.html                   # 星球地图
├── timeline.html              # 时光轴
├── planet-wall.html           # 纪念星河
├── momo.html                  # 摸摸鼠鼠
├── book.html                  # 鼠鼠绘本
├── submit.html                # 投稿
├── resident.html              # 单只鼠鼠纪念页
├── about.html                 # 关于我们
├── privacy.html               # 隐私政策
├── terms.html                 # 用户协议
├── assets/                    # 图片与视觉资产
├── data/
│   ├── guardians.json         # 首页星球守护者配置
│   └── memories.js            # 静态示例数据
├── src/
│   ├── app.js                 # 前端主逻辑
│   ├── admin.js               # 审核相关前端
│   ├── planet-map.js          # 星球地图
│   ├── momo-*.js / momo-soft.css
│   └── styles.css
├── server/
│   ├── app.cjs                # Express 入口
│   ├── db.cjs                 # MySQL 连接
│   ├── cache.cjs              # Redis 缓存
│   ├── repositories.cjs       # 数据访问
│   ├── schema.sql             # 数据库结构
│   └── scripts/               # 初始化、迁移、时间胶囊
├── deploy/
│   ├── deployment.md          # 部署说明
│   ├── nginx/                 # nginx 站点配置
│   └── systemd/               # systemd 服务配置
├── sketchbook/                # 绘本静态资源
└── package.json
```

## 产品边界

当前坚持：

- 不做账号系统，没有「我的档案」
- 玩家投稿进入 MySQL，默认待审核
- 公开展示只读取审核通过的档案
- 不做关注、排行、热度榜等强社区功能
- 纪念页支持星灯、匿名便签和时间胶囊；便签默认公开展示，但仍走审核

暂不计划：

- 未审核公开投稿
- 强社区评论区
- 关注关系
- 排行榜或推荐信息流
- 过早引入账号系统

更完整的产品节奏见 [`ROADMAP.md`](./ROADMAP.md)。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动完整网站服务（连接 MySQL / Redis） |
| `npm start` | 生产模式启动 |
| `npm run dev:static` | 仅静态预览 |
| `npm run db:init` | 初始化数据库 |
| `npm run db:migrate` | 执行结构迁移 |
| `npm run send:time-capsules` | 发送到期的时间胶囊邮件 |
| `npm run check` | 基础语法校验 |

## 许可证

本项目由 Omw 维护，保留所有权利。演示站点为 [https://www.omwai.cn](https://www.omwai.cn)。

Copyright (c) 2026 Omw

---

<div align="center">

**如果这个小星球对你有意义，欢迎点一颗星。**

</div>
