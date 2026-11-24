// Daily check (AEO B22): is everything an AI agent reads about Shystudio still up? Read-only: four GETs and one
// unauthenticated POST (what any MCP client sends first). No secrets, no account, nothing is written anywhere.
//
//   node scripts/daily-check.mjs            checks https://shystudio.ai
//   SITE=http://127.0.0.1:3000 node scripts/daily-check.mjs
//
// Exit code 1 if any check fails (the GitHub Action then fails and GitHub emails the repo owner).
import { fileURLToPath } from "node:url";

const get = (base, path) => fetch(base + path, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "shystudio-daily-check" } });

export const CHECKS = [
  { name: "/llms.txt serves text and names the MCP address", run: async (b) => {
    const r = await get(b, "/llms.txt"), t = await r.text();
    if (r.status !== 200) return `status ${r.status}`;
    if (!/^text\/plain/.test(r.headers.get("content-type") ?? "")) return `content-type ${r.headers.get("content-type")}`;
    if (!t.includes("/app/mcp")) return "no /app/mcp in the text";
  } },
  { name: "/llms-full.txt serves text and has docs, FAQ and blog", run: async (b) => {
    const r = await get(b, "/llms-full.txt"), t = await r.text();
    if (r.status !== 200) return `status ${r.status}`;
    if (!/^text\/plain/.test(r.headers.get("content-type") ?? "")) return `content-type ${r.headers.get("content-type")}`;
    for (const part of ["## Docs:", "## FAQ", "## Blog:"]) if (!t.includes(part)) return `missing ${part}`;
  } },
  { name: "/docs/agents is up", run: async (b) => {
    const r = await get(b, "/docs/agents");
    if (r.status !== 200) return `status ${r.status}`;
  } },
  { name: "/app/mcp: GET says use POST (405, JSON-RPC error)", run: async (b) => {
    const r = await get(b, "/app/mcp");
    if (r.status !== 405) return `status ${r.status}`;
    const j = await r.json().catch(() => null);
    if (!j?.error) return "not a JSON-RPC error";
  } },
  { name: "/app/mcp: POST without a token gets the sign-in challenge (401)", run: async (b) => {
    const r = await fetch(`${b}/app/mcp`, {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": "shystudio-daily-check" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "daily-check", version: "1" } } }),
    });
    await r.text();
    if (r.status !== 401) return `status ${r.status}`;
  } },
];

/** Runs every check; a thrown error (timeout, DNS) is a failure with its message. Returns [{ name, problem }]. */
export async function runChecks(base) {
  return Promise.all(CHECKS.map(async (c) => ({ name: c.name, problem: (await c.run(base).catch((e) => `error: ${e.message}`)) ?? null })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = (process.env.SITE ?? "https://shystudio.ai").replace(/\/$/, "");
  const res = await runChecks(base);
  for (const r of res) console.log(`${r.problem ? "FAIL" : "ok  "}  ${r.name}${r.problem ? `: ${r.problem}` : ""}`);
  const bad = res.filter((r) => r.problem).length;
  console.log(bad ? `\n${bad} of ${res.length} checks failed (${base})` : `\nall ${res.length} checks passed (${base})`);
  process.exit(bad ? 1 : 0);
}
