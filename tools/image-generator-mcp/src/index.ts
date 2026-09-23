import { mkdir, stat, writeFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const MAX_RESPONSE_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const TASK_TIMEOUT_MS = 10 * 60_000;
const POLL_INTERVAL_MS = 2_000;
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

function decodeBase64(value: string): Buffer {
  const normalized = value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("API 返回了无效或过大的 Base64 图片。");
  return bytes;
}

async function readLimitedBody(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("图片响应超过 25MB 限制。");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("图片响应为空或超过 25MB 限制。");
  return bytes;
}

async function downloadImage(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("查询接口返回的图片 URL 必须使用 HTTPS。");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(parsed, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) throw new Error(`下载查询结果图片失败：HTTP ${response.status}`);
    const mime = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (mime && !ALLOWED_MIME_TYPES.has(mime)) throw new Error(`查询结果 URL 返回了不支持的类型：${mime}`);
    return await readLimitedBody(response);
  } finally {
    clearTimeout(timeout);
  }
}

function apiUrl(endpoint: string, path: string): URL {
  const base = new URL(endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1" && base.hostname !== "localhost") {
    throw new Error("IMAGE_API_ENDPOINT 必须使用 HTTPS；仅 localhost 可使用 HTTP。");
  }
  return new URL(path.replace(/^\//, ""), base);
}

type ImageTask = {
  id?: string;
  task_id?: string;
  status?: "queued" | "in_progress" | "completed" | "failed";
  progress?: string;
  error?: { code?: string; message?: string } | null;
  data?: unknown;
  result?: unknown;
  output?: unknown;
};

async function requestJson(url: URL, init: RequestInit, apiKey: string): Promise<ImageTask> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800).replaceAll(apiKey, "[REDACTED]");
      throw new Error(`生图 API 请求失败：HTTP ${response.status}${detail ? ` — ${detail}` : ""}`);
    }
    return await response.json() as ImageTask;
  } finally {
    clearTimeout(timeout);
  }
}

function taskError(task: ImageTask): string {
  const code = task.error?.code ? `${task.error.code}: ` : "";
  return `${code}${task.error?.message || "图片生成任务失败，接口未返回具体原因。"}`;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function firstItem(value: unknown): Record<string, unknown> | undefined {
  return Array.isArray(value) ? record(value[0]) : record(value);
}

function imageResult(task: ImageTask): { base64?: string; url?: string } {
  const top = task as Record<string, unknown>;
  const result = record(task.result);
  const output = record(task.output);
  const candidates = [
    firstItem(task.data),
    firstItem(result?.data),
    firstItem(result?.images),
    firstItem(output?.data),
    firstItem(output?.images),
    result,
    output,
    top,
  ].filter((value): value is Record<string, unknown> => Boolean(value));

  for (const candidate of candidates) {
    const base64 = candidate.b64_json ?? candidate.base64 ?? candidate.image_base64;
    if (typeof base64 === "string" && base64.length > 0) return { base64 };
    const url = candidate.url ?? candidate.image_url;
    if (typeof url === "string" && url.length > 0) return { url };
  }
  return {};
}

function responseShape(task: ImageTask): string {
  const describe = (value: unknown): string => {
    if (Array.isArray(value)) return `array(${value.length})[${Object.keys(record(value[0]) || {}).join(",") || typeof value[0]}]`;
    const object = record(value);
    if (object) return `object[${Object.keys(object).join(",")}]`;
    return value === null ? "null" : typeof value;
  };
  return `顶层字段=${Object.keys(task).join(",")}; data=${describe(task.data)}; result=${describe(task.result)}; output=${describe(task.output)}`;
}

async function decodeTaskImage(task: ImageTask): Promise<Buffer> {
  const image = imageResult(task);
  if (image.base64) return decodeBase64(image.base64);
  if (image.url) return downloadImage(image.url);
  throw new Error(`任务已完成，但未找到图片数据。实际响应结构：${responseShape(task)}`);
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

/** OmwAI GPT Image 2 async adapter. */
async function requestImage(args: {
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
  quality: "low" | "medium" | "high" | "auto";
  background: "transparent" | "opaque" | "auto" | "none";
  format: "png" | "jpeg" | "webp";
}): Promise<Buffer> {
  const endpoint = requireEnv("IMAGE_API_ENDPOINT");
  const apiKey = requireEnv("IMAGE_API_KEY");
  const model = requireEnv("IMAGE_API_MODEL");
  const authorization = `Bearer ${apiKey}`;
  const submitted = await requestJson(
    apiUrl(endpoint, "/v1/images/async/generations"),
    {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: args.prompt,
        n: 1,
        size: args.size,
        quality: args.quality,
        background: args.background,
        output_format: args.format,
        moderation: "auto",
      }),
    },
    apiKey,
  );

  if (submitted.status === "failed") throw new Error(taskError(submitted));
  const taskId = submitted.task_id || submitted.id;
  if (!taskId || !/^task_[A-Za-z0-9_-]+$/.test(taskId)) {
    throw new Error("提交成功但接口未返回有效的 task_id。");
  }

  const deadline = Date.now() + TASK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (submitted.status === "completed") {
      return decodeTaskImage(submitted);
    }

    await wait(POLL_INTERVAL_MS);
    const task = await requestJson(
      apiUrl(endpoint, `/v1/images/async/generations/${encodeURIComponent(taskId)}`),
      { method: "GET", headers: { authorization } },
      apiKey,
    );
    if (task.status === "failed") throw new Error(taskError(task));
    if (task.status === "completed") {
      return decodeTaskImage(task);
    }
  }

  throw new Error("图片生成超过 10 分钟仍未完成，请稍后在服务商后台检查任务状态。");
}

const server = new McpServer({ name: "omwstar-image-generator", version: "0.1.0" });

server.registerTool(
  "generate_image",
  {
    title: "Generate and save image",
    description: "Generate one GPT Image 2 image through the OmwAI async API and save it under IMAGE_OUTPUT_ROOT.",
    inputSchema: z.object({
      prompt: z.string().min(10).max(8_000).describe("Detailed image-generation prompt"),
      size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).default("1024x1024"),
      quality: z.enum(["low", "medium", "high", "auto"]).default("high"),
      background: z.enum(["transparent", "opaque", "auto", "none"]).default("auto"),
      format: z.enum(["png", "jpeg", "webp"]).default("webp"),
      outputPath: z.string().min(1).max(240).describe("Relative path under IMAGE_OUTPUT_ROOT, including extension"),
    }),
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ prompt, size, quality, background, format, outputPath }) => {
    try {
      const destination = safeOutputPath(outputPath);
      const extension = extname(destination).toLowerCase();
      const expectedExtensions = format === "jpeg" ? new Set([".jpg", ".jpeg"]) : new Set([`.${format}`]);
      if (!expectedExtensions.has(extension)) {
        throw new Error(`outputPath 扩展名必须与 format=${format} 一致。`);
      }
      await ensureNotExists(destination);
      const image = await requestImage({ prompt, size, quality, background, format });
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
