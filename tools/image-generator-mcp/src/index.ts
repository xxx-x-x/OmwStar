import { mkdir, stat, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 120_000;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function outputRoot(): string {
  return resolve(process.env.IMAGE_OUTPUT_ROOT?.trim() || resolve(process.cwd(), "generated-images"));
}

function safeOutputPath(relativePath: string): string {
  if (!relativePath || isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new Error("outputPath 必须是输出目录内的相对路径。");
  }

  const root = outputRoot();
  const target = resolve(root, relativePath);
  const relation = relative(root, target);
  if (!relation || relation.startsWith("..") || isAbsolute(relation)) {
    throw new Error("outputPath 不能指向输出目录之外。请包含文件名，例如 species/syrian.webp。 ");
  }

  const extension = extname(target).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("只允许保存 PNG、JPG、JPEG 或 WebP 文件。");
  }
  return target;
}

async function ensureNotExists(path: string): Promise<void> {
  try {
    await stat(path);
    throw new Error(`文件已存在，拒绝覆盖：${path}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("图片响应超过 25MB 限制。");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("图片响应超过 25MB 限制。");
  return bytes;
}

function decodeBase64(value: string): Buffer {
  const normalized = value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("API 返回了无效或过大的 Base64 图片。");
  return bytes;
}

async function downloadImage(url: string, signal: AbortSignal): Promise<Buffer> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("API 返回的图片 URL 必须使用 HTTPS。");
  const response = await fetch(parsed, { signal, redirect: "follow" });
  if (!response.ok) throw new Error(`下载生成图片失败：HTTP ${response.status}`);
  const mime = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) throw new Error(`图片 URL 返回了不支持的类型：${mime}`);
  return readLimitedBody(response);
}

/**
 * OpenAI-compatible adapter. If your provider uses different request or response
 * fields, edit only this function and keep the validation/storage code unchanged.
 */
async function requestImage(args: {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp";
}): Promise<Buffer> {
  const endpoint = requireEnv("IMAGE_API_ENDPOINT");
  const apiKey = requireEnv("IMAGE_API_KEY");
  const model = requireEnv("IMAGE_API_MODEL");
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== "https:" && endpointUrl.hostname !== "127.0.0.1" && endpointUrl.hostname !== "localhost") {
    throw new Error("IMAGE_API_ENDPOINT 必须使用 HTTPS；仅 localhost 可使用 HTTP。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: args.prompt,
        negative_prompt: args.negativePrompt,
        size: `${args.width}x${args.height}`,
        width: args.width,
        height: args.height,
        response_format: "b64_json",
        output_format: args.format,
        n: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800).replaceAll(apiKey, "[REDACTED]");
      throw new Error(`生图 API 请求失败：HTTP ${response.status}${detail ? ` — ${detail}` : ""}`);
    }

    const mime = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (mime && ALLOWED_MIME_TYPES.has(mime)) return readLimitedBody(response);

    const payload = await response.json() as Record<string, unknown>;
    const first = Array.isArray(payload.data) ? payload.data[0] as Record<string, unknown> | undefined : undefined;
    const base64 = first?.b64_json ?? first?.base64 ?? payload.b64_json ?? payload.base64;
    if (typeof base64 === "string") return decodeBase64(base64);
    const imageUrl = first?.url ?? payload.url;
    if (typeof imageUrl === "string") return downloadImage(imageUrl, controller.signal);

    throw new Error("无法识别 API 响应。请修改 requestImage() 以适配服务商的响应字段。");
  } finally {
    clearTimeout(timeout);
  }
}

const server = new McpServer({ name: "omwstar-image-generator", version: "0.1.0" });

server.registerTool(
  "generate_image",
  {
    title: "Generate and save image",
    description: "Generate one image using the configured API and save it safely under IMAGE_OUTPUT_ROOT.",
    inputSchema: z.object({
      prompt: z.string().min(10).max(8_000).describe("Detailed image-generation prompt"),
      negativePrompt: z.string().max(4_000).optional().describe("Optional negative prompt"),
      width: z.number().int().min(256).max(2048).default(1024),
      height: z.number().int().min(256).max(2048).default(1024),
      format: z.enum(["png", "jpeg", "webp"]).default("webp"),
      outputPath: z.string().min(1).max(240).describe("Relative path under IMAGE_OUTPUT_ROOT, including extension"),
    }),
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ prompt, negativePrompt, width, height, format, outputPath }) => {
    try {
      const destination = safeOutputPath(outputPath);
      await ensureNotExists(destination);
      const image = await requestImage({ prompt, negativePrompt, width, height, format });
      await mkdir(resolve(destination, ".."), { recursive: true });
      await writeFile(destination, image, { flag: "wx" });
      return {
        content: [{ type: "text", text: `图片已保存：${destination}\n大小：${image.byteLength} bytes` }],
        structuredContent: { path: destination, bytes: image.byteLength },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("OmwStar image generator MCP is running on stdio.");
