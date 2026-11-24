// Registry version check (AEO B23): is server.json still consistent with what the official MCP registry lists?
// Read-only (one GET to registry.modelcontextprotocol.io). No secrets. Publishing stays a manual step.
//
//   node scripts/registry-check.mjs                 pull request / push: server.json must be valid and its version must not be
//                                                   LOWER than the registry's. Higher = "publish after merge".
//   node scripts/registry-check.mjs --expect-match  scheduled, on main: the version must EQUAL the registry's (else: not published yet).
//
// If the registry cannot be reached the check prints a warning and passes (a third party's outage must not block our CI).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const REGISTRY = "https://registry.modelcontextprotocol.io/v0/servers";
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const cmp = (a, b) => { const x = a.match(SEMVER).slice(1).map(Number), y = b.match(SEMVER).slice(1).map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

/** Offline rules for server.json. Returns a list of problems. */
export function validate(s) {
  const p = [];
  if (!/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(s.name ?? "")) p.push(`name "${s.name}" is not namespace/name`);
  if (!SEMVER.test(s.version ?? "")) p.push(`version "${s.version}" is not x.y.z`);
  if (!Array.isArray(s.remotes) || !s.remotes.length || !s.remotes.every((r) => /^https:\/\//.test(r.url ?? ""))) p.push("remotes must list https urls");
  return p;
}

/** Returns { ok, level: "ok"|"warn"|"fail", message }. fetchFn is injectable for tests. */
export async function check(server, { expectMatch = false, fetchFn = fetch } = {}) {
  const bad = validate(server);
  if (bad.length) return { ok: false, level: "fail", message: `server.json: ${bad.join("; ")}` };
  let list;
  try {
    const r = await fetchFn(`${REGISTRY}?search=${encodeURIComponent(server.name)}`, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "shystudio-registry-check" } });
    if (!r.ok) throw new Error(`status ${r.status}`);
    list = (await r.json()).servers ?? [];
  } catch (e) {
    return { ok: true, level: "warn", message: `registry not reachable (${e.message}); version not compared` };
  }
  const mine = list.filter((x) => x.server?.name === server.name);
  const latest = mine.find((x) => x._meta?.["io.modelcontextprotocol.registry/official"]?.isLatest) ?? mine.at(-1);
  if (!latest) return { ok: !expectMatch, level: expectMatch ? "fail" : "warn", message: `${server.name} is not in the registry yet (server.json says ${server.version})` };
  const reg = latest.server.version;
  if (!SEMVER.test(reg ?? "")) return { ok: true, level: "warn", message: `registry version "${reg}" is not x.y.z; not compared` };
  const d = cmp(server.version, reg);
  if (d < 0) return { ok: false, level: "fail", message: `server.json ${server.version} is lower than the registry's ${reg}` };
  if (d === 0) return { ok: true, level: "ok", message: `server.json and the registry agree: ${reg}` };
  return expectMatch
    ? { ok: false, level: "fail", message: `server.json ${server.version} is ahead of the registry's ${reg}: not published yet` }
    : { ok: true, level: "ok", message: `server.json ${server.version} is ahead of the registry's ${reg}: publish after merge` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = JSON.parse(fs.readFileSync(new URL("../server.json", import.meta.url), "utf8"));
  const r = await check(server, { expectMatch: process.argv.includes("--expect-match") });
  console.log(`${r.level.toUpperCase()}: ${r.message}`);
  process.exit(r.ok ? 0 : 1);
}
