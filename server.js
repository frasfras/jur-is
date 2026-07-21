"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const LEGAL_AGENT_URL = "https://myjurisagent-dec-1008791897094.us-east1.run.app";
const ROOT = __dirname;
const FILE_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...headers,
  });
  response.end(body);
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyRequest(request, response, remotePath) {
  try {
    const body = await readRequestBody(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    let agentResponse;
    try {
      agentResponse = await fetch(`${LEGAL_AGENT_URL}${remotePath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: body.length ? body : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const agentBody = await agentResponse.arrayBuffer();
    send(response, agentResponse.status, Buffer.from(agentBody), {
      "Content-Type": agentResponse.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
  } catch (error) {
    const status = error.name === "AbortError" ? 504 : 502;
    send(response, status, JSON.stringify({ error: "Juris Copilot service is unavailable. Please try again." }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  }
}

async function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) return send(response, 403, "Forbidden");
  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    send(response, 200, content, {
      "Content-Type": FILE_TYPES[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
      "Content-Security-Policy": "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'",
    });
  } catch {
    send(response, 404, "Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/api/session") {
    return proxyRequest(request, response, "/apps/app/users/web-user-01/sessions");
  }
  if (request.method === "POST" && url.pathname === "/api/run") return proxyRequest(request, response, "/run");
  if (request.method === "GET" || request.method === "HEAD") return serveStatic(request, response, url.pathname);
  return send(response, 405, "Method not allowed", { Allow: "GET, HEAD, POST" });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Juris Copilot is running on port ${PORT}`));
