import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { checkedAt } from "../data/rules.js";
let commit = "working-tree";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}
await mkdir("public", { recursive: true });
await writeFile(
  "public/build.json",
  JSON.stringify(
    {
      app: "chicago-road-closure-interactive",
      commit,
      builtAt: new Date().toISOString(),
      dataCheckedAt: checkedAt,
    },
    null,
    2,
  ),
);
console.log("Build source:", commit);
