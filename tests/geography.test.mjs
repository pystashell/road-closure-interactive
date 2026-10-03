import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rules } from "../data/rules.js";
import { segmentState, chicagoInstant } from "../src/model.js";
const geo = JSON.parse(
  await readFile(
    new URL("../public/data/geography.json", import.meta.url),
    "utf8",
  ),
);
const state = (s, day, m) =>
  segmentState(
    s.ruleIds.map((id) => rules.find((r) => r.id === id)),
    chicagoInstant(day, m),
  );
const mean = (s) =>
  s.points.reduce(
    (a, p) => [a[0] + p[0] / s.points.length, a[1] + p[1] / s.points.length],
    [0, 0],
  );
test("offline map contains real OSM provenance, all requested districts, lake, parks and river", () => {
  assert.ok(geo.segments.length > 4000);
  assert.ok(geo.segments.every((s) => Number.isInteger(s.osm)));
  assert.ok(
    geo.bounds[0] <= -87.666 &&
      geo.bounds[1] <= 41.852 &&
      geo.bounds[2] >= -87.605 &&
      geo.bounds[3] >= 41.91,
  );
  assert.ok(geo.areas.some((a) => a.name === "Lake Michigan"));
  assert.ok(geo.areas.some((a) => a.name === "Grant Park"));
  for (const s of geo.segments)
    for (const p of s.points) {
      assert.ok(p[0] >= geo.bounds[0] - 1e-7 && p[0] <= geo.bounds[2] + 1e-7);
      assert.ok(p[1] >= geo.bounds[1] - 1e-7 && p[1] <= geo.bounds[3] + 1e-7);
    }
});
test("all 15 Grant Park and 11 5K notices are mapped; outside-city-center marathon rows stay in source data", () => {
  for (const r of rules.filter(
    (r) => r.kind === "setup" || r.id.startsWith("5k"),
  ))
    assert.ok(
      geo.segments.some((s) => s.ruleIds.includes(r.id)),
      r.id,
    );
  assert.equal(
    geo.segments.some((s) => s.ruleIds.includes("marathon-35")),
    false,
  );
  assert.ok(rules.some((r) => r.id === "marathon-35"));
});
test("Lower Wacker and underground Columbus are not painted with upper road closures", () => {
  assert.ok(geo.segments.some((s) => s.lower && s.name.includes("Wacker")));
  assert.ok(
    geo.segments.filter((s) => s.lower).every((s) => s.ruleIds.length === 0),
  );
});
test("ordinary Grand / Loomis underpasses stay on the race course", () => {
  for (const osm of [48842496, 56393515]) {
    const ss = geo.segments.filter((s) => s.osm === osm);
    assert.ok(ss.length);
    assert.ok(
      ss.every(
        (s) => !s.lower && s.ruleIds.some((id) => id.startsWith("marathon")),
      ),
    );
  }
});
test("direction-specific Wacker rules match actual one-way geometry", () => {
  for (const [id, direction] of [
    ["5k-08", "southbound"],
    ["5k-09", "northbound"],
  ]) {
    const ss = geo.segments.filter((s) => s.ruleIds.includes(id));
    assert.ok(ss.length > 5);
    assert.ok(ss.every((s) => s.direction === direction && !s.lower));
  }
});
test("State connects distinct east/west Harrison intersections instead of a zero-length marker", () => {
  const ss = geo.segments.filter((s) => s.ruleIds.includes("5k-05"));
  assert.ok(ss.length);
  const pts = ss.flatMap((s) => s.points);
  assert.ok(
    Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])) >
      0.00016,
  );
});
test("Columbus is split at Roosevelt: north stays closed to Monday, south expires Sunday 18:00", () => {
  const crosses = (s, lat) =>
    Math.min(...s.points.map((p) => p[1])) <= lat &&
    Math.max(...s.points.map((p) => p[1])) >= lat;
  const north = geo.segments.find(
    (s) => s.canonical === "Columbus" && !s.lower && crosses(s, 41.8685),
  );
  const south = geo.segments.find(
    (s) => s.canonical === "Columbus" && !s.lower && crosses(s, 41.8658),
  );
  assert.ok(north && south);
  assert.equal(state(north, "2026-10-11", 1140).status, "closed");
  assert.equal(state(south, "2026-10-11", 1140).status, "elapsed");
});
test("Michigan Madison–Balbo differs from Balbo–Roosevelt at Sunday 17:00", () => {
  const north = geo.segments.find(
    (s) =>
      s.canonical === "Michigan" &&
      !s.lower &&
      mean(s)[1] > 41.878 &&
      mean(s)[1] < 41.879,
  );
  const south = geo.segments.find(
    (s) =>
      s.canonical === "Michigan" &&
      !s.lower &&
      mean(s)[1] > 41.87 &&
      mean(s)[1] < 41.871,
  );
  assert.ok(north && south);
  assert.equal(state(north, "2026-10-11", 1020).status, "elapsed");
  assert.equal(state(south, "2026-10-11", 1020).status, "closed");
});
