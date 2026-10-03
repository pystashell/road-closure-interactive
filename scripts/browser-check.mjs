import { chromium } from "@playwright/test";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const out = process.env.QA_OUTPUT || "artifacts";
await mkdir(out, { recursive: true });
const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
const shells = (await readdir(cache))
  .filter((n) => n.startsWith("chromium_headless_shell-"))
  .sort((a, b) => Number(b.split("-").at(-1)) - Number(a.split("-").at(-1)));
const executablePath = path.join(
  cache,
  shells[0],
  "chrome-headless-shell-win64",
  "chrome-headless-shell.exe",
);
const browser = await chromium.launch({ headless: true, executablePath });
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
const results = {
  url: base,
  errors: [],
  requests: [],
  checks: [],
  screenshots: [],
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  timezoneId: "Asia/Shanghai",
});
const page = await context.newPage();
page.on("pageerror", (e) => results.errors.push(e.message));
page.on("request", (r) => results.requests.push(r.url()));
await page.goto(base, { waitUntil: "networkidle" });
await page.locator("[data-closure]").first().waitFor();
await page.screenshot({ path: `${out}/desktop-overview.png`, fullPage: true });
results.screenshots.push("desktop-overview.png");
if (process.env.QA_QUICK) {
  console.log(
    JSON.stringify(
      {
        text: await page.locator("#road-count").textContent(),
        errors: results.errors,
        screenshots: results.screenshots,
      },
      null,
      2,
    ),
  );
  await browser.close();
  process.exit(0);
}
assert.match(await page.locator("#map-time").textContent(), /11 日 · 07:30/);
results.checks.push(
  "Initial date/time stays in Chicago despite Asia/Shanghai browser timezone",
);
const geo = JSON.parse(await readFile("public/data/geography.json", "utf8"));
const balbo = geo.segments
  .filter((s) => s.ruleIds.includes("grant-01"))
  .sort((a, b) => b.points.length - a.points.length)[0];
const mapPoint = await page
  .locator(`[data-hit="${balbo.id}"]`)
  .evaluate((p) => {
    const q = p.getPointAtLength(p.getTotalLength() / 2);
    const point = new DOMPoint(q.x, q.y).matrixTransform(p.getScreenCTM());
    return { x: point.x, y: point.y };
  });
