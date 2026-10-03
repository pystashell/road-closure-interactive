import { readFile, writeFile, mkdir } from "node:fs/promises";
import { rules, checkedAt } from "../data/rules.js";
const raw = JSON.parse(await readFile("data/raw/osm.json", "utf8"));
const lake = JSON.parse(await readFile("data/raw/lake.json", "utf8"));
export const bounds = [-87.67, 41.85, -87.601, 41.912];
const norm = (n) =>
  (n || "")
    .replace(/\b(North|South|East|West|Upper|Lower|E\.|W\.)\s*/g, "")
    .replace(/\b(Street|St|Drive|Dr|Avenue|Ave|Boulevard|Blvd|Road|Rd)\.?$/, "")
    .trim();
// A normal street beneath a bridge (e.g. Grand beneath Michigan, Loomis beneath
// the railway) is not a separate lower road. Only the downtown multi-level
// streets use below-grade metadata as a level discriminator.
const lower = (w) =>
  /Lower/.test(w.tags.name) ||
  Number(w.tags.level) < 0 ||
  (Number(w.tags.layer) < 0 && /Columbus|Wacker|Randolph/.test(w.tags.name));
const ways = raw.elements.filter(
  (e) => e.type === "way" && e.tags?.highway && e.geometry?.length > 1,
);
const visibleWays = ways.filter(
  (w) => !w.tags.highway.endsWith("_link") && !lower(w),
);
const roadWays = (name) =>
  visibleWays.filter((w) => norm(w.tags.name) === norm(name));
