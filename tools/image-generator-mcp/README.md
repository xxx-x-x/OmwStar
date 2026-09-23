# OmwStar Image Generator MCP

一个通过 stdio 运行的 MCP 服务，向 VS Code Copilot 提供 `generate_image` 工具。工具通过 OmwAI GPT Image 2 异步接口生成图片，并将结果安全地保存到 `IMAGE_OUTPUT_ROOT` 下。

## 要求

- Node.js 20 或更高版本；
- 可用的 OmwAI API Key；
- 支持 MCP stdio 服务器的客户端，例如 VS Code Copilot。

## 在 VS Code 中使用

在项目的 `.vscode/mcp.json` 中加入：

```json
{
  "inputs": [
    {
      "id": "omwstarImageApiKey",
      "type": "promptString",
      "description": "请输入 OmwAI API Key",
      "password": true
    }
  ],
  "servers": {
    "omwstar-image-generator": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@omwai/omwstar-image-generator-mcp@0.1.0"
      ],
      "env": {
        "IMAGE_API_KEY": "${input:omwstarImageApiKey}",
        "IMAGE_API_ENDPOINT": "https://www.omwai.xyz/",
        "IMAGE_API_MODEL": "gpt-image-2",
        "IMAGE_OUTPUT_ROOT": "${workspaceFolder}/generated-images"
      }
    }
  }
}
```

保存配置后，在 VS Code 的 MCP 服务器列表中启动 `omwstar-image-generator`。首次启动时 `npx` 会下载固定版本的软件包，并由 VS Code 以密码输入框收集 API Key。

## 本地开发

克隆仓库后在本目录运行：

```text
npm ci
npm run check
npm run build
```

本地开发时，可以把 MCP 配置中的 `command` 改为 `node`，并将 `args` 设置为编译产物的绝对路径：

```json
"args": ["/absolute/path/to/tools/image-generator-mcp/dist/index.js"]
```

## 环境变量

需要配置：

- `IMAGE_API_ENDPOINT`：API 基础地址，当前应为 `https://www.omwai.xyz/`；要求 HTTPS，本机 localhost 可以使用 HTTP。
- `IMAGE_API_MODEL`：图片模型名称。
- `IMAGE_API_KEY`：启动时由 VS Code 密码输入框收集。
- `IMAGE_OUTPUT_ROOT`：生成图片允许写入的根目录，省略时默认为当前工作目录下的 `generated-images`。

## OmwAI 异步接口协议

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

## 工具参数

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

## 许可证

[MIT](LICENSE)
