// Run: node --test test/daily-check.test.mjs   (offline: a local fake site, nothing leaves this machine)
import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";
import { runChecks } from "../scripts/daily-check.mjs";

const servers = [];
const fake = (over = {}) => new Promise((res) => {
  const s = http.createServer((req, rsp) => {
    const key = `${req.method} ${req.url}`;
    const o = over[key] ?? over[req.url];
    const [code, type, body] = o ?? ({
      "GET /llms.txt": [200, "text/plain; charset=utf-8", "# Shystudio\nhttps://shystudio.ai/app/mcp"],
      "GET /llms-full.txt": [200, "text/plain; charset=utf-8", "## Docs: a\n## FAQ\n## Blog: b"],
      "GET /docs/agents": [200, "text/html", "<html></html>"],
      "GET /app/mcp": [405, "application/json", '{"jsonrpc":"2.0","error":{"code":-32001,"message":"Use POST"},"id":null}'],
      "POST /app/mcp": [401, "application/json", "{}"],
    }[key] ?? [404, "text/html", "no"]);
    rsp.writeHead(code, { "content-type": type }).end(body);
  }).listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${s.address().port}`));
  servers.push(s);
});
after(() => servers.forEach((s) => s.close()));

test("a healthy site passes every check", async () => {
  const res = await runChecks(await fake());
  assert.equal(res.length, 5);
  assert.deepEqual(res.filter((r) => r.problem), []);
});
test("each problem is named: missing /llms-full.txt, wrong type, no MCP address, MCP open without sign-in, MCP down", async () => {
  const bad = await runChecks(await fake({
    "GET /llms-full.txt": [404, "text/html", "nope"],
    "GET /llms.txt": [200, "text/html", "<p>/app/mcp</p>"],
    "POST /app/mcp": [200, "application/json", "{}"],
    "GET /app/mcp": [502, "text/plain", "bad gateway"],
  }));
  const p = Object.fromEntries(bad.map((r) => [r.name.split(" ")[0] + (r.name.includes("without a token") ? " POST" : ""), r.problem]));
  assert.match(p["/llms-full.txt"], /status 404/);
  assert.match(p["/llms.txt"], /content-type text\/html/);
  assert.match(p["/app/mcp: POST"], /status 200/);
  assert.match(p["/app/mcp:"], /status 502/);
  assert.equal(p["/docs/agents"], null);
});
test("a site that is not there is a failure message, not a crash", async () => {
  const res = await runChecks("http://127.0.0.1:1");
  assert.ok(res.every((r) => /^error:/.test(r.problem)));
});
test("llms-full.txt without the blog section fails", async () => {
  const res = await runChecks(await fake({ "GET /llms-full.txt": [200, "text/plain", "## Docs: a\n## FAQ"] }));
  assert.match(res.find((r) => r.name.startsWith("/llms-full")).problem, /missing ## Blog:/);
});
