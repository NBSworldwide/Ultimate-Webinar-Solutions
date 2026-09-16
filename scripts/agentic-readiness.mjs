import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const baseUrl = (process.env.READINESS_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const root = process.cwd();
const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
}

async function checkRoute(route, expectedContentType, inspect) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const contentTypeOk = expectedContentType ? contentType.includes(expectedContentType) : true;
    const inspection = inspect ? await inspect(body, response) : { passed: true, detail: `${response.status} ${contentType}` };
    record(`route ${route}`, response.status === 200 && contentTypeOk && inspection.passed, `${response.status} ${contentType}; ${inspection.detail}`);
  } catch (error) {
    record(`route ${route}`, false, error instanceof Error ? error.message : String(error));
  }
}

async function checkRedirect(route) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
    const location = response.headers.get("location") ?? "";
    const passed = [301, 302, 303, 307, 308].includes(response.status) && location.includes("/login");
    record(`protected redirect ${route}`, passed, `${response.status} ${location}`.trim());
  } catch (error) {
    record(`protected redirect ${route}`, false, error instanceof Error ? error.message : String(error));
  }
}

function includesAll(body, markers) {
  const missing = markers.filter((marker) => !body.includes(marker));
  return missing.length === 0
    ? { passed: true, detail: `found ${markers.join(", ")}` }
    : { passed: false, detail: `missing ${missing.join(", ")}` };
}

function inspectJsonLd(body, markers = []) {
  const blocks = [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  if (blocks.length === 0) return { passed: false, detail: "no JSON-LD script found" };
  try {
    blocks.forEach((block) => JSON.parse(block));
  } catch (error) {
    return { passed: false, detail: `invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}` };
  }
  return includesAll(body, markers);
}

async function collectFiles(directory) {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isFile()) files.push(entryPath);
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath));
  }
  return files;
}

async function checkSourceBoundary() {
  const sourceDirectories = ["app", "components", "lib", "scripts"];
  const files = [];
  for (const directory of sourceDirectories) files.push(...await collectFiles(path.join(root, directory)));
  const forbidden = /wp-content|wp-json|woocommerce|wordpress|backup-webinar|_analysis/i;
  const matches = [];
  for (const file of files) {
    if (path.basename(file) === "agentic-readiness.mjs") continue;
    const contents = await fs.readFile(file, "utf8");
    if (forbidden.test(contents)) matches.push(path.relative(root, file));
  }
  record("standalone source boundary", matches.length === 0, matches.length === 0 ? "no WordPress/archive references in complete runtime source" : `references found in ${matches.join(", ")}`);
}

async function checkConfig() {
  try {
    const config = JSON.parse(await fs.readFile(path.join(root, ".mcp.json"), "utf8"));
    const server = config?.mcpServers?.["next-devtools"];
    const valid = server?.command === "npx" && Array.isArray(server.args) && server.args.includes("next-devtools-mcp@latest");
    record("MCP runtime configuration", valid, valid ? "next-devtools MCP is configured" : "next-devtools MCP configuration is incomplete");
  } catch (error) {
    record("MCP runtime configuration", false, error instanceof Error ? error.message : String(error));
  }
}

async function checkGit() {
  if (process.env.READINESS_REQUIRE_GIT !== "true") {
    record("release commit", true, "skipped; set READINESS_REQUIRE_GIT=true for the post-main release gate");
    return;
  }
  try {
    const [{ stdout: branch }, { stdout: sha }, { stdout: status }] = await Promise.all([
      execFileAsync("git", ["branch", "--show-current"], { cwd: root }),
      execFileAsync("git", ["rev-parse", "--verify", "HEAD"], { cwd: root }),
      execFileAsync("git", ["status", "--porcelain"], { cwd: root }),
    ]);
    const currentBranch = branch.trim();
    const commit = sha.trim();
    const clean = status.trim().length === 0;
    record("release commit", currentBranch === "main" && commit.length > 0 && clean, `${currentBranch || "no branch"} ${commit || "no commit"}; ${clean ? "clean" : "working tree has changes"}`);
  } catch (error) {
    record("release commit", false, error instanceof Error ? error.message : String(error));
  }
}

await checkConfig();
await checkGit();
await checkSourceBoundary();
await checkRoute("/api/health", "application/json", (body) => {
  try {
    const health = JSON.parse(body);
    const valid = health.status === "ok" && health.database === "sqlite" && health.syntheticData === true && health.originalDataImported === false && typeof health.datasetOrigin === "string";
    return { passed: valid, detail: valid ? `SQLite boundary reported ${health.datasetOrigin}` : "health payload did not confirm the expected boundary" };
  } catch {
    return { passed: false, detail: "health response was not valid JSON" };
  }
});
await checkRoute("/webinars", "text/html", (body, response) => {
  const schema = inspectJsonLd(body, ["ItemList", "Event"]);
  const headers = ["x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"].filter((key) => !response.headers.get(key));
  return headers.length === 0 && schema.passed
    ? { passed: true, detail: "catalog page, JSON-LD, and security headers verified" }
    : { passed: false, detail: `${schema.detail}; missing headers: ${headers.join(", ") || "none"}` };
});
await checkRoute("/webinars/operations-readiness-briefing", "text/html", (body) => inspectJsonLd(body, ["Event", "RegisterAction", "Maya Chen"]));
await checkRoute("/locations", "text/html", (body) => inspectJsonLd(body, ["ItemList", "Service", "Chicago"]));
await checkRoute("/locations/chicago-il", "text/html", (body) => inspectJsonLd(body, ["Service", "Place", "Chicago"]));
await checkRoute("/api/webinars", "application/json", (body) => {
  try {
    const payload = JSON.parse(body);
    const serialized = JSON.stringify(payload);
    const safe = !/revenueCents|customerEmail|customerPhone|customer_email|customer_phone/i.test(serialized);
    return { passed: safe && Array.isArray(payload.webinars), detail: safe ? "public projection excludes revenue and PII" : "public projection contains an internal field" };
  } catch {
    return { passed: false, detail: "public API response was not valid JSON" };
  }
});
await checkRoute("/robots.txt", "text/plain", (body) => includesAll(body, ["/webinars", "/locations", "Sitemap:"]));
await checkRoute("/sitemap.xml", "application/xml", (body) => includesAll(body, ["/webinars", "/locations", "operations-readiness-briefing", "chicago-il"]));
await checkRedirect("/account");
await checkRedirect("/admin");

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;
console.log(JSON.stringify({ baseUrl, passed, failed, results }, null, 2));
if (failed > 0) process.exitCode = 1;
