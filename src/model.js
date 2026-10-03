export const TIMEZONE = "America/Chicago";
export const DATES = ["2026-10-10", "2026-10-11"];
export function chicagoInstant(day, minute) {
  if (
    !DATES.includes(day) ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 1439
  )
    throw new RangeError("Invalid Chicago date/time");
  return Date.parse(`${day}T${clock(minute)}:00-05:00`);
}
export function clock(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
export function formatInstant(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: TIMEZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
// Intervals are [start, anticipatedEnd). Past an estimate is never proof of an actual reopening.
export function ruleState(rule, instant) {
  if (instant < Date.parse(rule.start)) return "future";
  return instant < Date.parse(rule.anticipatedEnd) ? "closed" : "elapsed";
}
export function segmentState(rules, instant) {
  const motor = rules.filter(
    (r) => r.kind !== "parking" && r.kind !== "pedestrian",
  );
  const active = motor.filter((r) => ruleState(r, instant) === "closed");
  if (active.length) {
    // Extend through consecutive/overlapping intervals, including intervals starting later today.
    let end = Math.max(...active.map((r) => Date.parse(r.anticipatedEnd)));
    let previous;
    do {
      previous = end;
      for (const r of motor)
        if (Date.parse(r.start) <= end && Date.parse(r.anticipatedEnd) > end)
          end = Date.parse(r.anticipatedEnd);
    } while (previous !== end);
    return {
      status: "closed",
      active,
      end,
      category: active.some((r) => r.kind === "setup") ? "setup" : "race",
    };
  }
  const future = motor
    .filter((r) => ruleState(r, instant) === "future")
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const elapsed = motor.filter((r) => ruleState(r, instant) === "elapsed");
  if (elapsed.length)
    return {
      status: "elapsed",
      active: [],
      end: Math.max(...elapsed.map((r) => Date.parse(r.anticipatedEnd))),
      next: future[0],
    };
  if (future.length) return { status: "future", active: [], next: future[0] };
  return { status: "unlisted", active: [] };
}
export const STATUS_LABEL = {
  closed: "计划封闭中",
  future: "尚未到封闭时间",
  elapsed: "已过预计恢复时间",
  unlisted: "未收录赛事封路",
};
