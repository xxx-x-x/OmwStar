# OmwStar Image Generator MCP

一个通过 stdio 运行的本地 MCP 服务，向 VS Code 提供 `generate_image` 工具。工具按照 OmwAI GPT Image 2 异步接口提交任务、轮询结果，并把最终 Base64 图片限制保存到 `IMAGE_OUTPUT_ROOT` 下。

## 1. 安装和构建

在本目录运行：

```text
npm install
npm run check
npm run build
```

## 2. 配置 VS Code

工作区已经提供 `.vscode/mcp.json`。其中 API Key 使用密码输入框，不保存在仓库；请把 Endpoint 和模型名称的占位值改成你的实际配置。

需要配置：

- `IMAGE_API_ENDPOINT`：API 基础地址，当前应为 `https://www.omwai.xyz/`；要求 HTTPS，本机 localhost 可以使用 HTTP。
- `IMAGE_API_MODEL`：图片模型名称。
- `IMAGE_API_KEY`：启动时由 VS Code 密码输入框收集。
- `IMAGE_OUTPUT_ROOT`：生成图片允许写入的根目录。

修改后重新加载 VS Code 窗口，打开 MCP 服务器列表并启动 `omwstar-image-generator`。

## 3. OmwAI 异步接口协议

模板向 `${IMAGE_API_ENDPOINT}/v1/images/async/generations` 发送：

```json
{
  "model": "your-model",
  "prompt": "image prompt",
  "size": "1024x1024",
  "quality": "high",
  "background": "auto",
  "output_format": "webp",
  "moderation": "auto",
  "n": 1
}
```

使用请求头：

```text
Authorization: Bearer <IMAGE_API_KEY>
Content-Type: application/json
```

提交成功后读取 `task_id`，再每 2 秒请求：

```text
GET /v1/images/async/generations/{task_id}
```

`status=completed` 时解码 `data[0].b64_json`；`status=failed` 时返回服务商错误；等待超过 10 分钟则超时。接口文档：<https://doc.omwai.xyz/zh/docs/api-reference/gpt-image-2/generate>。

## 4. 工具参数

- `prompt`：10～8000 字符；
- `size`：`1024x1024`、`1536x1024` 或 `1024x1536`；
- `quality`：`low`、`medium`、`high` 或 `auto`；
- `background`：`transparent`、`opaque`、`auto` 或 `none`；
- `format`：`png`、`jpeg` 或 `webp`；
- `outputPath`：相对于 `IMAGE_OUTPUT_ROOT` 的文件路径，如 `hamster-species/syrian.webp`。

默认拒绝覆盖已存在的图片；`outputPath` 的扩展名必须与 `format` 一致。

## 安全说明

- 不要把 API Key 写入本文件、源码、`.env.example` 或 Git；
- 服务端只通过环境变量读取密钥，不输出鉴权头；
- 输出路径不能越过 `IMAGE_OUTPUT_ROOT`；
- Base64 图片解码后限制为 25MB；
- stdio 模式中不要使用 `console.log`，避免破坏 MCP JSON-RPC；日志只能写到 stderr。
