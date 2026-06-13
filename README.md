# 鼠鼠星球

一个给"已经去鼠星的鼠鼠"做纪念档案的小网站。长期愿景是收录各个玩家心爱的鼠鼠，让每一位已经抵达鼠星的小居民都能被温柔记住。

当前阶段的定位是：轻量网站 + MySQL 数据库存储 + Redis 缓存的鼠鼠纪念档案与轻仪式互动。
不做账号系统，流程就是：玩家在页面投稿 → 管理员审核 → 审核通过后进入公开纪念星河。

## 当前边界

- 不做账号系统，没有"我的档案"概念
- 玩家投稿进入 MySQL，默认待审核状态
- 管理员审核通过后，档案进入公开纪念星河
- 公开展示只读取审核通过的数据库档案
- 不做关注、排行等强社区功能
- 纪念页支持星灯、匿名便签和时间胶囊，便签默认公开展示

更完整的产品路线见 [`ROADMAP.md`](./ROADMAP.md)。

## 本地运行

数据库模式需要先安装依赖、配置环境变量、初始化 MySQL，再启动网站服务。

```bash
npm install
npm run db:init
npm run db:migrate
npm run dev
```

启动后访问：

```text
http://127.0.0.1:4173/
```

`.env` 里需要配置：

```text
DB_HOST=43.143.131.87
DB_PORT=3306
DB_USER=omwstar_user
DB_PASSWORD=你的数据库密码
DB_NAME=omwstar
REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_SECONDS=300
UPLOAD_MAX_FILE_SIZE_MB=2
PUBLIC_SITE_URL=https://你的域名
VISITOR_KEY_SALT=换成一段很长的访客标识盐值
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的 SMTP 用户名
SMTP_PASS=你的 SMTP 密码
SMTP_FROM=鼠鼠星球 <no-reply@example.com>
CAPSULE_SEND_LIMIT=50
ADMIN_TOKEN=换成一段很长的审核口令
```

`.env` 已加入 `.gitignore`，不要提交真实密码。

如果只想看静态页面，可以直接打开 `index.html`，也可以运行 `npm run dev:static`。这种模式下会显示示例数据和浏览器本地保存内容，但不会连接 MySQL 或 Redis。

提交前可以运行基础语法校验：

```bash
npm run check
```

时间胶囊邮件可由 cron 或 systemd timer 定时触发：

```bash
npm run send:time-capsules
```

页面入口：

- 首页：`index.html`
- 星球地图：`map.html`
- 时光轴：`timeline.html`
- 纪念星河：`planet-wall.html`
- 鼠鼠纪念页：`resident.html?id=1`
- 投稿：`submit.html`

当前版本包含：

- 星球首页
- 鼠鼠纪念卡片
- 搜索与区域筛选
- MySQL 数据库存储
- Redis 公开居民列表缓存
- 数据库初始化脚本
- 玩家投稿进入待审核数据库
- 管理审核 API
- 鼠鼠详情页视图
- 单只鼠鼠独立纪念页
- 复制单只鼠鼠分享文案
- 生成单只鼠鼠纪念卡 PNG 图片
- 鼠鼠星球地图（3D 可旋转）
- 纪念星河公开展示页
- 服务端持久化归家星灯
- 纪念页匿名回忆便签
- 时间胶囊保存与邮件发送脚本
- 首页星球守护者展示位（配置文件：`data/guardians.json`）
- 纪念页鼠星历与世界观文案
- 时光轴（按抵达日期排列）
- 玩家投稿流程
- 可替换的首页主视觉资产
- 顶部分类导航：首页、星球地图、时光轴、纪念星河、投稿
- 独立页面：首页 `index.html`、星球地图 `map.html`、时光轴 `timeline.html`、鼠鼠纪念页 `resident.html?id=1`、纪念星河 `planet-wall.html`、投稿 `submit.html`

## 下一步重点

- 统一初始数据来源，避免重复维护
- 支持导入和导出纪念档案 JSON
- 增加详情页打印样式和 PDF 导出
- 完善投稿撤回和二次确认机制
- 增加图片、便签和时间胶囊内容审核

## 未来可能方向

- 生成单张纪念卡图片
- 复制分享文案
- 打印或保存详情页
- 完善投稿与便签审核后台
- 继续完善"纪念星河"的公开展示

## 暂不计划

- 默认公开用户内容
- 强社区评论区
- 关注关系
- 排行榜或热度榜
- 未审核公开投稿
- 过早引入账号系统

## 版本备份

- `shushu-planet-v1.0.1`：继续开发前的备份版本
- `shushu-planet`：当前工作版本