function intersection(road, cross, axis, fallback) {
  const a = roadWays(road),
    b = roadWays(cross),
    ids = new Set(b.flatMap((w) => w.nodes));
  const pts = a.flatMap((w) =>
    w.nodes.flatMap((id, i) => (ids.has(id) ? [w.geometry[i]] : [])),
  );
  if (!pts.length) {
    if (fallback !== undefined) return fallback;
    throw new Error(`No intersection: ${road} / ${cross}`);
  }
  const values = [
    ...new Set(pts.map((p) => (axis === 0 ? p.lon : p.lat))),
  ].sort((x, y) => x - y);
  return values[Math.floor(values.length / 2)];
}
const specs = {};
function between(id, axis, from, to, fallbackA, fallbackB) {
  const r = rules.find((r) => r.id === id),
    a = intersection(r.road, from, axis, fallbackA),
    b = intersection(r.road, to, axis, fallbackB);
  specs[id] = { axis, min: Math.min(a, b), max: Math.max(a, b) };
}
for (const r of rules.filter((r) => r.id.startsWith("grant"))) {
  if (r.id === "grant-07") {
    specs[r.id] = { axis: 1, min: 41.8744, max: 41.8771 };
    continue;
  }
  between(
    r.id,
    ["Columbus Dr", "Michigan Ave"].includes(r.road) ? 1 : 0,
    r.from,
    r.to,
  );
}
between("5k-01", 0, "Columbus Dr", "Michigan Ave");
specs["5k-02"] = { axis: 1, min: 41.8744, max: 41.87595 };
between("5k-03", 1, "Ida B. Wells Dr", "Balbo Dr");
between("5k-04", 0, "Michigan Ave", "Franklin St");
specs["5k-05"] = { axis: 1, min: 41.8743865, max: 41.8745607 };
between("5k-06", 1, "Harrison St", "Adams St");
between("5k-07", 0, "Wacker Dr", "Franklin St");
specs["5k-08"] = {
  axis: 1,
  min: intersection("Wacker Dr", "Van Buren St", 1),
  max: 42,
  lonMax: intersection("Wacker Dr", "Michigan Ave", 0),
  direction: "southbound",
};
specs["5k-09"] = {
  axis: 1,
  min: intersection("Wacker Dr", "Adams St", 1),
  max: 42,
  lonMax: intersection("Wacker Dr", "Michigan Ave", 0),
  direction: "northbound",
};
between("5k-10", 0, "Wacker Dr", "Franklin St");
between("5k-11", 1, "Adams St", "Van Buren St");
between("marathon-01", 1, "Start", "Grand Ave", 41.8804);
between("marathon-02", 0, "Columbus Dr", "Dearborn St");
between("marathon-03", 1, "Grand Ave", "Jackson Blvd");
between("marathon-04", 0, "Dearborn St", "LaSalle St");
between("marathon-05", 1, "Jackson Blvd", "Stockton Dr", undefined, 42.0);
between("marathon-17", 1, "Webster Ave", "North Ave", 42.0);
between("marathon-18", 0, "Sedgwick St", "Wells St");
between("marathon-19", 1, "North Ave", "Walton St");
between("marathon-20", 1, "Walton St", "Wacker Dr");
specs["marathon-21"] = {
  axis: 1,
  min: intersection("Wacker Dr", "Adams St", 1),
  max: 42,
  lonMax: intersection("Wacker Dr", "Wells St", 0),
};
between("marathon-22", 0, "Wacker Dr", "Damen Ave", undefined, -87.6775);
between("marathon-24", 0, "Damen Ave", "Halsted St", -87.6775);
between("marathon-25", 1, "Jackson Blvd", "Taylor St");
between("marathon-26", 0, "Halsted St", "Loomis St");
between("marathon-27", 1, "Taylor St", "18th St");
between("marathon-28", 0, "Loomis St", "Halsted St");
between("marathon-29", 1, "18th St", "21st St");
between("marathon-30", 0, "Halsted St", "Canalport Ave");
between("marathon-31", 1, "21st St", "Cermak Rd");
between("marathon-32", 0, "Canalport Ave", "Wentworth Ave");
between("marathon-33", 1, "Cermak Rd", "26th St", undefined, 41.845);
between("marathon-39", 1, "31st St", "Roosevelt Rd", 41.838);
between("marathon-40", 0, "Michigan Ave", "Columbus Dr");
specs["marathon-41"] = {
  axis: 1,
  min: intersection("Columbus Dr", "Roosevelt Rd", 1),
  max: 41.8701,
};
function matches(p, s, direction) {
  return (
    p[s.axis] >= s.min - 1e-9 &&
    p[s.axis] <= s.max + 1e-9 &&
    (!s.lonMax || p[0] <= s.lonMax) &&
    (!s.direction || s.direction === direction)
  );
}
function inBounds(p) {
  return (
    p[0] >= bounds[0] &&
    p[0] <= bounds[2] &&
    p[1] >= bounds[1] &&
    p[1] <= bounds[3]
  );
}
const round = (p) => p.map((n) => Number(n.toFixed(7)));
const segments = [];
for (const w of ways) {
  const candidates =
    lower(w) || w.tags.highway.endsWith("_link")
      ? []
      : rules.filter((r) => specs[r.id] && norm(r.road) === norm(w.tags.name));
  const geom = w.geometry.map((p) => [p.lon, p.lat]);
  let current = null;
  const direction =
    w.tags.oneway === "yes"
      ? -(geom.at(-1)[0] - geom[0][0]) * 0.745 - (geom.at(-1)[1] - geom[0][1]) >
        0
        ? "southbound"
        : "northbound"
      : null;
  for (let j = 1; j < geom.length; j++) {
    const a = geom[j - 1],
      b = geom[j];
    let ts = [0, 1];
    const limits = [
      [0, bounds[0]],
      [0, bounds[2]],
      [1, bounds[1]],
      [1, bounds[3]],
      ...candidates.flatMap((r) => {
        const s = specs[r.id];
        return [
          [s.axis, s.min],
          [s.axis, s.max],
          ...(s.lonMax ? [[0, s.lonMax]] : []),
        ];
      }),
    ];
    for (const [axis, limit] of limits) {
      const t = (limit - a[axis]) / (b[axis] - a[axis]);
      if (t > 0 && t < 1) ts.push(t);
    }
    ts = [...new Set(ts)].sort((x, y) => x - y);
    const at = (t) => a.map((v, i) => v + (b[i] - v) * t);
    for (let k = 1; k < ts.length; k++) {
      const mid = at((ts[k - 1] + ts[k]) / 2);
      if (!inBounds(mid)) {
        current = null;
        continue;
      }
      const ruleIds = candidates
        .filter((r) => matches(mid, specs[r.id], direction))
        .map((r) => r.id);
      const key = ruleIds.join(",");
      const p0 = round(at(ts[k - 1])),
        p1 = round(at(ts[k]));
      if (current && current.key === key) {
        current.points.push(p1);
      } else {
        current = {
          id: `${w.id}-${segments.length}`,
          osm: w.id,
          name: w.tags.name || "未命名道路",
          canonical: norm(w.tags.name),
          highway: w.tags.highway,
          lower: lower(w),
          oneway: w.tags.oneway === "yes",
          direction,
          ruleIds,
          points: [p0, p1],
          key,
        };
        segments.push(current);
      }
    }
  }
}
// Assemble multipolygon member ways by their shared endpoints. Retain inner rings for evenodd fill.
const eq = (a, b) => a && b && a.lon === b.lon && a.lat === b.lat;
function rings(el, includeOpen = false) {
  if (el.type === "way") return el.geometry ? [el.geometry] : [];
  const pending = el.members
    .filter((m) => m.type === "way" && m.geometry?.length)
    .map((m) => m.geometry.slice());
  const result = [];
  while (pending.length) {
    let ring = pending.pop(),
      changed = true;
    while (!eq(ring[0], ring.at(-1)) && changed) {
      changed = false;
      for (let i = 0; i < pending.length; i++) {
        let q = pending[i];
        if (eq(ring.at(-1), q[0])) ring.push(...q.slice(1));
        else if (eq(ring.at(-1), q.at(-1)))
          ring.push(...q.slice(0, -1).reverse());
        else if (eq(ring[0], q.at(-1))) ring.unshift(...q.slice(0, -1));
        else if (eq(ring[0], q[0])) ring.unshift(...q.slice(1).reverse());
        else continue;
        pending.splice(i, 1);
        changed = true;
        break;
      }
    }
    if (eq(ring[0], ring.at(-1)) || includeOpen) result.push(ring);
  }
  return result;
}
function clipPolygon(points) {
  let poly = points.map((p) => [p.lon, p.lat]);
  for (const [axis, limit, side] of [
    [0, bounds[0], 1],
    [0, bounds[2], -1],
    [1, bounds[1], 1],
    [1, bounds[3], -1],
  ]) {
    const output = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length],
        ina = (a[axis] - limit) * side >= 0,
        inb = (b[axis] - limit) * side >= 0;
      if (ina) output.push(a);
      if (ina !== inb) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        output.push(a.map((v, j) => v + (b[j] - v) * t));
      }
    }
    poly = output;
  }
  return poly.map(round);
}
const areas = [];
// Local lake relation members form the real shoreline. Close the mainland chain
// east of the viewport, then clip to the viewport; no invented coastline points.
const lakeChains = rings(
  { members: lake.elements.map((e) => ({ ...e, type: "way" })) },
  true,
);
console.log("Assembled", lakeChains.length, "local shoreline chains.");
const coast = lakeChains
  .filter((r) => !eq(r[0], r.at(-1)))
  .sort(
    (a, b) =>
      Math.abs(b.at(-1).lat - b[0].lat) - Math.abs(a.at(-1).lat - a[0].lat),
  )[0];
