const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer, TableOfContents, PageBreak,
} = require("docx");

const FONT = "Malgun Gothic";
const CONTENT_W = 9360;

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t) => new Paragraph({ spacing: { after: 150, line: 312 }, children: [new TextRun(t)] });
const PB = (runs) => new Paragraph({ spacing: { after: 150, line: 312 }, children: runs.map((r) => new TextRun(r)) });
const bullet = (t) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 80, line: 300 }, children: [new TextRun(t)] });

function fig(path, w, label) {
  const dims = { "fig_tracks.png": [1170, 676], "fig_hotspots.png": [1170, 676],
    "fig_eez.png": [975, 546], "fig_sst.png": [975, 546], "fig_countries.png": [975, 546] }[path];
  const h = Math.round(w * dims[1] / dims[0]);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(path),
        transformation: { width: w, height: h },
        altText: { title: label, description: label, name: path } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: label, italics: true, size: 18, color: "555555" })] }),
  ];
}

function table(headers, rows, widths) {
  const bd = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
  const borders = { top: bd, bottom: bd, left: bd, right: bd };
  const margins = { top: 70, bottom: 70, left: 110, right: 110 };
  const hr = new TableRow({ tableHeader: true, children: headers.map((hcell, i) =>
    new TableCell({ borders, margins, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: "1F4E5F", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: hcell, bold: true, color: "FFFFFF", size: 18 })] })] })) });
  const br = rows.map((cells, ri) => new TableRow({ children: cells.map((c, i) =>
    new TableCell({ borders, margins, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: ri % 2 ? "EEF3F5" : "FFFFFF", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: String(c), size: 18 })] })] })) }));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: [hr, ...br] });
}

const F = JSON.parse(fs.readFileSync("findings.json"));
const kids = [];

// Title
kids.push(
  new Paragraph({ spacing: { before: 1600, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "지중해 붉은바다거북 위성추적 데이터", bold: true, size: 36 })] }),
  new Paragraph({ spacing: { after: 300 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "실제 분석 결과 보고서", bold: true, size: 36 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: "Western-Mediterranean Loggerhead (Caretta caretta) Tracking — Spatial & Environmental Analysis", italics: true, size: 20, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 50 },
    children: [new TextRun({ text: "분석일: 2026년 6월 25일", size: 20, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "데이터: OBIS dataset e69a5cc7 · 원시 24,125 위치 · 44 개체 · 2016–2018", size: 20, color: "555555" })] }),
  new Paragraph({ children: [new PageBreak()] }),
);
kids.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "목   차", bold: true, size: 28 })] }));
kids.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-1" }));
kids.push(new Paragraph({ children: [new PageBreak()] }));

// 1. 요약
kids.push(H1("1. 핵심 요약 (Executive Summary)"));
kids.push(P("제안서에서 인용한 바로 그 데이터셋(OBIS, 지중해 서부 붉은바다거북 위성추적, 원시 24,125개 위치·44개체)을 직접 내려받아 품질 필터링과 공간·환경 분석을 수행하였다. 그 결과는 제안서의 핵심 주장—개체들이 다수 국가의 관할 해역을 횡단하며, 특정 수온대를 강하게 선호하고, 소수의 해역에 이용이 집중된다—을 실제 데이터로 뒷받침한다."));
kids.push(bullet(`품질 위치 ${F.n_after_speedfilter.toLocaleString()}개(원시의 ${F.pct_retained}%), 분석 개체 ${F.n_individuals}마리.`));
kids.push(bullet(`개체들은 총 ${F.n_countries_eez_total}개국의 EEZ(관할권 근사)를 이용했다: ${F.countries_eez_total.join(", ")}.`));
kids.push(bullet(`개체당 횡단 국가 수는 중앙값 ${F.median_countries_per_individual}개국, 최대 ${F.max_countries_one_individual}개국 — 한 개체가 다국가 관할을 일상적으로 넘나든다.`));
kids.push(bullet(`전체 위치의 ${F.sst_pct_in_18_26C}%가 수온 18–26℃ 범위(중앙값 ${F.sst_median}℃)에 분포 — 강한 수온 선호.`));
kids.push(bullet(`지중해는 반폐쇄해로 거의 전역이 어느 국가의 200해리 이내였다(공해 이용 ${F.pct_fixes_high_seas}%). 즉 보전 과제는 공해(ABNJ)가 아니라 국가 간 EEZ 공조이다.`));

