import test from "node:test";
import assert from "node:assert/strict";
import { rules } from "../data/rules.js";
import {
  chicagoInstant,
  clock,
  formatInstant,
  ruleState,
  segmentState,
} from "../src/model.js";
const get = (id) => rules.find((r) => r.id === id);
test("67 official records have unique IDs and explicit CDT intervals", () => {
  assert.equal(rules.length, 67);
  assert.equal(new Set(rules.map((r) => r.id)).size, 67);
  for (const r of rules) {
    assert.match(r.start, /-05:00$/);
    assert.match(r.anticipatedEnd, /-05:00$/);
    assert.ok(Date.parse(r.start) < Date.parse(r.anticipatedEnd));
    assert.ok(r.sources.length);
  }
});
test("every interval obeys exact inclusive start / exclusive anticipated end", () => {
  for (const r of rules) {
    const start = Date.parse(r.start),
      end = Date.parse(r.anticipatedEnd);
    assert.equal(ruleState(r, start - 1), "future", r.id);
    assert.equal(ruleState(r, start), "closed", r.id);
    assert.equal(ruleState(r, end - 1), "closed", r.id);
    assert.equal(ruleState(r, end), "elapsed", r.id);
  }
});
test("Chicago 00:00 / 23:59 and formatting are independent of the device timezone", () => {
  assert.equal(
    new Date(chicagoInstant("2026-10-10", 0)).toISOString(),
    "2026-10-10T05:00:00.000Z",
  );
  assert.equal(
    new Date(chicagoInstant("2026-10-11", 1439)).toISOString(),
    "2026-10-12T04:59:00.000Z",
  );
  assert.match(formatInstant(chicagoInstant("2026-10-11", 450)), /07:30/);
  assert.equal(clock(1439), "23:59");
  assert.throws(() => chicagoInstant("2026-10-12", 0));
  assert.throws(() => chicagoInstant("2026-10-10", 1440));
});
test("5K 01:00 parking is never treated as race road closure", () => {
  const instant = chicagoInstant("2026-10-10", 60);
  assert.equal(
    rules.filter(
      (r) => r.event === "Chicago 5K" && ruleState(r, instant) === "closed",
    ).length,
    0,
  );
  assert.equal(
    segmentState(
      [
        {
          kind: "parking",
          start: "2026-10-10T01:00:00-05:00",
          anticipatedEnd: "2026-10-10T23:00:00-05:00",
        },
      ],
      instant,
    ).status,
    "unlisted",
  );
});
test("Grant Park has 11 active notices at 5K noon and 8 at marathon 19:00", () => {
  for (const [d, m, count] of [
    ["2026-10-10", 720, 11],
    ["2026-10-11", 1140, 8],
  ])
    assert.equal(
      rules.filter(
        (r) =>
          r.kind === "setup" && ruleState(r, chicagoInstant(d, m)) === "closed",
      ).length,
      count,
    );
});
test("an expired 5K interval cannot clear ongoing Grant Park closure", () => {
  const state = segmentState(
    [get("grant-08"), get("5k-01")],
    chicagoInstant("2026-10-10", 570),
  );
  assert.equal(state.status, "closed");
  assert.equal(state.end, Date.parse("2026-10-11T20:00:00-05:00"));
});
test("overlapping Columbus setup/course intervals start at the earlier official time", () => {
  const state = segmentState(
    [get("grant-05"), get("marathon-41")],
    Date.parse("2026-10-08T05:00:00-05:00"),
  );
  assert.equal(state.status, "closed");
  assert.equal(state.end, Date.parse("2026-10-12T15:00:00-05:00"));
});
test("Roosevelt setup starts at 04:00, preceding the 06:00 course entry", () => {
  assert.equal(
    segmentState(
      [get("grant-14"), get("marathon-40")],
      chicagoInstant("2026-10-11", 240),
    ).status,
    "closed",
  );
});
test("after 11 Oct 21:00 three named streets still have Grant Park closures", () => {
  const remaining = rules.filter(
    (r) =>
      r.kind === "setup" &&
      ruleState(r, chicagoInstant("2026-10-11", 1260)) === "closed",
  );
  assert.deepEqual([...new Set(remaining.map((r) => r.road))].sort(), [
    "Balbo Dr",
    "Columbus Dr",
    "Jackson Dr",
  ]);
});
test("expired estimates and missing data never become a confirmed open status", () => {
  assert.equal(
    segmentState([get("5k-10")], chicagoInstant("2026-10-10", 660)).status,
    "elapsed",
  );
  assert.equal(
    segmentState([], chicagoInstant("2026-10-10", 660)).status,
    "unlisted",
  );
});
test("a connected future interval extends the anticipated closure end", () => {
  const a = {
    kind: "race",
    start: "2026-10-10T06:00:00-05:00",
    anticipatedEnd: "2026-10-10T08:00:00-05:00",
  };
  const b = {
    ...a,
    start: "2026-10-10T08:00:00-05:00",
    anticipatedEnd: "2026-10-10T10:00:00-05:00",
  };
  assert.equal(
    segmentState([a, b], chicagoInstant("2026-10-10", 420)).end,
    Date.parse(b.anticipatedEnd),
  );
});
