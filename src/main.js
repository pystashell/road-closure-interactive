import "./style.css";
import { rules, sources, conflicts, checkedAt } from "../data/rules.js";
import {
  chicagoInstant,
  clock,
  formatInstant,
  segmentState,
  ruleState,
  STATUS_LABEL,
} from "./model.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name) =>
  ({
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    share: '<path d="M8 12V6h11v14H5v-5m3-9 4-4m-4 4L4 2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    target:
      '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  })[name] || "";
const svgIcon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icon(name)}</svg>`;
const params = new URLSearchParams(location.search);
let day = params.get("date") === "2026-10-10" ? "2026-10-10" : "2026-10-11";
let minute = /^([01]\d|2[0-3]):[0-5]\d$/.test(params.get("time") || "")
  ? params
      .get("time")
      .split(":")
      .reduce((h, m) => +h * 60 + +m)
  : 450;
let query = "",
  filter = "all",
  selected = null,
  showLower = false,
  states = new Map(),
  geo,
  roads,
  ruleMap = new Map(rules.map((r) => [r.id, r]));
let view = { x: 0, y: 0, w: 1100, h: 1330 },
  initialView;
const directionLabel = (d) =>
  d === "southbound"
    ? "南向（含西向弯道）"
    : d === "northbound"
      ? "北向（含东向弯道）"
      : "双向 / 官方未细分";
$("#app").innerHTML = `
<header class="site-header"><a class="brand" href="/" aria-label="芝加哥出行图首页"><span class="brand-mark">${svgIcon("map")}</span><span>芝加哥<span class="brand-light"> / 出行图</span></span></a><nav><a href="#sources">资料与说明 ${svgIcon("arrow")}</a><span class="edition">2026 · RACE WEEKEND</span></nav></header>
<main><section class="intro"><div><div class="eyebrow"><span class="tiny-dot"></span> CHICAGO, ILLINOIS · 10.10—10.11</div><h1>芝加哥赛事封路地图<span class="title-dot">。</span></h1><p>选一个时间，查看市中心哪些路段计划封闭、何时预计恢复。</p></div><div class="intro-note"><span>真实路网 · 随站点打包</span><strong>出行前，再核实现场情况 ${svgIcon("arrow")}</strong></div></section>
<div class="notice" role="note">${svgIcon("info")}<p><strong>这是官方计划，不是实时路况。</strong>警方控制封路与滚动开放；预计时间可能调整。未标注封路、或已过预计恢复时间，均不保证可通行。</p></div>
<section class="workspace" aria-label="封路时间查询与地图">
<aside class="sidebar"><section class="time-controls"><div class="section-kicker"><span>01 / 选择时间</span><span class="timezone">芝加哥 CDT · UTC−5</span></div>
<div class="date-tabs" role="group" aria-label="赛事日期"><button data-date="2026-10-10"><span>10 月 10 日 <small>周六</small></span><strong>Chicago 5K</strong></button><button data-date="2026-10-11"><span>10 月 11 日 <small>周日</small></span><strong>Chicago Marathon</strong></button></div>
<div class="time-display"><div><label for="time-input">当地具体时间</label><input id="time-input" type="time" step="60" value="07:30" aria-describedby="time-help"></div><span class="day-period" id="day-period">上午</span></div><p class="sr-only" id="time-help">所有时间固定使用美国芝加哥当地时间，不随您设备的时区变化。</p>
<input id="time-slider" type="range" min="0" max="1439" step="1" value="450" aria-label="芝加哥时间滑块"><div class="range-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span></div>
<div class="presets" role="group" aria-label="常用时间">${[300, 450, 600, 810, 1080].map((m) => `<button data-minute="${m}">${clock(m)}</button>`).join("")}</div>
<div class="time-step"><button id="previous-time" aria-label="提前15分钟">← 15 分钟</button><span id="event-note">马拉松赛事日</span><button id="next-time" aria-label="推后15分钟">15 分钟 →</button></div></section>
<section class="road-browser"><div class="list-heading"><div><span class="section-kicker">02 / 查找道路</span><h2 id="road-count">载入路网中</h2></div><span class="count-symbol">↗</span></div>
<label class="search-box">${svgIcon("search")}<input type="search" id="road-search" placeholder="搜索街名，如 Michigan" aria-label="搜索道路街名"></label>
<div class="filter-tabs" role="group" aria-label="道路筛选"><button data-filter="all" class="active">全部记录</button><button data-filter="closed">封闭中</button><button data-filter="setup">跨日 / 准备</button></div><p class="list-meta" id="list-meta"></p><div id="road-list" class="road-list" aria-label="道路查询结果"></div></section></aside>
<section class="map-panel" aria-label="可缩放拖动的芝加哥地图"><div class="map-topbar"><span><i class="live-dot"></i><strong id="map-time"></strong><span class="map-subtitle">的计划状态</span></span><button id="share-button" class="share-button">${svgIcon("share")}<span>分享此时间</span></button></div>
<div id="map-stage"><svg id="map" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="芝加哥市中心真实地理路网。可点击道路查看封路；也可用左侧搜索与列表访问详情。" tabindex="0"></svg><div class="map-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 20 30"><path d="M10 2 17 24 10 19 3 24Z" fill="currentColor"/></svg></div><div class="map-tools"><button id="zoom-in" aria-label="放大地图">+</button><button id="zoom-out" aria-label="缩小地图">−</button><button id="reset-map" aria-label="显示全部地图">${svgIcon("target")}</button></div>
<div class="map-hint">拖动地图 · 双指缩放 · 点击路段</div><div class="scale"><span id="scale-bar"></span><small id="scale-label">500 米</small></div><div class="map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · ODbL</div>
<section id="detail" class="detail-card" aria-label="路段详情" hidden></section></div>
<div class="map-legend"><span><i class="legend-line race"></i>赛事计划封闭</span><span><i class="legend-line setup"></i>准备 / 撤场封闭</span><span><i class="legend-line future"></i>尚未到时间</span><span><i class="legend-line elapsed"></i>已过预计恢复</span><span><i class="legend-line unlisted"></i>未收录封路</span></div><div class="map-bottom"><label><input type="checkbox" id="lower-layer">显示下层道路参考</label><span>上下层不互相代表 · 不提供驾车路线</span></div></section></section>
<section id="sources" class="source-section"><div class="source-title"><div class="eyebrow">READ BEFORE YOU GO</div><h2>读图之前，先了解这些。</h2><p>资料核验：<time>${checkedAt}</time><br>封路数据为官方预告的静态快照。</p></div><div class="source-content"><div class="guidance-grid"><article><span class="note-number">01</span><h3>恢复时间是预计值</h3><p>封闭按开始时间计入，预计结束后改为虚线。它表示计划窗口已过；实际开放由警察根据末位跑者和现场情况决定。</p></article><article><span class="note-number">02</span><h3>不只看当日赛事</h3><p>Grant Park 准备封路跨越赛前、赛后。10 日 5K 结束，或 11 日马拉松经过后，部分道路仍会继续封闭。</p></article><article><span class="note-number">03</span><h3>停车与道路分开看</h3><p>官方列出的赛事沿线禁停从各自比赛日 01:00 开始，可能拖车；这不等于道路从 01:00 起封闭。请查看现场禁停牌。</p></article><article><span class="note-number">04</span><h3>上下层与行人不同</h3><p>上层 Wacker 的颜色不适用于 Lower Wacker。5K 通告称下层主路可用，但南向 Randolph / Harrison 出口匝道关闭；匝道未单独着色，时间和现场通行需再核实。</p></article></div>
<details><summary>查看资料差异与地图范围<span>＋</span></summary><div class="details-body">${conflicts.map((c) => `<p>${esc(c)}</p>`).join("")}<p>地图覆盖 Loop、South Loop、West Loop、North Loop、River North 与湖滨 / 千禧公园；北至 North Avenue 附近、南至 Cermak 附近、西至 Ashland。赛道超出范围的部分不在本图中。所有 67 条原始时段仍可下载核验。</p><p>地图采用 OSM 实际坐标投影，自绘 SVG，路网按官方交叉街范围匹配并切分。地图不判断转向、路口穿越、车库入口或沿途实际通行；上层赛道与下层道路分开处理。小范围匝道与临时警戒可能未收录。</p><p>11 日 Clark 的 Lake–Adams 段约 06:00–12:00 有临时双向交通安排。此为交通组织调整，不是道路封闭，故不涂封路色。Monroe 湖滨行人通道与机动车道路有不同恢复时间；本图颜色仅表示机动车封路。</p><p>社区名称仅为位置参考，不表示行政边界。本图是非官方信息整理工具，不能代替现场指挥。</p></div></details>
<details><summary>官方来源与数据下载<span>＋</span></summary><div class="details-body source-links">${Object.values(
  sources,
)
  .map(
    (s) =>
      `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`,
  )
  .join(
    "",
  )}<a href="/data/closures.json" download>下载封路记录 JSON ↓</a><a href="/data/geography.json" download>下载离线地理数据（ODbL） ↓</a><p id="geo-snapshot"></p><p>地理数据 © OpenStreetMap contributors，依据 <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL 1.0</a> 提供。下载文件中的每段道路包含原 OSM way ID；转换脚本公开于项目仓库。</p></div></details></div></section>
</main><footer><span>CHICAGO / RACE WEEKEND 2026</span><span>离线路网 · 无地图 API · <a href="https://github.com/pystashell/road-closure-interactive" target="_blank" rel="noopener">项目与数据说明 ↗</a></span></footer><div id="toast" role="status"></div>`;
function setTime(d, m) {
  day = d;
  minute = Math.max(0, Math.min(1439, m));
  update();
  const u = new URL(location.href);
  u.searchParams.set("date", day);
  u.searchParams.set("time", clock(minute));
  history.replaceState(null, "", u);
}
document
  .querySelectorAll("[data-date]")
  .forEach((b) =>
    b.addEventListener("click", () => setTime(b.dataset.date, minute)),
  );
document
  .querySelectorAll("[data-minute]")
  .forEach((b) =>
    b.addEventListener("click", () => setTime(day, +b.dataset.minute)),
  );
$("#time-slider").addEventListener("input", (e) =>
  setTime(day, +e.target.value),
);
$("#time-input").addEventListener("input", (e) => {
  if (e.target.validity.valid && e.target.value) {
    const [h, m] = e.target.value.split(":").map(Number);
    setTime(day, h * 60 + m);
  }
});
$("#previous-time").onclick = () => setTime(day, minute - 15);
$("#next-time").onclick = () => setTime(day, minute + 15);
$("#road-search").addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  renderList();
});
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((c) => c.classList.toggle("active", c === b));
      renderList();
    }),
);
$("#share-button").onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("已复制当前日期与时间的链接");
  } catch {
    toast("当前时间已保存在地址栏，可直接复制网址");
  }
};
$("#lower-layer").onchange = (e) => {
  showLower = e.target.checked;
  $("#map").classList.toggle("show-lower", showLower);
};
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 3200);
}
function project([lon, lat]) {
  const [w, s, e, n] = geo.bounds;
  return [
    ((lon - w) * 1100) / (e - w),
    ((n - lat) * 1100) / (e - w) / Math.cos((41.881 * Math.PI) / 180),
  ];
}
const path = (points) =>
  points
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${project(p)
          .map((v) => v.toFixed(2))
          .join(" ")}`,
    )
    .join("");