if (
  !coast ||
  Math.min(coast[0].lat, coast.at(-1).lat) > bounds[1] ||
  Math.max(coast[0].lat, coast.at(-1).lat) < bounds[3]
)
  throw new Error("Lake shoreline does not cover map north/south bounds");
const closedCoast = [
  ...coast,
  { lat: coast.at(-1).lat, lon: bounds[2] + 0.1 },
  { lat: coast[0].lat, lon: bounds[2] + 0.1 },
  coast[0],
];
const lakeRings = [
  clipPolygon(closedCoast),
  ...lakeChains.filter((r) => eq(r[0], r.at(-1))).map(clipPolygon),
].filter((r) => r.length > 2);
areas.push({
  id: "osm/Lake-Michigan-local-shoreline",
  name: "Lake Michigan",
  kind: "water",
  rings: lakeRings,
});
for (const el of raw.elements.filter(
  (e) =>
    e.tags?.leisure === "park" ||
    e.tags?.natural === "water" ||
    e.tags?.waterway === "riverbank",
)) {
  const polys = rings(el)
    .map(clipPolygon)
    .filter((p) => p.length > 2);
  if (polys.length)
    areas.push({
      id: `${el.type}/${el.id}`,
      name: el.tags.name || "",
      kind: el.tags.leisure === "park" ? "park" : "water",
      rings: polys,
    });
}
const cleanSegments = segments.map(({ key, ...s }) => s);
const data = {
  bounds,
  snapshot: raw.osm3s.timestamp_osm_base,
  checkedAt,
  attribution: "© OpenStreetMap contributors · ODbL 1.0",
  segments: cleanSegments,
  areas,
};
await mkdir("public/data", { recursive: true });
await writeFile("public/data/geography.json", JSON.stringify(data));
await writeFile(
  "public/data/closures.json",
  JSON.stringify({ checkedAt, rules }, null, 2),
);
const coverage = rules.map((r) => ({
  id: r.id,
  road: r.road,
  features: segments.filter((s) => s.ruleIds.includes(r.id)).length,
}));
await writeFile(
  "data/geometry-coverage.json",
  JSON.stringify(coverage, null, 2),
);
console.log(
  "Packaged",
  segments.length,
  "street pieces,",
  areas.length,
  "areas.",
);
console.log(
  "Visible closure rules:",
  coverage.filter((c) => c.features).length,
  "of",
  rules.length,
);
for (const r of rules.filter((r) => specs[r.id]))
  if (!coverage.find((c) => c.id === r.id).features)
    throw new Error("Missing geometry: " + r.id);
