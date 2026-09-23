# OmwStar Image Generator MCP

一个通过 stdio 运行的本地 MCP 服务，向 VS Code 提供 `generate_image` 工具。工具调用配置的图片生成 API，并把结果限制保存到 `IMAGE_OUTPUT_ROOT` 下。

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

- `IMAGE_API_ENDPOINT`：完整的图片生成 API 地址；要求 HTTPS，本机 localhost 可以使用 HTTP。
- `IMAGE_API_MODEL`：图片模型名称。
- `IMAGE_API_KEY`：启动时由 VS Code 密码输入框收集。
- `IMAGE_OUTPUT_ROOT`：生成图片允许写入的根目录。

修改后重新加载 VS Code 窗口，打开 MCP 服务器列表并启动 `omwstar-image-generator`。

## 3. 默认接口协议

模板默认发送 OpenAI 风格的 POST JSON：

```json
{
  "model": "your-model",
  "prompt": "image prompt",
  "negative_prompt": "optional negative prompt",
  "size": "1024x1024",
  "width": 1024,
  "height": 1024,
  "response_format": "b64_json",
  "output_format": "webp",
  "n": 1
}
```

使用请求头：

```text
Authorization: Bearer <IMAGE_API_KEY>
Content-Type: application/json
```

支持以下响应形式：

- 直接返回 `image/png`、`image/jpeg` 或 `image/webp`；
- `{ "data": [{ "b64_json": "..." }] }`；
- `{ "data": [{ "base64": "..." }] }`；
- `{ "data": [{ "url": "https://..." }] }`；
- 顶层 `b64_json`、`base64` 或 `url`。

如果服务商协议不同，只需修改 `src/index.ts` 中的 `requestImage()`，不要改路径和文件安全校验。

## 4. 工具参数

- `prompt`：10～8000 字符；
- `negativePrompt`：可选；
- `width` / `height`：256～2048；
- `format`：`png`、`jpeg` 或 `webp`；
- `outputPath`：相对于 `IMAGE_OUTPUT_ROOT` 的文件路径，如 `hamster-species/syrian.webp`。

默认拒绝覆盖已存在的图片。

## 安全说明

- 不要把 API Key 写入本文件、源码、`.env.example` 或 Git；
- 服务端只通过环境变量读取密钥，不输出鉴权头；
- 输出路径不能越过 `IMAGE_OUTPUT_ROOT`；
- 返回图片限制为 25MB；
- 远程图片只允许从 HTTPS URL 下载；
- stdio 模式中不要使用 `console.log`，避免破坏 MCP JSON-RPC；日志只能写到 stderr。
