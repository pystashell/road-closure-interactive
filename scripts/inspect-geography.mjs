import { readFile } from "node:fs/promises";
const d = JSON.parse(await readFile("data/raw/osm.json", "utf8"));
const ways = d.elements.filter((e) => e.type === "way" && e.tags?.highway);
const names = ["Wacker", "Harrison", "Columbus", "Michigan", "Lake Shore"];
for (const n of names) {
  const group = {};
  for (const w of ways.filter((w) => w.tags.name?.includes(n))) {
    const k = [
      w.tags.name,
      w.tags.layer || "0",
      w.tags.level || "0",
      w.tags.oneway || "no",
    ].join("|");
    group[k] = (group[k] || 0) + 1;
  }
  console.log(n, group);
}
const state = ways.filter((w) => w.tags.name === "South State Street");
const h = ways.filter((w) => w.tags.name?.includes("Harrison"));
for (const a of state)
  for (const b of h) {
    const nodes = a.nodes.filter((n) => b.nodes.includes(n));
    if (nodes.length)
      console.log(
        "State x Harrison",
        b.tags.name,
        nodes.map((n) => a.geometry[a.nodes.indexOf(n)]),
      );
  }
console.log(
  "water ways",
  d.elements
    .filter((e) => e.tags?.natural === "water" && e.type === "way")
    .map((e) => [e.id, e.tags.name, e.geometry.length]),
);
