<div align="center">

<img src="assets/hero-planet.svg" alt="鼠鼠星球" width="128" />

# 鼠鼠星球

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-4479A1.svg)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-lightgrey.svg)](#license)

**大切に愛されたハムスターたちの名前、物語、そして小さな光を残す場所。星へ到着した子も、まだ地球にいる子も。**

[English](README.md) | [中文](README_CN.md) | 日本語

[デモサイト](https://www.omwai.cn) · [ロードマップ](./ROADMAP.md) · [デプロイ手順](./deploy/deployment.md)

</div>

---

## 概要

鼠鼠星球（OmwStar）は、ハムスターのための軽量なアーカイブサイトです。長期的な目標は、プレイヤーが大切にしていたハムスターたちを収録することです。すでに星へ到着した子は記念され、まだ地球にいる子は「地球からの手紙」として残されます。

現在の位置づけは **静的な記念ページ + Express バックエンド + MySQL 保存 + Redis キャッシュ** です。アカウントシステムはなく、中心の流れは次のとおりです。

```text
プレイヤーが投稿する → 管理者が審査する → 星の住人は記念銀河へ、地球からの手紙は独立ページへ
```

ランキングも焦りも作りません。真剣に愛された小さなハムスターが、静かに残せる場所であることを願っています。

## 機能

- **静かなアーカイブ** - 名前、性格、好きな食べ物、日付、物語を記録。星の住人は記念され、地球からの手紙は今のまま残る
- **投稿審査** - 投稿はデフォルトで審査待ち。管理者が承認してから公開
- **記念銀河** - 承認済みの星の住人だけを展示し、静かな記念の空気を保つ
- **地球からの手紙** - まだ地球にいる子の独立ページ。記念銀河とは混ぜない
- **個別記念ページ** - 1匹ごとに共有可能なページ。文案コピーと記念カード生成に対応
- **惑星マップ** - 回転できる 3D の鼠星と地球。星域または地球を選んで住人を見る
- **タイムライン** - 星へ到着した日付順
- **小さな儀式** - 帰りの星灯、匿名メモ、タイムカプセルメール
- **摸摸鼠鼠** - つまむ、引っ張る、くすぐるインタラクション
- **鼠鼠絵本** - ページをめくれる絵本
- **画像アップロード** - JPG / PNG / WebP / GIF 対応。デフォルト上限は 1 ファイル 2MB
- **管理審査 API** - 投稿とメモを審査。未承認の内容は公開銀河に出ない
- **Redis キャッシュ** - 公開住人リストを TTL 付きでキャッシュし、DB 負荷を下げる

## ページ

| ページ         | パス                                         | 説明                                |
| -------------- | -------------------------------------------- | ----------------------------------- |
| ホーム         | [`index.html`](./index.html)                 | 入口、概要データ、守護者の展示      |
| 惑星マップ     | [`map.html`](./map.html)                     | 回転できる 3D の鼠星と地球          |
| タイムライン   | [`timeline.html`](./timeline.html)           | 到着日順                            |
| 記念銀河       | [`planet-wall.html`](./planet-wall.html)     | 承認済みの星の住人                  |
| 地球からの手紙 | [`earth-letters.html`](./earth-letters.html) | まだ地球にいる子の公開手紙          |
| 摸摸鼠鼠       | [`momo.html`](./momo.html)                   | 軽いインタラクション                |
| 鼠鼠絵本       | [`book.html`](./book.html)                   | ページめくり絵本                    |
| 投稿           | [`submit.html`](./submit.html)               | 記念アーカイブの提出                |
| 記念ページ     | [`resident.html`](./resident.html)           | 1匹の詳細。例: `resident.html?id=1` |
| 私たちについて | [`about.html`](./about.html)                 | プロジェクト紹介                    |
| プライバシー   | [`privacy.html`](./privacy.html)             | プライバシー方針                    |
| 利用規約       | [`terms.html`](./terms.html)                 | 利用条件                            |

## 技術スタック

| コンポーネント | 技術                                  |
| -------------- | ------------------------------------- |
| ランタイム     | Node.js 18+                           |
| バックエンド   | Express 4、Helmet、Multer、Nodemailer |
| フロントエンド | 素の HTML / CSS / JavaScript          |
| データベース   | MySQL 8+（utf8mb4）                   |
| キャッシュ     | Redis 7+                              |
| デプロイ       | systemd + nginx リバースプロキシ      |

## クイックスタート

### 前提条件

- Node.js 18+
- MySQL 8+（インストール済みで稼働中）
- Redis 7+（インストール済みで稼働中）

### インストール

```bash
git clone https://github.com/xxx-x-x/OmwStar.git
cd OmwStar
npm install
cp .env.example .env
```

`.env` にデータベース、Redis、管理者用の認証情報を記入してから、初期化して起動します。

```bash
npm run db:init
npm run db:migrate
npm run dev
```

起動後のアクセス先:

```text
http://127.0.0.1:4173/
```

ヘルスチェック:

```bash
curl -i http://127.0.0.1:4173/api/health
```

> 静的ページだけ見たい場合は `npm run dev:static` を実行するか、`index.html` を直接開いてください。静的モードではサンプルデータとブラウザ内の下書きだけを表示し、MySQL や Redis には接続しません。

## 設定

`.env` は `.gitignore` に入っています。本物のパスワードをコミットしないでください。参考は [`.env.example`](./.env.example) です。

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

| 変数                                                | 説明                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PORT` / `HOST`                                     | アプリの待受アドレス。ローカル開発のデフォルトは `127.0.0.1:4173`。本番では systemd で `127.0.0.1:3004` にできる |
| `DB_*`                                              | MySQL 接続情報                                                                                                   |
| `REDIS_URL`                                         | Redis 接続文字列                                                                                                 |
| `CACHE_TTL_SECONDS`                                 | 公開住人リストのキャッシュ秒数                                                                                   |
| `UPLOAD_MAX_FILE_SIZE_MB`                           | 投稿画像のサイズ上限                                                                                             |
| `PUBLIC_SITE_URL`                                   | 公開サイト URL。共有リンクとタイムカプセルメールに使う                                                           |
| `VISITOR_KEY_SALT`                                  | 訪問者の点灯識別用ソルト                                                                                         |
| `SMTP_*` / `CAPSULE_SEND_LIMIT`                     | タイムカプセルメールの送信設定                                                                                   |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN` | 管理審査用の認証情報                                                                                             |

長いソルトやパスワードを生成する例:

```bash
openssl rand -hex 32
```

## デプロイ

デモサイト: [https://www.omwai.cn](https://www.omwai.cn)

本番では Node を本機だけに待受させ、nginx で外部公開することを推奨します。詳細は [`deploy/deployment.md`](./deploy/deployment.md) を見てください。

### 方法1: ローカル開発

ページ修正、API 調整、ローカル結合に向いています。

```bash
npm install
npm run db:init
npm run db:migrate
npm run dev
```

コミット前の基本構文チェック:

```bash
npm run check
```

タイムカプセルメールは cron または systemd timer で定期実行できます。

```bash
npm run send:time-capsules
```

### 方法2: systemd + nginx

Linux サーバー向けです。デフォルトの流れは次のとおりです。

```text
ブラウザ → nginx :80/:443 → 127.0.0.1:3004 → node server/app.cjs
```

#### 前提条件

- Linux サーバー
- Node.js 18+、MySQL、Redis
- nginx
- プロジェクトルートの `.env` を設定済み

#### インストール手順

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

リポジトリ内の nginx サンプルドメインは `omwstar.xx-xzh.xyz`、systemd の作業ディレクトリ例は `/home/ubuntu/OmwStar` です。公開前に実際のドメイン（例: `www.omwai.cn`）と実際のパスへ変更してください。

#### インストール後の確認

```bash
# 本機アプリを確認
curl -i http://127.0.0.1:3004/api/health

# 公開ドメインを確認
curl -i https://www.omwai.cn/api/health
```

nginx 設定には `/.well-known/acme-challenge/` が予約済みです。certbot で証明書を発行できます。

```bash
sudo certbot --nginx -d www.omwai.cn -d omwai.cn
```

#### よく使うコマンド

```bash
# サービス状態
sudo systemctl status omwstar

# ログ
sudo journalctl -u omwstar -f

# 再起動
sudo systemctl restart omwstar

# nginx 再読み込み
sudo nginx -t && sudo systemctl reload nginx
```

## Nginx リバースプロキシに関する注意

アプリはデフォルトで `127.0.0.1` のみにバインドします。Node プロセスを直接インターネットへ公開しないでください。リバースプロキシでは実際の Host とプロトコルヘッダーを転送してください。

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

投稿には画像アップロードがあるため、nginx の `client_max_body_size` も合わせて上げてください（サンプル設定は `8m`）。

## プロジェクト構成

```text
OmwStar/
├── index.html                 # ホーム
├── map.html                   # 惑星マップ
├── timeline.html              # タイムライン
├── planet-wall.html           # 記念銀河
├── earth-letters.html         # 地球からの手紙
├── momo.html                  # 摸摸鼠鼠
├── book.html                  # 鼠鼠絵本
├── submit.html                # 投稿
├── resident.html              # 1匹の記念ページ
├── about.html                 # 私たちについて
├── privacy.html               # プライバシー
├── terms.html                 # 利用規約
├── assets/                    # 画像とビジュアル資産
├── data/
│   ├── guardians.json         # ホームの守護者設定
│   └── memories.js            # 静的サンプルデータ
├── src/
│   ├── app.js                 # フロントエンド本体
│   ├── admin.js               # 審査関連フロントエンド
│   ├── planet-map.js          # 惑星マップ
│   ├── momo-*.js / momo-soft.css
│   └── styles.css
├── server/
│   ├── app.cjs                # Express 入口
│   ├── db.cjs                 # MySQL 接続
│   ├── cache.cjs              # Redis キャッシュ
│   ├── repositories.cjs       # データアクセス
│   ├── schema.sql             # データベース構造
│   └── scripts/               # 初期化、移行、タイムカプセル
├── deploy/
│   ├── deployment.md          # デプロイ手順
│   ├── nginx/                 # nginx サイト設定
│   └── systemd/               # systemd サービス設定
├── sketchbook/                # 絵本の静的リソース
└── package.json
```

## プロダクトの境界

いま守っていること:

- アカウントシステムは作らない。「自分のアーカイブ」もない
- プレイヤー投稿は MySQL に入り、デフォルトは審査待ち
- 公開表示は承認済みアーカイブだけを読む
- フォロー、ランキング、人気榜などの強いコミュニティ機能は作らない
- 記念ページは星灯、匿名メモ、タイムカプセルに対応。メモはデフォルト公開だが、審査は通す

いまは計画しないこと:

- 未審査のまま公開する投稿
- 強いコミュニティコメント欄
- フォロー関係
- ランキングや推薦フィード
- 早すぎるアカウント導入

より詳しいプロダクトの進め方は [`ROADMAP.md`](./ROADMAP.md) を見てください。

## スクリプト

| コマンド                     | 説明                                       |
| ---------------------------- | ------------------------------------------ |
| `npm run dev`                | 完全なサイトを起動（MySQL / Redis に接続） |
| `npm start`                  | 本番モードで起動                           |
| `npm run dev:static`         | 静的プレビューのみ                         |
| `npm run db:init`            | データベース初期化                         |
| `npm run db:migrate`         | スキーマ移行                               |
| `npm run send:time-capsules` | 期限が来たタイムカプセルメールを送信       |
| `npm run check`              | 基本構文チェック                           |

## ライセンス

本プロジェクトは Omw が維持し、すべての権利を留保します。デモサイトは [https://www.omwai.cn](https://www.omwai.cn) です。

Copyright (c) 2026 Omw

---

<div align="center">

**この小さな星があなたにとって意味があるなら、スターをひとつお願いします。**

</div>
