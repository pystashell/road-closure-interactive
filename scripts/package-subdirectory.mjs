import { cp, mkdir, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";

// Keep the original workers.dev root entry usable while packaging an exact
// static directory for the requested custom-domain path. No runtime rewrite.
const root = resolve("dist");
const target = resolve(root, "chicago/marathon2026");
if (!target.startsWith(root + sep))
  throw new Error("Invalid asset destination");
const files = await readdir(root);
await mkdir(target, { recursive: true });
for (const name of files) {
  if (name === "chicago" || name.startsWith("_")) continue;
  const source = resolve(root, name);
  const destination = resolve(target, name);
  if (!source.startsWith(root + sep) || !destination.startsWith(target + sep)) {
    throw new Error("Asset path escapes build directory");
  }
  await cp(source, destination, { recursive: true });
}
console.log(
  "Packaged static path: /chicago/marathon2026 (and retained root entry)",
);