// 2. 데이터와 방법
kids.push(H1("2. 데이터와 방법"));
kids.push(PB([{ text: "데이터 출처: " , bold: true }, { text: "OBIS REST API (api.obis.org) — “Satellite-tracking of loggerhead sea turtles tracked from western Mediterranean”, dataset id e69a5cc7-2c7d-4ef7-8662-a68a326bddad. 전체 24,125개 위치 레코드를 페이징으로 수집했다. occurrenceID에서 개체명·태그종류·Argos 위치등급을 파싱하고, OBIS가 부가한 표층수온(SST)·수심·해안거리를 함께 활용했다." }]));
kids.push(P("처리 절차는 다음과 같다."));
kids.push(bullet("Argos 위치등급 Z(무효) 제거."));
kids.push(bullet("육상으로 떨어진 위치 제거(Natural Earth 국가 폴리곤과 교차 판정)."));
kids.push(bullet("개체별 시간순 속도 필터: 직전 유효점 대비 이동속도가 10 km/h를 초과하는 비현실적 점프 제거."));
kids.push(bullet("관할권 근사(EEZ proxy): 각 위치에서 최근접 국가까지 측지거리를 계산해 200해리(370.4 km) 이내면 해당국 EEZ로, 초과하면 공해(ABNJ)로 분류."));
kids.push(new Paragraph({ spacing: { before: 140, after: 100 }, children: [new TextRun({ text: "[표 1] 품질 필터링 단계별 잔존 위치 수", bold: true, size: 20 })] }));
kids.push(table(
  ["단계", "처리", "잔존 위치 수", "비고"],
  [
    ["0", "원시 다운로드", F.n_raw_fixes.toLocaleString(), "OBIS 전체"],
    ["1", "Argos Z 제거", F.n_after_drop_argosZ.toLocaleString(), `-${(F.n_raw_fixes-F.n_after_drop_argosZ).toLocaleString()}`],
    ["2", "육상 위치 제거", F.n_after_drop_onland.toLocaleString(), `-${(F.n_after_drop_argosZ-F.n_after_drop_onland).toLocaleString()}`],
    ["3", "속도 필터(>10km/h)", F.n_after_speedfilter.toLocaleString(), `최종 ${F.pct_retained}% 유지`],
  ],
  [900, 3200, 2660, 2600],
));

// 3. 결과
kids.push(H1("3. 결과"));

kids.push(H2("3.1 이동 경로와 공간 분포"));
kids.push(PB([{ text: "분석 개체 " }, { text: `${F.n_individuals}마리`, bold: true },
  { text: `는 발레아레스해와 알보란해를 중심으로 서·중부 지중해 전역을 이용했다. 개체별 이동 경로 길이는 중앙값 ${F.median_path_km.toLocaleString()} km, 최대 ${Math.round(F.max_path_km).toLocaleString()} km에 달했다(추적 기간 대부분 9–11개월). 이는 산란·정착지와 먼 먹이터를 오가는 광역 회유를 보여준다.` }]));
fig("fig_tracks.png", 600, "그림 1. 품질 필터링된 붉은바다거북 이동 경로 (개체별 색상)").forEach((p) => kids.push(p));

kids.push(H2("3.2 핵심 서식지 핫스팟"));
kids.push(PB([{ text: "0.25° 격자 밀도 분석 결과, 이용이 스페인 남동안·발레아레스해·알제리 분지의 소수 격자에 강하게 집중되었다. 최밀집 격자(위도 " },
  { text: `${F.top_hotspot_cell.glat}°, 경도 ${F.top_hotspot_cell.glon}°`, bold: true },
  { text: `)에는 ${F.top_hotspot_cell.n_fixes}개 위치가 ${F.top_hotspot_cell.n_ind}개 개체로부터 기록되었다. 이런 다개체 공유 격자는 보호구역 후보지의 1차 선정 대상이 된다.` }]));
fig("fig_hotspots.png", 600, "그림 2. 0.25° 격자 이용 밀도(로그 스케일)와 최밀집 격자(청색 원)").forEach((p) => kids.push(p));

kids.push(H2("3.3 국가 관할권 횡단과 국제 협력 필요성"));
kids.push(PB([{ text: `개체들은 총 ${F.n_countries_eez_total}개국의 관할 해역을 이용했으며(스페인·알제리·이탈리아·튀니지·리비아·그리스·몰타·모로코·프랑스·터키), 위치 수 기준으로 스페인(${F.top5_eez_by_fixes.Spain.toLocaleString()})과 알제리(${F.top5_eez_by_fixes.Algeria.toLocaleString()})에 집중되었다. 중요한 점은 ` },
  { text: "단일 개체도 다수 국가를 넘나든다", bold: true },
  { text: `는 것이다 — 개체당 횡단 국가 수 중앙값 ${F.median_countries_per_individual}개국, 최대 ${F.max_countries_one_individual}개국. 예컨대 ‘Torrevieja’ 한 마리는 터키를 포함한 8개국 EEZ를 통과했다. 이는 단일 국가 보전 노력만으로는 한 개체조차 온전히 보호할 수 없음을 직접 보여준다.` }]));