const textAt = (lon, lat, text, cls, rotate = 0, anchor = "middle") => {
  const [x, y] = project([lon, lat]);
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}" ${rotate ? `transform="rotate(${rotate} ${x} ${y})"` : ""}>${esc(text)}</text>`;
};
function renderMap() {
  const h = project([geo.bounds[2], geo.bounds[1]])[1];
  view = { x: 0, y: 0, w: 1100, h };
  initialView = { ...view };
  const labels = [
    [-87.655, 41.8837, "WEST LOOP", "neighborhood"],
    [-87.655, 41.8823, "西环区", "neighborhood-cn"],
    [-87.6297, 41.88, "LOOP", "neighborhood"],
    [-87.6297, 41.8789, "环区", "neighborhood-cn"],
    [-87.63, 41.86, "SOUTH LOOP", "neighborhood"],
    [-87.63, 41.8587, "南环区", "neighborhood-cn"],
    [-87.631, 41.8856, "NORTH LOOP", "neighborhood-small"],
    [-87.634, 41.8967, "RIVER NORTH", "neighborhood"],
    [-87.634, 41.8954, "河北区", "neighborhood-cn"],
    [-87.6075, 41.875, "密歇根湖", "lake-label", -90],
    [-87.619, 41.882, "MILLENNIUM PARK", "park-label", -90],
    [-87.618, 41.876, "GRANT PARK", "park-label", -90],
    [-87.6375, 41.8891, "CHICAGO RIVER", "river-label", -35],
  ];
  const streets = [
    [-87.656, 41.8848, "Randolph St", 0],
    [-87.655, 41.882, "Madison St", 0],
    [-87.655, 41.8797, "Adams St", 0],
    [-87.655, 41.8778, "Jackson Blvd", 0],
    [-87.656, 41.8744, "Harrison St", 0],
    [-87.65, 41.8672, "Roosevelt Rd", 0],
    [-87.653, 41.8573, "18th St", 0],
    [-87.656, 41.8514, "Cermak Rd", 0],
    [-87.655, 41.8692, "Taylor St", 0],
    [-87.654, 41.8909, "Grand Ave", 0],
    [-87.646, 41.9099, "North Ave", 0],
    [-87.641, 41.9037, "Division St", 0],
    [-87.642, 41.8968, "Chicago Ave", 0],
    [-87.641, 41.8931, "Ontario St", 0],
    [-87.6219, 41.8895, "Grand Ave", 0],
    [-87.618, 41.8726, "Balbo Dr", 0],
    [-87.618, 41.8786, "Jackson Dr", 0],
    [-87.626, 41.8759, "Ida B. Wells Dr", 0],
    [-87.647, 41.8798, "Halsted St", -90],
    [-87.6412, 41.8819, "Canal St", -90],
    [-87.6366, 41.8836, "Wacker Dr · 上层", -90],
    [-87.6331, 41.8827, "LaSalle St", -90],
    [-87.6294, 41.8828, "Dearborn St", -90],
    [-87.6273, 41.8979, "State St", -90],
    [-87.624, 41.8949, "Michigan Ave", -90],
    [-87.624, 41.8638, "Michigan Ave", -90],
    [-87.6206, 41.8855, "Columbus Dr", -90],
    [-87.6334, 41.9022, "Wells St", -90],
    [-87.6655, 41.8966, "Ashland Ave", -90],
  ];
  const landmarks = [
    [-87.6359, 41.87888, "Willis Tower", "威利斯大厦", -1, 32],
    [-87.64035, 41.87865, "Union Station", "联合车站", -1, -12],
    [-87.6233, 41.88266, "Cloud Gate", "云门 / 千禧公园", 1, -14],
    [-87.6237, 41.8796, "Art Institute", "艺术博物馆", 1, 4],
    [-87.61899, 41.87582, "Buckingham Fountain", "白金汉喷泉", 1, 0],
    [-87.61698, 41.86626, "Field Museum", "菲尔德博物馆", 1, 0],
    [-87.6075, 41.8916, "Navy Pier", "海军码头", -1, 0],
  ];
  $("#map").innerHTML =
    `<defs><pattern id="lake-pattern" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 13h6" stroke="#a9caca" stroke-width=".7"/></pattern></defs><rect x="-2000" y="-2000" width="6000" height="6000" fill="#f1f0e9"/><g class="areas">${geo.areas.map((a) => `<path class="area ${a.kind}" d="${a.rings.map((r) => path(r) + "Z").join("")}" fill-rule="evenodd"/>`).join("")}</g><g class="streets">${geo.segments.map((s) => `<path data-road="${s.id}" d="${path(s.points)}" class="road ${s.lower ? "lower" : ""} ${s.highway.includes("motorway") ? "motorway" : ""}"/>`).join("")}</g><g id="closure-lines">${geo.segments
      .filter((s) => s.ruleIds.length)
      .map(
        (s) =>
          `<path data-closure="${s.id}" d="${path(s.points)}" class="closure"/>`,
      )
      .join(
        "",
      )}</g><g class="labels">${labels.map((a) => textAt(...a)).join("")}${streets.map(([x, y, t, r]) => textAt(x, y, t, "street-label", r)).join("")}${landmarks
      .map(([lon, lat, en, cn, side, dy]) => {
        const [x, y] = project([lon, lat]);
        return `<g class="landmark"><circle cx="${x}" cy="${y}" r="4"/><text x="${x + side * 10}" y="${y + (dy || 0) - 4}" text-anchor="${side < 0 ? "end" : "start"}">${cn}</text><text class="landmark-en" x="${x + side * 10}" y="${y + (dy || 0) + 11}" text-anchor="${side < 0 ? "end" : "start"}">${en}</text></g>`;
      })
      .join(
        "",
      )}</g><g class="hits">${geo.segments.map((s) => `<path data-hit="${s.id}" class="hit ${s.lower ? "lower" : ""}" d="${path(s.points)}"/>`).join("")}</g><path id="selected-line" class="selected-line" d=""/>`;
  applyView();
}
function applyView() {
  $("#map").setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  const zoom = initialView.w / view.w;
  $("#map").classList.toggle("zoomed", zoom > 1.6);
  $("#zoom-in").disabled = zoom >= 7.95;
  $("#zoom-out").disabled = zoom <= 1.005;
  const rect = $("#map").getBoundingClientRect(),
    scale = Math.min(rect.width / view.w, rect.height / view.h),
    meters = zoom > 3 ? 100 : 500;
  const length =
    (((meters / (111320 * Math.cos((41.881 * Math.PI) / 180))) * 1100) /
      (geo.bounds[2] - geo.bounds[0])) *
    scale;
  $("#scale-bar").style.width = length + "px";
  $("#scale-label").textContent = meters + " 米";
}
function zoomBy(factor, point) {
  let w = Math.min(initialView.w, Math.max(initialView.w / 8, view.w / factor)),
    h = (w * initialView.h) / initialView.w;
  const p = point || [view.x + view.w / 2, view.y + view.h / 2];
  view = {
    x: p[0] - ((p[0] - view.x) * w) / view.w,
    y: p[1] - ((p[1] - view.y) * h) / view.h,
    w,
    h,
  };
  constrain();
  applyView();
}
function constrain() {
  view.x = Math.max(
    -view.w * 0.1,
    Math.min(initialView.w - view.w * 0.9, view.x),
  );
  view.y = Math.max(
    -view.h * 0.1,
    Math.min(initialView.h - view.h * 0.9, view.y),
  );
}
function screenPoint(x, y) {
  const p = $("#map").createSVGPoint();
  p.x = x;
  p.y = y;
  const q = p.matrixTransform($("#map").getScreenCTM().inverse());
  return [q.x, q.y];
}
const pointers = new Map();
let gesture = null,
  moved = false;
