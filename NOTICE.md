# 地理数据归属

`public/data/geography.json` 包含由 OpenStreetMap 数据裁切、筛选、投影前预处理并关联赛事通知后的路网与地理区域。

**© OpenStreetMap contributors**。原始地理数据库依据 [Open Database License 1.0 (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/) 提供。本项目打包的地理衍生数据库同样依据 ODbL 1.0 提供。

- 归属说明：[OpenStreetMap copyright](https://www.openstreetmap.org/copyright)
- 几何下载：网站 `/data/geography.json`，或本仓库的同名文件。
- 各道路原始标识为 `osm`（way ID），可在 `https://www.openstreetmap.org/way/{id}` 核验。
- 区域保留 way / relation ID，湖岸由本地 Lake Michigan relation member ways 汇总。
- 获取及转换脚本位于 `scripts/fetch-geography.mjs`、`scripts/fetch-lake.mjs` 和 `scripts/build-geography.mjs`。

封路事实另外来自 Chicago 5K / Chicago Marathon 赛事组织方。它们不是 OpenStreetMap 数据，也不属于实时道路通行服务。完整链接和差异见 `data/rules.js` 与 README。
