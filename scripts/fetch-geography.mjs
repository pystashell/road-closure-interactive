import { mkdir, writeFile } from "node:fs/promises";
// Development-only acquisition. The deployed application never calls a map API.
const bbox = "41.850,-87.670,41.912,-87.601";
const query = `[out:json][timeout:180];(way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${bbox});way[leisure=park](${bbox});relation[leisure=park](${bbox});way[natural=water](${bbox});relation[water=river](${bbox});way[waterway=riverbank](${bbox}););out geom;`;
await mkdir("data/raw", { recursive: true });
for (const base of [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]) {
  try {
    console.log("Acquiring open vector geography from", base);
    const response = await fetch(`${base}?data=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent":
          "ChicagoRoadClosureInteractive/1.0 (https://github.com/pystashell/road-closure-interactive; offline map build)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(210000),
    });
    if (!response.ok)
      throw new Error(
        `${response.status}: ${(await response.text()).slice(0, 100)}`,
      );
    const data = await response.json();
    if (data.remark) throw new Error(data.remark);
    await writeFile("data/raw/osm.json", JSON.stringify(data));
    console.log(
      "Saved",
      data.elements.length,
      "OSM elements. Snapshot:",
      data.osm3s.timestamp_osm_base,
    );
    break;
  } catch (error) {
    console.error(error.message);
    if (base.includes("kumi")) process.exitCode = 1;
  }
}
