import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const remoteFetch = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(20000) });

const entry = new URL(
  process.env.TEST_URL ||
    "https://road-closure.catseye.today/chicago/marathon2026",
);
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const report = {
  url: entry.href,
  commit,
  checkedAt: new Date().toISOString(),
  files: [],
  checks: [],
};
const response = await remoteFetch(entry, {
  redirect: "manual",
  cache: "no-store",
});
assert.equal(
  response.status,
  200,
  "Exact entry URL must serve HTML without requiring a trailing slash",
);
const html = await response.text();
assert.match(html, /芝加哥赛事封路地图/);
assert.ok(
  response.headers
    .get("content-security-policy")
    ?.includes("connect-src 'self'"),
);
report.checks.push(
  "Exact no-trailing-slash entry returns 200 with correct HTML and CSP",
);
const base = "/chicago/marathon2026/";
const assets = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p.includes("/assets/") || p.endsWith("favicon.svg"));
assert.ok(assets.length >= 3);
assert.ok(
  assets.every((p) => p.startsWith(base)),
  "HTML resources must use the specified base path",
);
for (const p of [
  ...assets,
  base + "data/geography.json",
  base + "data/closures.json",
  base + "build.json",
]) {
  const r = await remoteFetch(new URL(p, entry), { cache: "no-store" });
  assert.equal(r.status, 200, p);
  const remote = Buffer.from(await r.arrayBuffer());
  const local = await readFile("dist" + p);
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  assert.equal(hash(remote), hash(local), p);
  if (p.endsWith("build.json")) assert.equal(JSON.parse(remote).commit, commit);
  report.files.push({
    path: p,
    status: r.status,
    contentType: r.headers.get("content-type"),
    bytes: remote.length,
    sha256: hash(remote),
  });
}
report.checks.push(
  "Nested JS, CSS, favicon, map, closure data and build manifest byte-match the current commit build",
);
if (entry.pathname !== "/") {
  const trailing = new URL(entry);
  trailing.pathname += "/";
  trailing.search = "?date=2026-10-10&time=06%3A30";
  const r = await remoteFetch(trailing, { redirect: "manual" });
  assert.ok([301, 302, 307, 308].includes(r.status));
  const target = new URL(r.headers.get("location"), trailing);
  assert.equal(target.pathname, entry.pathname);
  assert.equal(target.searchParams.get("date"), "2026-10-10");
  assert.equal(target.searchParams.get("time"), "06:30");
  report.checks.push(
    "Trailing slash canonicalizes to exact requested path and preserves date/time query",
  );
}
const output = process.env.QA_OUTPUT || "artifacts/custom-domain";
await mkdir(output, { recursive: true });
await writeFile(
  output + "/deployment-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