$("#map").addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $("#map").setPointerCapture(e.pointerId);
  moved = false;
  gesture = { view: { ...view }, points: [...pointers.values()] };
});
$("#map").addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const ps = [...pointers.values()];
  if (ps.length === 2 && gesture.points.length === 2) {
    const distance = (p) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    const delta = distance(ps) / distance(gesture.points);
    const mid = screenPoint((ps[0].x + ps[1].x) / 2, (ps[0].y + ps[1].y) / 2);
    zoomBy(delta, mid);
    gesture = { view: { ...view }, points: ps };
    moved = true;
  } else if (ps.length === 1) {
    const dx = ps[0].x - gesture.points[0].x,
      dy = ps[0].y - gesture.points[0].y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    const scale = $("#map").getScreenCTM().a;
    view.x = gesture.view.x - dx / scale;
    view.y = gesture.view.y - dy / scale;
    constrain();
    applyView();
  }
});
const endPointer = (e) => {
  if (!moved && e.type !== "pointercancel") {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target?.dataset.hit) selectRoad(target.dataset.hit);
  }
  pointers.delete(e.pointerId);
  gesture = pointers.size
    ? { view: { ...view }, points: [...pointers.values()] }
    : null;
};
$("#map").addEventListener("pointerup", endPointer);
$("#map").addEventListener("pointercancel", endPointer);
$("#map").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.16 : 1 / 1.16, screenPoint(e.clientX, e.clientY));
  },
  { passive: false },
);
$("#map").addEventListener("dblclick", (e) =>
  zoomBy(1.6, screenPoint(e.clientX, e.clientY)),
);
$("#map").addEventListener("keydown", (e) => {
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    zoomBy(1.3);
  } else if (e.key === "-") {
    e.preventDefault();
    zoomBy(1 / 1.3);
  } else if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    view.x +=
      e.key === "ArrowLeft"
        ? -view.w * 0.1
        : e.key === "ArrowRight"
          ? view.w * 0.1
          : 0;
    view.y +=
      e.key === "ArrowUp"
        ? -view.h * 0.1
        : e.key === "ArrowDown"
          ? view.h * 0.1
          : 0;
    constrain();
    applyView();
  } else if (e.key === "Escape") {
    selected = null;
    renderDetail();
  }
});
$("#zoom-in").onclick = () => zoomBy(1.4);
$("#zoom-out").onclick = () => zoomBy(1 / 1.4);
$("#reset-map").onclick = () => {
  view = { ...initialView };
  applyView();
};
window.addEventListener("resize", () => geo && applyView());
function update() {
  const instant = chicagoInstant(day, minute);
  $("#time-input").value = clock(minute);
  $("#time-slider").value = minute;
  $("#time-slider").setAttribute(
    "aria-valuetext",
    `${day} 芝加哥时间 ${clock(minute)}`,
  );
  $("#day-period").textContent =
    minute < 360
      ? "凌晨"
      : minute < 720
        ? "上午"
        : minute < 1080
          ? "下午"
          : "晚上";
  $("#map-time").textContent =
    `10 月 ${day.endsWith("10") ? "10" : "11"} 日 · ${clock(minute)}`;
  $("#event-note").textContent = day.endsWith("10")
    ? "5K + Grant Park 准备封路"
    : "马拉松 + Grant Park 封路";
  document.querySelectorAll("[data-date]").forEach((b) => {
    const a = b.dataset.date === day;
    b.classList.toggle("active", a);
    b.setAttribute("aria-pressed", a);
  });
  document
    .querySelectorAll("[data-minute]")
    .forEach((b) => b.classList.toggle("active", +b.dataset.minute === minute));
  if (!geo) return;
  states = new Map(
    geo.segments.map((s) => [
      s.id,
      segmentState(
        s.ruleIds.map((id) => ruleMap.get(id)),
        instant,
      ),
    ]),
  );
  document.querySelectorAll("[data-closure]").forEach((p) => {
    const s = states.get(p.dataset.closure);
    p.setAttribute("class", `closure ${s.status} ${s.category || ""}`);
  });
  const count = new Set(
    geo.segments
      .filter((s) => states.get(s.id).status === "closed")
      .map((s) => s.canonical),
  ).size;
  $("#road-count").innerHTML = `<strong>${count}</strong> 条道路有封路`;
  renderList();
  renderDetail();
}
function renderList() {
  if (!geo) return;
  let list = roads.filter(
    (r) =>
      (!query ||
        r.name.toLowerCase().includes(query) ||
        r.alias.includes(query)) &&
      (filter === "all" ||
        r.segments.some((s) => {
          const t = states.get(s.id);
          return (
            t.status === "closed" &&
            (filter !== "setup" || t.category === "setup")
          );
        })),
  );
  list.sort((a, b) => {
    const ac = a.segments.some((s) => states.get(s.id).status === "closed"),
      bc = b.segments.some((s) => states.get(s.id).status === "closed");
    return Number(bc) - Number(ac) || a.name.localeCompare(b.name);
  });
  $("#list-meta").textContent =
    `${list.length} 条道路${query ? "匹配搜索" : " · 同名路段合并统计"}。点击展开路段。`;
  $("#road-list").innerHTML = list.length
    ? list
        .map((r) => {
          const closed = r.segments.filter(
              (s) => states.get(s.id).status === "closed",
            ),
            active =
              closed[0] ||
              r.segments.find((s) => s.ruleIds.length) ||
              r.segments[0],
            state = states.get(active.id);
          return `<button class="road-row" data-select="${active.id}" data-name="${esc(r.name)}"><span class="status-dot ${state.status} ${state.category || ""}"></span><span><strong>${esc(r.name)}</strong><small>${closed.length ? "部分路段计划封闭" : STATUS_LABEL[state.status]}${state.status === "closed" ? ` · 最早预计 ${formatInstant(Math.min(...closed.map((s) => states.get(s.id).end)))}` : ""}</small></span><span class="row-arrow">↗</span></button>`;
        })
        .join("")
    : '<div class="empty">没有匹配的道路。试试英文街名，或切换“全部记录”。</div>';
  document.querySelectorAll("[data-select]").forEach(
    (b) =>
      (b.onclick = () => {
        selectRoad(b.dataset.select, true);
      }),
  );
}
function selectRoad(id, focus = false) {
  selected = geo.segments.find((s) => s.id === id);
  if (!selected) return;
  renderDetail();
  if (focus) {
    const p = project(selected.points[Math.floor(selected.points.length / 2)]);
    const w = initialView.w / 2.2;
    view = {
      x: p[0] - w / 2,
      y: p[1] - (w * initialView.h) / initialView.w / 2,
      w,
      h: (w * initialView.h) / initialView.w,
    };
    constrain();
    applyView();
    if (innerWidth < 850)
      $("#map-stage").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function renderDetail() {
  if (!geo || !selected) {
    $("#detail").hidden = true;
    const p = $("#selected-line");
    if (p) p.setAttribute("d", "");
    return;
  }
  const state = states.get(selected.id),
    rs = selected.ruleIds.map((id) => ruleMap.get(id)),
    instant = chicagoInstant(day, minute);
  const road = roads.find((r) => r.name === selected.canonical) || {
    segments: [selected],
  };
  const siblingRules = [
    ...new Set(road.segments.flatMap((s) => s.ruleIds)),
  ].map((id) => ruleMap.get(id));
  $("#selected-line").setAttribute("d", path(selected.points));
  $("#detail").hidden = false;
  $("#detail").innerHTML =
    `<div class="detail-top"><span class="detail-eyebrow">${selected.lower ? "下层道路参考" : "已选路段"} · ${esc(selected.oneway ? "单行路段（OSM）" : "方向以现场标志为准")}</span><button class="icon-button" id="close-detail" aria-label="关闭路段详情">${svgIcon("close")}</button></div><h2>${esc(selected.name)}</h2><div class="detail-status ${state.status} ${state.category || ""}">${STATUS_LABEL[state.status]}</div>
 ${state.status === "closed" ? `<p class="reopen">预计恢复 <strong>${formatInstant(state.end)}</strong></p><p class="detail-caution">同段所有生效记录合并计算；实际开放以现场警察指挥为准。</p>` : `<p class="detail-caution">${state.status === "elapsed" ? `此段最近的预计恢复时间为 ${formatInstant(state.end)}，尚未核实实际开放。` : state.status === "future" ? `下一次计划封闭：${formatInstant(state.next.start)}。此前也不保证可通行。` : "本资料未列出此段赛事道路封闭，其他管制与通行情况未知。"}${selected.lower ? " 下层主路与出口匝道的状态不同，请核实出口。" : ""}</p>`}
 <div class="detail-records">${rs.length ? rs.map((r) => `<article class="record"><div><span class="record-tag ${r.kind}">${esc(r.event)}</span><span>${STATUS_LABEL[ruleState(r, instant)]}</span></div><h3>${esc(r.from)} → ${esc(r.to)}</h3><dl><dt>计划开始</dt><dd>${formatInstant(r.start)}</dd><dt>预计恢复</dt><dd>${formatInstant(r.anticipatedEnd)}</dd>${r.direction ? `<dt>限制方向</dt><dd>${directionLabel(r.direction)}</dd>` : ""}</dl>${r.note ? `<p class="record-note">${esc(r.note)}</p>` : ""}<div class="record-sources">${r.sources.map((id) => `<a href="${sources[id].url}" target="_blank" rel="noopener">${esc(id.includes("PDF") ? "官方 PDF" : "官方详细表")} ↗</a>`).join("")}</div></article>`).join("") : "<p>本图未收录该路段的具体赛事封路时段。</p>"}</div>
 ${siblingRules.length ? `<details class="other-segments"><summary>同一道路的其他范围（${siblingRules.length} 条记录）</summary>${siblingRules.map((r) => `<button data-rule="${r.id}"><strong>${esc(r.from)} → ${esc(r.to)}</strong><span>${esc(r.event)} · ${formatInstant(r.start)} — ${formatInstant(r.anticipatedEnd)}</span></button>`).join("")}</details>` : ""}`;
  $("#close-detail").onclick = () => {
    selected = null;
    renderDetail();
  };
  document.querySelectorAll("[data-rule]").forEach(
    (b) =>
      (b.onclick = () => {
        const s = road.segments.find((s) => s.ruleIds.includes(b.dataset.rule));
        selectRoad(s.id);
      }),
  );
}
try {
  const response = await fetch("/data/geography.json");
  if (!response.ok) throw new Error("地理数据载入失败");
  geo = await response.json();
  const aliases = {
    Michigan: "密歇根",
    Columbus: "哥伦布",
    Wacker: "瓦克",
    Dearborn: "迪尔伯恩",
    LaSalle: "拉萨尔",
    State: "州街",
    Harrison: "哈里森",
    Roosevelt: "罗斯福",
    Halsted: "霍尔斯特德",
    Jackson: "杰克逊",
  };
  const grouped = new Map();
  for (const s of geo.segments.filter((s) => !s.lower && s.canonical)) {
    if (!grouped.has(s.canonical)) grouped.set(s.canonical, []);
    grouped.get(s.canonical).push(s);
  }
  roads = [...grouped].map(([name, segments]) => ({
    name,
    segments,
    alias: aliases[name] || "",
  }));
  renderMap();
  update();
  $("#geo-snapshot").textContent =
    `OSM 地理快照：${geo.snapshot}；地理范围内 ${geo.segments.length.toLocaleString()} 个路网片段。`;
} catch (error) {
  $("#map-stage").innerHTML =
    '<div class="load-error"><h2>地图暂时未能载入</h2><p>请刷新重试，或查看下方官方封路来源。</p><button id="retry-load">重新载入</button></div>';
  $("#retry-load").onclick = () => location.reload();
  $("#road-count").textContent = "数据载入失败";
  console.error(error);
}
