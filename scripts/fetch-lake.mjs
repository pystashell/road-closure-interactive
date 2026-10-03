import { writeFile } from "node:fs/promises";
const query =
  '[out:json][timeout:90];relation["name"="Lake Michigan"]["natural"="water"](41.850,-87.640,41.912,-87.601)->.lake;way(r.lake)(41.845,-87.650,41.918,-87.596);out geom;';
const r = await fetch(
  "https://overpass.kumi.systems/api/interpreter?data=" +
    encodeURIComponent(query),
  {
    headers: {
      "User-Agent":
        "ChicagoRoadClosureInteractive/1.0 (https://github.com/pystashell/road-closure-interactive; offline vector build)",
    },
    signal: AbortSignal.timeout(120000),
  },
);
if (!r.ok) throw new Error("Lake acquisition failed: " + r.status);
const d = await r.json();
await writeFile("data/raw/lake.json", JSON.stringify(d));
console.log(
  "Lake shoreline ways",
  d.elements.map((x) => [x.id, x.geometry?.length]),
);