await page.mouse.click(mapPoint.x, mapPoint.y);
assert.match(await page.locator("#detail").textContent(), /Balbo/);
assert.match(await page.locator("#detail").textContent(), /10\/16|10月16/);
results.checks.push(
  "Clicking actual SVG road geometry opens its source-backed detail",
);
await page.locator("#close-detail").click();
await page.locator('[data-date="2026-10-10"]').click();
await page.locator("#time-input").fill("06:29");
const pre5k = await page.locator(".closure.closed.race").count();
assert.equal(pre5k > 0, true); // 05:00 staging rows are already active.
const before = await page.locator(".closure.closed").count();
await page.locator("#time-input").fill("06:30");
assert.ok((await page.locator(".closure.closed").count()) > before);
results.checks.push("5K changes at the exact 06:30 boundary");
await page.locator("#time-input").fill("09:30");
await page.locator("#road-search").fill("Harrison");
await page.locator('[data-name="Harrison"]').click();
assert.match(await page.locator("#detail").textContent(), /已过预计恢复时间/);
assert.match(await page.locator("#detail").textContent(), /不一致|差异/);
results.checks.push("Harrison exact 09:30 boundary and discrepancy detail");
await page.locator("#close-detail").click();
await page.locator("#reset-map").click();
await page.locator("#road-search").fill("");
await page.locator("#time-input").fill("12:00");
assert.ok((await page.locator(".closure.closed.setup").count()) > 0);
assert.equal(await page.locator(".closure.closed.race").count(), 0);
results.checks.push(
  "5K noon retains Grant Park setup and removes race closure windows",
);
await page.screenshot({ path: `${out}/desktop-5k-noon.png`, fullPage: true });
results.screenshots.push("desktop-5k-noon.png");
await page.locator('[data-date="2026-10-11"]').click();
await page.locator("#time-input").fill("21:00");
assert.ok((await page.locator(".closure.closed.setup").count()) > 0);
results.checks.push("Sunday 21:00 still has cross-day closures");
await page.locator("#road-search").fill("Balbo");
await page.locator('[data-name="Balbo"]').click();
assert.match(
  await page.locator("#detail").textContent(),
  /10\/1[26]|10月1[26]/,
);
await page.screenshot({
  path: `${out}/desktop-late-closure-detail.png`,
  fullPage: true,
});
results.screenshots.push("desktop-late-closure-detail.png");
await page.locator("#close-detail").click();
await page.locator("#reset-map").click();
const vb = await page.locator("#map").getAttribute("viewBox");
await page.locator("#zoom-in").click();
assert.notEqual(await page.locator("#map").getAttribute("viewBox"), vb);
const mapBox = await page.locator("#map").boundingBox();
await page.mouse.move(
  mapBox.x + mapBox.width / 2,
  mapBox.y + mapBox.height / 2,
);
await page.mouse.down();
await page.mouse.move(
  mapBox.x + mapBox.width / 2 + 90,
  mapBox.y + mapBox.height / 2 + 40,
  { steps: 10 },
);
await page.mouse.up();
assert.notEqual(await page.locator("#map").getAttribute("viewBox"), vb);
await page.locator("#reset-map").click();
assert.equal(await page.locator("#map").getAttribute("viewBox"), vb);
results.checks.push("Zoom, drag, and show-entire-map reset work");
await page.locator("#lower-layer").check();
assert.ok(await page.locator("#map.show-lower").count());
results.checks.push("Separate lower-road layer can be enabled");
await page.locator("#time-input").fill("17:45");
const shared = page.url();
await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("#time-input").inputValue(), "17:45");
assert.ok(shared.includes("date=2026-10-11"));
results.checks.push("Shareable date/time URL survives reload");
await page.locator("#time-slider").focus();
await page.keyboard.press("Home");
assert.equal(await page.locator("#time-input").inputValue(), "00:00");
await page.keyboard.press("End");
assert.equal(await page.locator("#time-input").inputValue(), "23:59");
results.checks.push("Keyboard slider works at midnight and last minute");
await page.locator("#road-search").fill("unlikely-no-road-zz");
assert.match(await page.locator("#road-list").textContent(), /没有匹配/);
results.checks.push("Empty search state works");
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
results.checks.push("Desktop has no horizontal overflow");
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  timezoneId: "America/Los_Angeles",
});
const mp = await mobile.newPage();
mp.on("pageerror", (e) => results.errors.push("mobile: " + e.message));
await mp.goto(base, { waitUntil: "networkidle" });
await mp.locator("[data-closure]").first().waitFor();
assert.equal(
  await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await mp.screenshot({ path: `${out}/mobile-overview.png`, fullPage: true });
results.screenshots.push("mobile-overview.png");
await mp.locator('[data-date="2026-10-10"]').tap();
await mp.locator("#time-input").fill("06:30");
await mp.locator("#road-search").fill("Wacker");
await mp.locator('[data-name="Wacker"]').tap();
assert.match(await mp.locator("#detail").textContent(), /Wacker/);
await mp.locator("#map-stage").scrollIntoViewIfNeeded();
await mp.screenshot({
  path: `${out}/mobile-wacker-detail.png`,
  fullPage: true,
});
results.screenshots.push("mobile-wacker-detail.png");
await mp.locator("#close-detail").tap();
await mp.locator("#reset-map").tap();
await mp.locator("#map-stage").scrollIntoViewIfNeeded();
const mobileView = await mp.locator("#map").getAttribute("viewBox");
const box = await mp.locator("#map").boundingBox();
const cdp = await mobile.newCDPSession(mp);
const tx = box.x + box.width / 2,
  ty = Math.max(100, box.y + 230);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: tx - 30, y: ty, id: 1 },
    { x: tx + 30, y: ty, id: 2 },
  ],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [
    { x: tx - 65, y: ty, id: 1 },
    { x: tx + 65, y: ty, id: 2 },
  ],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
assert.notEqual(await mp.locator("#map").getAttribute("viewBox"), mobileView);
results.checks.push("Real two-finger touch input zooms the mobile map");
results.checks.push(
  "390px touch viewport: date/time, search, street detail, no horizontal overflow",
);
const externals = results.requests.filter(
  (u) => !u.startsWith(base) && !u.startsWith("data:"),
);
assert.deepEqual(externals, []);
results.checks.push(
  "Application makes zero external network requests, including map APIs",
);
assert.deepEqual(results.errors, []);
await writeFile(
  `${out}/browser-results.json`,
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    {
      checks: results.checks,
      errors: results.errors,
      screenshots: results.screenshots,
    },
    null,
    2,
  ),
);
await browser.close();
