# 芝加哥赛事封路地图 · 2026

中文、移动端可用的市中心道路查询图，覆盖 **2026 年 10 月 10 日 Chicago 5K** 和 **10 月 11 日 Chicago Marathon**，同时保留赛前至赛后的 Grant Park 准备 / 撤场封路。

浏览器只加载本站静态文件。地图采用 OpenStreetMap 实际经纬度，自绘 SVG，无地图 SDK、地图瓦片、运行时地图 API、外部字体、用户定位或密钥。

正式网址：**https://road-closure.catseye.today/chicago/marathon2026**（无尾斜杠）。原 https://road-closure-interactive.pystashell.workers.dev 入口继续可用。

`vite.config.js` 设定资源基路径 `/chicago/marathon2026/`，构建后将完整静态资源复制到对应目录，并保留原根目录入口。Cloudflare Custom Domain 仅绑定 `road-closure.catseye.today`；`assets.html_handling = "drop-trailing-slash"` 使指定路径直接返回页面，尾斜杠版本规范化到无尾斜杠。没有修改父域或其他主机的内容，也不需要运行时 Worker 路径重写。

HTML 响应设置 `Cache-Control: public, max-age=0, must-revalidate, no-transform`，按 [Cloudflare 官方说明](https://developers.cloudflare.com/web-analytics/get-started/) 防止区域级 Web Analytics 自动注入外部脚本；无需修改其他网站的统计设置。数据文件仍缓存一小时。`scripts/check-deployment.mjs` 核验准确路径、响应头、资源 SHA-256、构建提交与尾斜杠跳转。

## 使用与开发

需要 Node.js 22.12+（本项目验证于 Node.js 24）。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
npm run deploy
```

`wrangler.jsonc` 将 `dist/` 作为 Cloudflare Workers 静态资源发布；没有服务器函数或数据库。`wrangler` 使用本机官方 CLI 的既有授权，不需要在源代码中放入凭据。用户已授权提交到 `pystashell/road-closure-interactive` 并直接发布其 Cloudflare。

生产构建生成 `/build.json`，记录完整 Git commit、构建 UTC 时间和资料核验日期。正式发布应在提交后执行 `npm run build` 再 `npm run deploy`。

## 交互

- 切换 10/10、10/11；分钟级时间输入、滑块、常用时刻与前后 15 分钟。
- 所有时间固定 `America/Chicago`。这两日为 CDT / UTC−05:00，独立于访问者设备时区。
- 地图拖动、鼠标滚轮 / 双指缩放、缩放按钮、复位；键盘 `+` / `-` 和方向键可操作地图。
- 点击路段查看当段所有官方记录、预计恢复、来源链接和不确定性；也可通过搜索 / 列表访问详情。
- 以同名道路统计，不把重叠通知计成不同街道。列表的“最早预计”表示该道路所有当前封闭片段中最早的计划恢复，其他片段可能更晚。
- 日期 / 时间写入可分享 URL；下层道路参考独立开关。

## 数据与地理

封路事实来自赛事官方 **2026** 详细表和手册，核验于 **2026-10-03**。共 67 条原始时段：Grant Park 15 条、5K 11 条、马拉松 41 条。地图内匹配 50 条；地图外的 17 条马拉松记录仍保留在下载数据中，不把整场路线压缩成错误的市中心示意图。

原始事实、来源和差异：`data/rules.js`。处理后的公开下载：`public/data/closures.json`、`public/data/geography.json`。几何映射覆盖清单：`data/geometry-coverage.json`。

地理范围为经度 −87.670 至 −87.601、纬度 41.850 至 41.912，包含 Loop、South Loop、West Loop、North Loop、River North、湖滨与 Millennium Park；约北至 North Avenue、南至 Cermak、西至 Ashland。社区文字为位置参考，不是行政边界。

路网与公园 / 河流 / 湖岸来源 **© OpenStreetMap contributors**，快照 2026-10-03。经纬度按市中心纬度作等距近似投影，两轴使用同一距离尺度。5482 个街道片段保留原 OSM way ID。路网沿交叉街边界切分，然后逐片段关联全部通知；Lower Wacker、下层 Columbus 与上层分离。普通桥下路段（例如 Grand 穿过 Michigan 下方）仍保留正常路线。

湖岸通过 OSM Lake Michigan relation 的本地 member ways 拼接，沿真实岸线、在视图东侧之外封闭多边形后裁切，不手画岸线。小地标点与文字是地图参考标注；起终点本身的路段端点属于赛事地标近似位置，已在详情说明；其重叠 Grant Park 封路按精确交叉街范围覆盖。

ODbL 归属与下载说明见 [NOTICE.md](NOTICE.md)。地理数据可通过站内下载链接获取，并保留 OSM ID；构建无需重新访问数据提供方。

若需要更新地理（仅开发时联网）：

```sh
node scripts/fetch-geography.mjs
node scripts/fetch-lake.mjs
node scripts/build-geography.mjs
npm test
```

`data/raw/` 不提交。公开 Overpass 服务可能限流；已经打包的地理文件足以构建和运行，普通访问不会向 Overpass 发请求。

## 状态定义与重要限制

`src/model.js` 使用 `[计划开始, 预计结束)` 区间。所有重叠及相接时段取并集：5K 或赛道条目结束不能清除还在生效的 Grant Park 条目。

四种状态是“计划封闭中”“尚未到封闭时间”“已过预计恢复时间”“未收录赛事封路”。后两者都不表示确认通行。警方决定实际封路与滚动开放，支路和路口也可能临时受限。未实现驾车路线、转向、交叉口穿越或车库入口可达性判断。

**官方资料自身存在差异，已显著记录：**

- 5K Harrison 网页范围为 State–Franklin；官方 2026 PDF 的文字和路线图为 Michigan–Franklin。本图谨慎采用较宽范围并在详情说明。
- Loop 09:00 开放概述与详细分段表冲突；Michigan 在 11th 以北可用的概述与 Grant Park Madison–Roosevelt 封路冲突；优先详细封路表。
- 16:00 的赛事概述不能覆盖详细表中的 16:30 / 18:00 与更晚跨日封路。
- Columbus 终点段和 Roosevelt 的准备封路比赛道表开始更早；采用并集。

各比赛日 01:00 开始的禁停 / 拖车限制不参与道路颜色。行人开放时间不参与机动车颜色。Lower Wacker 下层主路和出口匝道不是同一状态；5K 的 Randolph / Harrison 南向出口封闭未逐匝道着色，页面明确提示需核实。Clark 临时双向安排在说明中单独提示，不作为道路封闭。

这是非官方静态信息整理工具，不提供实时保证。没有收录全市施工、事故或其他赛事以外的管制；行前应再次查官方来源并服从警察现场指挥。

## 验证

- `npm test`：全部 67 记录的每个开始 / 结束边界、跨日并集、停车排除、芝加哥时间、OSM 来源与范围、上下层、方向、实际 Harrison 偏移、Grand / Loomis 桥下路线、Michigan 与 Columbus 不同路段的晚间状态。
- `npm run test:browser`：本机 Chromium，1440px 桌面与 390px 触摸视口，访客时区分别设为上海和洛杉矶；检查日期时间、搜索、来源差异、缩放拖动、深链接、键盘滑块、横向溢出、零外部请求与运行错误，并保存截图。
- 浏览器脚本在 Windows 上使用已安装于 `%LOCALAPPDATA%/ms-playwright` 的 headless Chromium。`TEST_URL` 可指定公开部署地址；其他系统可调整脚本的 Chromium 路径或使用 Playwright 标准安装。
- 截图和运行结果位于本机 `artifacts/`（不提交）。

官方来源：

- [Chicago 5K 封路网页](https://www.chicago5k.com/event-information/street-closure-notification/)
- [Chicago 5K 2026 手册](https://assets-chicago5k-com.s3.amazonaws.com/wp-content/uploads/2026/09/26-AC5K-STREET-CLOSURE-BROCHURE.pdf)
- [Chicago Marathon 详细封路表](https://www.chicagomarathon.com/event-info/participant-information/course/street-closures/)
- [马拉松 2026 手册](https://cdn.chicagomarathon.com/app/uploads/2026/08/31160104/26-BACM-STREET-CLOSURE-BROCHURE.pdf)
- [Grant Park 封路表](https://cdn.chicagomarathon.com/app/uploads/2026/08/31160103/26-BACM-GRANT-PARK-STREET-CLOSURE.pdf)
- [Grant Park 起终点地图](https://cdn.chicagomarathon.com/app/uploads/2026/09/22133648/26-BACM-GRANT-PARK-SITE-MAP-9.22.26.pdf)