fig("fig_eez.png", 560, "그림 3. 국가 관할권별 위치 수 (EEZ 근사, 최근접국 ≤200해리)").forEach((p) => kids.push(p));
fig("fig_countries.png", 560, "그림 4. 개체별 횡단 국가 수 분포").forEach((p) => kids.push(p));
kids.push(new Paragraph({ spacing: { before: 120, after: 100 }, children: [new TextRun({ text: "[표 2] 이동 경로가 긴 상위 6개체와 횡단 국가", bold: true, size: 20 })] }));
const per = fs.readFileSync("per_individual.csv", "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
// CSV has commas inside countries field; parse robustly via known column count from header
const header = fs.readFileSync("per_individual.csv","utf8").trim().split("\n")[0].split(",");
// Re-read with a tiny CSV parse honoring quotes
function parseCSV(text){const rows=[];let row=[],cur="",q=false;for(const ch of text){if(q){if(ch==='"'){q=false}else cur+=ch}else{if(ch==='"')q=true;else if(ch===","){row.push(cur);cur=""}else if(ch==="\n"){row.push(cur);rows.push(row);row=[];cur=""}else cur+=ch}}if(cur||row.length){row.push(cur);rows.push(row)}return rows}
const pcsv = parseCSV(fs.readFileSync("per_individual.csv","utf8").trim());
const idx = Object.fromEntries(pcsv[0].map((h,i)=>[h,i]));
const top6 = pcsv.slice(1,7);
kids.push(table(
  ["개체", "추적일", "경로(km)", "국가수", "이용 국가"],
  top6.map((r)=>[r[idx.individual], Math.round(+r[idx.days_tracked]), Math.round(+r[idx.path_km]).toLocaleString(), r[idx.n_countries_eez], r[idx.countries_eez]]),
  [1400, 900, 1300, 900, 4860],
));

kids.push(H2("3.4 환경 선호 — 표층수온(SST)"));
kids.push(PB([{ text: `위치별 표층수온은 18–22℃에 강하게 몰려 있었고, 전체의 ` },
  { text: `${F.sst_pct_in_18_26C}%가 18–26℃`, bold: true },
  { text: `대역(중앙값 ${F.sst_median}℃)에 분포했다. 이는 제안서가 제시한 거북의 수온 선호 범위와 일치하며, 기후변화로 등온선이 북상할 경우 핵심 서식지와 핫스팟도 함께 이동할 수 있음을 시사한다(적응형 경계 조정의 근거).` }]));
fig("fig_sst.png", 560, "그림 5. 위치별 표층수온 분포와 18–26℃ 선호 대역").forEach((p) => kids.push(p));

// 4. 제안서 연결
kids.push(H1("4. 제안서와의 연결 및 정책 함의"));
kids.push(bullet("제안서 3.1(서식지·이동 경로): 광역 회유와 소수 격자 집중을 데이터로 확인 → 핫스팟 격자를 보호구역 후보지 선정의 정량 근거로 사용 가능."));
kids.push(bullet("제안서 3.2/5(국제 이동·협력): 10개국 EEZ 횡단, 개체당 최대 8개국 → 네트워크형 MPA와 국가 간 협약의 필요성을 단일 데이터셋으로 입증."));
kids.push(bullet("제안서 3.3(환경 요인): 18–26℃ 선호 정량화 → 기후 시나리오 기반 서식지 이동 예측 및 적응형 관리의 출발점."));
kids.push(bullet("정정/보강: 지중해 표본에서는 공해 이용이 사실상 0%였다. 공해(ABNJ)·BBNJ 논점은 인도양 Chagos 녹색바다거북 같은 외양 사례에 해당하며, 지중해 사례의 핵심은 ‘EEZ 간 공조’로 프레이밍하는 것이 정확하다."));

// 5. 한계와 재현
kids.push(H1("5. 한계와 재현 방법"));
kids.push(bullet("EEZ는 실제 해양경계 폴리곤이 아니라 ‘최근접 국가 ≤200해리’ 근사를 사용했다. 정밀 분석에는 Marine Regions의 공식 EEZ 경계 적용을 권장한다."));
kids.push(bullet("Argos 추적은 위치 오차가 크므로 Z 제거·속도 필터를 적용했으나(최종 56% 유지), 상태공간모형(state-space model) 기반 경로 보정으로 정교화할 수 있다."));
kids.push(bullet("SST는 OBIS 부가 환경값을 사용했으며, 계절·연도 편향이 있을 수 있다."));
kids.push(PB([{ text: "재현: ", bold: true }, { text: "download_obis.py(수집) → analyze.py(필터·관할권·통계) → plots.py(그림). 모든 중간 산출물(loggerhead_filtered.csv, per_individual.csv, hotspots.csv, findings.json)이 함께 저장되어 있다." }]));

// assemble
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: "1F4E5F" }, paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: "2E6B7E" }, paragraph: { spacing: { before: 200, after: 110 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [ { reference: "b", levels: [ { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } } ] } ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 } },
      children: [new TextRun({ text: "지중해 붉은바다거북 추적 데이터 분석 결과 보고서", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "- ", size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }), new TextRun({ text: " -", size: 18, color: "888888" })] })] }) },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync("붉은바다거북_분석결과_보고서.docx", buf); console.log("written", buf.length, "bytes"); });
