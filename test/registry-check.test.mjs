// Run: node --test test/registry-check.test.mjs   (offline: the registry is a fake function)
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { check, validate } from "../scripts/registry-check.mjs";

const mine = { name: "ai.shystudio/shystudio", version: "1.2.0", remotes: [{ type: "streamable-http", url: "https://shystudio.ai/app/mcp" }] };
const reg = (version, name = mine.name) => async () => ({ ok: true, json: async () => ({ servers: [{ server: { name, version }, _meta: { "io.modelcontextprotocol.registry/official": { isLatest: true } } }] }) });

test("the real server.json is valid", () => {
  assert.deepEqual(validate(JSON.parse(fs.readFileSync(new URL("../server.json", import.meta.url), "utf8"))), []);
});
test("invalid server.json: bad name, version, or a non-https remote", async () => {
  assert.equal(validate({ ...mine, version: "1.0" }).length, 1);
  assert.equal(validate({ ...mine, name: "nonamespace" }).length, 1);
  assert.equal(validate({ ...mine, remotes: [{ url: "http://x" }] }).length, 1);
  assert.equal((await check({ ...mine, version: "v1" }, { fetchFn: reg("1.0.0") })).level, "fail");
});
test("equal = ok, ahead = ok (publish after merge), lower = fail", async () => {
  assert.equal((await check(mine, { fetchFn: reg("1.2.0") })).level, "ok");
  assert.match((await check(mine, { fetchFn: reg("1.1.9") })).message, /publish after merge/);
  const low = await check(mine, { fetchFn: reg("1.10.0") }); // numeric, not text, compare: 1.2.0 < 1.10.0
  assert.equal(low.ok, false);
  assert.match(low.message, /lower than the registry's 1\.10\.0/);
});
test("--expect-match: ahead fails (not published), equal passes", async () => {
  assert.equal((await check(mine, { expectMatch: true, fetchFn: reg("1.1.0") })).ok, false);
  assert.equal((await check(mine, { expectMatch: true, fetchFn: reg("1.2.0") })).ok, true);
});
test("not in the registry: warn on a PR, fail with --expect-match; another server's entry does not count", async () => {
  const other = reg("1.2.0", "ai.someone/else");
  assert.equal((await check(mine, { fetchFn: other })).level, "warn");
  assert.equal((await check(mine, { expectMatch: true, fetchFn: other })).ok, false);
});
test("registry down or answering an error: a warning that passes, not a crash", async () => {
  assert.equal((await check(mine, { fetchFn: async () => { throw new Error("ENOTFOUND"); } })).level, "warn");
  assert.equal((await check(mine, { fetchFn: async () => ({ ok: false, status: 503 }) })).ok, true);
});
