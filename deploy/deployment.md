# OmwStar 部署说明

这套部署方案默认让应用只监听本机 `127.0.0.1:3004`，然后由 nginx 对外提供 `80` 端口访问，域名是 `omwstar.xx-xzh.xyz`。

## 一次性执行步骤

确认你已经在项目目录 `/home/ubuntu/OmwStar`，并且 `.env` 已经配置好数据库、Redis 和 `ADMIN_TOKEN` 后，可以直接执行：

```bash
cd /home/ubuntu/OmwStar
npm install
npm run db:init
npm run db:migrate
sudo mkdir -p /var/www/certbot
sudo cp /home/ubuntu/OmwStar/deploy/systemd/omwstar.service /etc/systemd/system/omwstar.service
sudo systemctl daemon-reload
sudo systemctl enable --now omwstar
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo cp /home/ubuntu/OmwStar/deploy/nginx/omwstar.xx-xzh.xyz.conf /etc/nginx/sites-available/omwstar.xx-xzh.xyz
sudo ln -sf /etc/nginx/sites-available/omwstar.xx-xzh.xyz /etc/nginx/sites-enabled/omwstar.xx-xzh.xyz
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status omwstar --no-pager
```

检查本机应用端口：

```bash
curl -i http://127.0.0.1:3004/api/health
```

检查域名 80 端口：

```bash
curl -i http://omwstar.xx-xzh.xyz/api/health
```

## 1. systemd 服务

把 [deploy/systemd/omwstar.service](deploy/systemd/omwstar.service) 复制到 `/etc/systemd/system/omwstar.service`。

```bash
sudo cp /home/ubuntu/OmwStar/deploy/systemd/omwstar.service /etc/systemd/system/omwstar.service
sudo systemctl daemon-reload
sudo systemctl enable --now omwstar
sudo systemctl status omwstar
```

如果你准备把环境变量集中放在项目根目录的 `.env`，这个服务会直接由应用里的 `dotenv` 去读取，不需要额外改 systemd。

## 2. nginx 反代

把 [deploy/nginx/omwstar.xx-xzh.xyz.conf](deploy/nginx/omwstar.xx-xzh.xyz.conf) 复制到 nginx 的站点目录，例如 `/etc/nginx/sites-available/omwstar.xx-xzh.xyz`，再建立软链接到 `sites-enabled`。

```bash
sudo cp /home/ubuntu/OmwStar/deploy/nginx/omwstar.xx-xzh.xyz.conf /etc/nginx/sites-available/omwstar.xx-xzh.xyz
sudo ln -s /etc/nginx/sites-available/omwstar.xx-xzh.xyz /etc/nginx/sites-enabled/omwstar.xx-xzh.xyz
sudo nginx -t
sudo systemctl reload nginx
```

### 先留给 Let’s Encrypt 的入口

这个站点配置已经预留了 `/.well-known/acme-challenge/`，后面直接跑 certbot 就能做 HTTP-01 验证。拿到证书后，certbot 通常会自动补 443 的 HTTPS 站点，或者你也可以让它改写当前配置。

## 3. 后续上 HTTPS

域名解析先指到这台服务器，再执行类似下面的命令：

```bash
sudo certbot --nginx -d omwstar.xx-xzh.xyz
```

如果你更想先手动确认流程，也可以先只保留 80 端口，等证书签发成功后再切到自动跳转 HTTPS。