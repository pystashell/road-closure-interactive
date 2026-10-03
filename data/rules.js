// Transcribed facts from 2026 official event notices, checked 2026-10-03.
// Motor vehicle closures only. Parking and pedestrian notices are explicitly separate in the UI.
export const checkedAt = "2026-10-03";
export const sources = {
  marathon: {
    title: "2026 马拉松 · 官方封路详细表",
    url: "https://www.chicagomarathon.com/event-info/participant-information/course/street-closures/",
  },
  marathonPDF: {
    title: "2026 马拉松 · 官方封路手册 PDF",
    url: "https://cdn.chicagomarathon.com/app/uploads/2026/08/31160104/26-BACM-STREET-CLOSURE-BROCHURE.pdf",
  },
  grantPDF: {
    title: "Grant Park · 施工与封路时间表 PDF",
    url: "https://cdn.chicagomarathon.com/app/uploads/2026/08/31160103/26-BACM-GRANT-PARK-STREET-CLOSURE.pdf",
  },
  grantMap: {
    title: "Grant Park · 起终点地图（9月22日版）",
    url: "https://cdn.chicagomarathon.com/app/uploads/2026/09/22133648/26-BACM-GRANT-PARK-SITE-MAP-9.22.26.pdf",
  },
  fivek: {
    title: "2026 Chicago 5K · 官方封路通知",
    url: "https://www.chicago5k.com/event-information/street-closure-notification/",
  },
  fivekPDF: {
    title: "2026 Chicago 5K · 官方封路手册 PDF",
    url: "https://assets-chicago5k-com.s3.amazonaws.com/wp-content/uploads/2026/09/26-AC5K-STREET-CLOSURE-BROCHURE.pdf",
  },
};
export const conflicts = [
  "5K 的 Harrison 范围存在差异：网页写 State–Franklin，2026 官方手册文字和路线图为 Michigan–Franklin。本图谨慎采用较宽的手册范围，并保留不一致说明。",
  "马拉松资料概述称部分 Loop 道路 09:00 开放，但详细分段表写 11:00–13:45；本图按详细表计算。",
  "Michigan 在 11th 以北可用的概述，与 Grant Park 的 Madison–Roosevelt 详细封路表冲突；本图按详细封路表计算。",
  "官方概述的 16:00 结束不适用于所有道路：部分详细时段至 16:30、18:00，准备封路还会跨日持续。",
  "Columbus 终点段、Roosevelt 的赛道表开始时间晚于同段 Grant Park 表；本图取全部封路时段的并集。",
];
const grant = `Balbo Dr|Columbus Dr|DuSable Lake Shore Dr|09-24 06:00|10-16 15:00
Balbo Dr|Michigan Ave|Columbus Dr|10-08 04:00|10-12 15:00
Jackson Dr|Columbus Dr|DuSable Lake Shore Dr|10-08 04:00|10-12 06:00
Jackson Dr|Michigan Ave|Columbus Dr|10-08 04:00|10-11 20:00
Columbus Dr|Ida B. Wells Dr|Roosevelt Rd|10-08 04:00|10-12 15:00
Columbus Dr|Monroe St|Ida B. Wells Dr|10-08 04:00|10-11 20:00
Congress Plaza Dr|Michigan / Van Buren|Michigan / Harrison|10-08 04:00|10-11 20:00
Ida B. Wells Dr|Michigan Ave|Columbus Dr|10-08 04:00|10-11 20:00
Columbus Dr|Randolph St|Monroe St|10-10 04:00|10-11 17:00
Roosevelt Rd|Columbus Dr|DuSable Lake Shore Dr|10-10 11:00|10-11 18:00
Monroe St|Michigan Ave|DuSable Lake Shore Dr|10-10 04:00|10-11 17:00
Columbus Dr|McFetridge Dr|Roosevelt Rd|10-11 04:00|10-11 18:00
Michigan Ave|Madison St|Balbo Dr|10-11 04:00|10-11 16:00
Roosevelt Rd|Michigan Ave|Columbus Dr|10-11 04:00|10-11 18:00
Michigan Ave|Balbo Dr|Roosevelt Rd|10-11 05:30|10-11 18:00`;
const fivek = `Ida B. Wells Dr|Columbus Dr|Michigan Ave|06:30|09:30
E. Congress Plaza Dr|Ida B. Wells Dr|Michigan Ave|06:30|09:30
Michigan Ave|Ida B. Wells Dr|Balbo Dr|06:30|09:30
Harrison St|Michigan Ave|Franklin St|06:30|09:30
State St|E. Harrison St|W. Harrison St|06:30|09:30
Franklin St|Harrison St|Adams St|06:30|09:30
Van Buren St|Wacker Dr|Franklin St|06:30|09:30
Wacker Dr|Michigan Ave|Van Buren St|06:30|09:30|southbound
Wacker Dr|Adams St|Michigan Ave|06:30|09:30|northbound
Jackson Blvd|Wacker Dr|Franklin St|05:00|11:00
Wacker Dr|Adams St|Van Buren St|05:00|11:00`;
const marathon = `Columbus Dr|起点（Monroe 附近）|Grand Ave|10:30
Grand Ave|Columbus Dr|Dearborn St|10:30
Dearborn St|Grand Ave|Jackson Blvd|11:00
Jackson Blvd|Dearborn St|LaSalle St|11:00
LaSalle St|Jackson Blvd|Stockton Dr|11:30
Stockton Dr|LaSalle Dr|Fullerton Dr|12:00
Fullerton Dr|Stockton Dr|Cannon Dr|12:00
Cannon Dr|Fullerton Dr|Sheridan Rd|12:00
Sheridan Rd|Diversey Pkwy|Belmont Ave|12:00
Inner Lake Shore Dr|Belmont Ave|Sheridan Rd|12:00
Sheridan Rd|Inner Lake Shore Dr|Broadway|12:30
Broadway|Sheridan Rd|Briar Pl|12:30
Broadway|Briar Pl|Diversey Pkwy|12:45
Clark St|Diversey Pkwy|Fullerton Pkwy|12:45
Clark St|Fullerton Pkwy|Webster Ave|13:00
Webster Ave|Clark St|Sedgwick St|13:00
Sedgwick St|Webster Ave|North Ave|13:15
North Ave|Sedgwick St|Wells St|13:30
Wells St|North Ave|Walton St|13:30
Wells St|Walton St|Wacker Dr|13:30
Wacker Dr|Wells St|Adams St|13:45
Adams St|Wacker Dr|Damen Ave|14:00
Damen Ave|Adams St|Jackson Blvd|14:00
Jackson Blvd|Damen Ave|Halsted St|14:30
Halsted St|Jackson Blvd|Taylor St|14:30
Taylor St|Halsted St|Loomis St|14:45
Loomis St|Taylor St|18th St|15:00
18th St|Loomis St|Halsted St|15:15
Halsted St|18th St|21st St|15:15
21st St|Halsted St|Canalport Ave|15:15
Canalport Ave|21st St|Cermak Rd|15:30
Cermak Rd|Canalport Ave|Wentworth Ave|15:30
Wentworth Ave|Cermak Rd|26th St|15:45
26th St|Wentworth Ave|Michigan Ave|15:45
Michigan Ave|26th St|35th St|16:00
35th St|Michigan Ave|Indiana Ave|16:00
Indiana Ave|35th St|31st St|16:15
31st St|Indiana Ave|Michigan Ave|16:15
Michigan Ave|31st St|Roosevelt Rd|16:30
Roosevelt Rd|Michigan Ave|Columbus Dr|18:00
Columbus Dr|Roosevelt Rd|终点（Roosevelt 以北）|10-12 15:00`;
const date = (s) => `2026-${s.replace(" ", "T")}:00-05:00`;
const id = (p, i) => `${p}-${String(i + 1).padStart(2, "0")}`;
export const rules = [
  ...grant.split("\n").map((line, i) => {
    const [road, from, to, a, b] = line.split("|");
    return {
      id: id("grant", i),
      road,
      from,
      to,
      start: date(a),
      anticipatedEnd: date(b),
      kind: "setup",
      event: "Grant Park 准备 / 撤场",
      sources: ["marathon", "grantPDF"],
    };
  }),
  ...fivek.split("\n").map((line, i) => {
    const [road, from, to, a, b, direction] = line.split("|");
    return {
      id: id("5k", i),
      road,
      from,
      to,
      start: date("10-10 " + a),
      anticipatedEnd: date("10-10 " + b),
      direction,
      kind: "race",
      event: "Chicago 5K",
      sources: i === 3 ? ["fivekPDF", "fivek"] : ["fivek", "fivekPDF"],
      note:
        i === 3
          ? conflicts[0]
          : i === 4
            ? "Harrison 在 State 的东西交叉口错开约 19 米；此记录保留中间连接段。"
            : i === 7 || i === 8
              ? "仅表示标注方向的上层 Wacker；不表示下层主路封闭。"
              : undefined,
    };
  }),
  ...marathon.split("\n").map((line, i) => {
    const [road, from, to, b] = line.split("|");
    return {
      id: id("marathon", i),
      road,
      from,
      to,
      start: date(i === 40 ? "10-08 06:00" : "10-11 06:00"),
      anticipatedEnd: date(b.includes(" ") ? b : "10-11 " + b),
      kind: "race",
      event: "Chicago Marathon",
      sources: ["marathon", "marathonPDF"],
      note:
        i === 0 || i === 40
          ? "起终点为赛事地标，位置参考官方场地地图；附近 Grant Park 准备封路继续生效。"
          : i === 39
            ? conflicts[4]
            : undefined,
    };
  }),
];
