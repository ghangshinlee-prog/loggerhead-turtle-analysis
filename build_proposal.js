const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer, TableOfContents, PageBreak,
} = require("docx");

const FONT = "Malgun Gothic"; // Korean-capable; falls back gracefully

// ---- helpers ----------------------------------------------------------
const H1 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const H2 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const H3 = (text) =>
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });

const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 160, line: 312 },
    children: [new TextRun({ text, ...opts })],
  });

// Paragraph from array of run specs: [{text, bold, italic}, ...]
const PR = (runs) =>
  new Paragraph({
    spacing: { after: 160, line: 312 },
    children: runs.map((r) => new TextRun(r)),
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 300 },
    children: [new TextRun(text)],
  });

const numbered = (text, ref = "ol") =>
  new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 100, line: 300 },
    children: typeof text === "string" ? [new TextRun(text)] : text,
  });

// ---- table builder ----------------------------------------------------
const CONTENT_W = 9360;
function dataTable(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const margins = { top: 80, bottom: 80, left: 120, right: 120 };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        borders, margins,
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: "1F4E5F", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })],
        })],
      })
    ),
  });

  const bodyRows = rows.map((cells, ri) =>
    new TableRow({
      children: cells.map((c, i) =>
        new TableCell({
          borders, margins,
          width: { size: widths[i], type: WidthType.DXA },
          shading: { fill: ri % 2 ? "EEF3F5" : "FFFFFF", type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun(c)] })],
        })
      ),
    })
  );

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

// ---- document ---------------------------------------------------------
const children = [];

// Title block
children.push(
  new Paragraph({ spacing: { before: 2400, after: 120 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "해양동물 이동 데이터 기반", bold: true, size: 40 })] }),
  new Paragraph({ spacing: { after: 360 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "보호구역 설정 및 국제 협력 제안서", bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Marine Animal Tracking Data for Protected-Area Designation and International Cooperation", italics: true, size: 22, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 80 },
    children: [new TextRun({ text: "작성일: 2026년 6월 25일", size: 22, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "데이터 출처: Movebank · OBIS / OBIS-SEAMAP · Dryad", size: 22, color: "555555" })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// TOC
children.push(
  new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text: "목   차", bold: true, size: 30 })] }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. 개요
children.push(H1("1. 개요"));
children.push(P("위성·GPS·위치추적 기술의 발전으로 해양동물의 이동 경로와 서식지 이용에 관한 고해상도 자료가 크게 증가하였다. 2025년 기준 Movebank는 약 9,600개 연구에서 약 9.3억 개의 위치 데이터를 보유하고 있으며, 이는 30만 개체와 1,600여 종의 동물 이동을 포괄한다는 점에서 추적 자료의 규모를 보여준다. 이러한 자료를 OBIS, Dryad 등의 공개 저장소를 통해 활용하면, 과학적 근거에 기반한 보호구역 설정과 국가 간 협력의 필요성을 도출할 수 있다."));

// 2. 데이터 출처와 규모
children.push(H1("2. 데이터 출처와 규모"));

children.push(H2("2.1 Movebank"));
children.push(bullet("데이터 규모: 2025년 Movebank 뉴스레터는 9.3억 개의 위치 기록과 9,600개 연구, 30만 개체, 1,600여 종을 호스트한다고 보고하였다. 이는 해양포유류, 어류, 바닷새, 파충류 등 다양한 분류군을 포함한다."));
children.push(bullet("특징: 연구자가 소유한 데이터를 중앙에서 관리·공유하는 플랫폼으로, 데이터 품질과 메타데이터 표준이 일정하다."));

children.push(H2("2.2 OBIS 및 OBIS-SEAMAP"));
children.push(bullet("붉은바다거북 위성추적 데이터: 지중해 서부에서 2016–2018년 추적한 44마리 붉은바다거북 데이터셋은 24,125개의 위치와 216,398개의 측정값을 포함한다. Argos 위치등급을 기준으로 고품질 위치만 제공하며, CC0 라이선스로 공개되어 자유롭게 활용할 수 있다."));
children.push(bullet("기타 해양포유류 데이터: OBIS-SEAMAP에는 북대서양참돌고래, 향고래, 바다표범 등 다양한 종의 위치자료가 수록되어 있다. 대부분의 데이터는 GPS·위성태그 기반으로 시간과 좌표를 포함한다."));

children.push(H2("2.3 Dryad"));
children.push(bullet("녹색바다거북 다년 추적 데이터: 2012–2024년 Chagos 군도에서 58마리 녹색바다거북을 Fastloc-GPS, Argos, Iridium 태그로 추적한 데이터는 각 개체의 날짜·시간·위도·경도와 위치 품질 정보를 제공한다. 연구자는 연도에 따른 이동 목적지의 차이가 커서 다년 추적이 중요하다고 보고하였다."));
children.push(bullet("기타 데이터: Dryad에는 다년간의 대서양 loggerhead·leatherback 거북, 바다표범, 펭귄 등의 위치 자료도 공개되어 있다."));

children.push(H2("2.4 기타 자료"));
children.push(bullet("PSAT 태그 데이터: OCEARCH는 2025년 캐나다 Mahone Bay에서 백상아리에게 부착한 PSAT 태그를 2026년 회수하여 270일 동안 5초 간격으로 깊이·수온·빛 수준을 기록한 데이터가 있다고 보고했다. 이는 종의 3차원 이동과 환경 이용을 분석할 수 있는 귀중한 자료이다."));

// summary table
children.push(new Paragraph({ spacing: { before: 160, after: 120 },
  children: [new TextRun({ text: "[표 1] 주요 데이터 출처 요약", bold: true, size: 22 })] }));
children.push(dataTable(
  ["출처", "대표 데이터", "규모 / 특징", "라이선스·접근"],
  [
    ["Movebank", "다분류군 이동 추적", "9.3억 위치 · 9,600 연구 · 30만 개체 · 1,600여 종", "연구자 관리·공유"],
    ["OBIS / OBIS-SEAMAP", "붉은바다거북, 해양포유류", "거북 44개체 · 24,125 위치 (Argos 고품질)", "CC0 등 공개"],
    ["Dryad", "녹색바다거북 다년 추적", "58개체 · 2012–2024 (Fastloc-GPS/Argos/Iridium)", "공개 저장소"],
    ["OCEARCH (PSAT)", "백상아리 3차원 이동", "270일 · 5초 간격 깊이·수온·광량", "기관 보고"],
  ],
  [1900, 2300, 3360, 1800],
));

// 3. 주요 분석 결과
children.push(H1("3. 주요 분석 결과"));

children.push(H2("3.1 서식지 및 이동 경로 파악"));
children.push(P("고해상도 위치데이터를 통해 번식지와 먹이터 사이의 이동 경로, 정착지, 이탈 시기가 명확히 파악된다. 예를 들어 OBIS의 붉은바다거북 데이터는 지중해 서부의 산란 이후 개체들이 짧은 기간 안에 대서양 방향으로 이동하는 경향을 보여 주며, 주요 경유지는 발렌시아 해안과 북서아프리카 연안이다. Chagos 군도의 녹색바다거북 데이터를 분석한 연구에서는 한 해의 추적 데이터만으로는 먹이터 국가가 1개국으로 보이지만, 12년간 데이터를 합치면 7개국으로 늘어난다고 보고했다. 이는 개체들이 해마다 다른 지역을 이용한다는 사실을 나타내며, 단기 자료만으로 보호구역을 설정하면 중요한 서식지를 놓칠 수 있음을 시사한다."));

children.push(H2("3.2 국제적 이동 및 해양보호구역의 겹침"));
children.push(P("바다거북과 상어는 여러 국가의 배타적경제수역(EEZ)을 넘나들며, 때로는 공해(ABNJ)를 이용한다. 녹색바다거북 연구에서는 전체 추적 개체의 약 9%가 공해인 Saya de Malha Bank에서 먹이를 찾았으며, 그 수가 수천 마리의 성체에 해당할 것으로 추정된다. 이는 국가 관할권 밖 서식지 보호와 국제 협력이 필요함을 보여준다. 붉은바다거북 데이터에서도 스페인, 모로코, 알제리 등 여러 국가 해역을 연속적으로 이동하는 패턴이 관찰된다."));

children.push(H2("3.3 종별 서식지 선택과 환경 요인"));
children.push(P("PSAT와 Fastloc-GPS 데이터는 수온, 엽록소, 해류 등 환경요인과 이동 경로를 연계 분석할 수 있게 한다. 백상아리의 PSAT 데이터는 하루 동안 100m 이상의 수직 이동을 반복하며 특정 수온층에 머무르는 경향을 보여준다. 거북 데이터는 수온이 18–26℃인 영역을 선호함을 드러내며, 기후변화로 인한 해역 수온 변화가 서식지 이용에 미칠 영향을 예측할 수 있다."));

// 4. 정책 제안
children.push(H1("4. 정책 제안"));

children.push(H3("4.1 다년·다개체 추적 자료 기반 보호구역 후보지 선정"));
children.push(bullet("단일 연도의 데이터로는 특정 해역의 중요성이 과소평가될 수 있으므로, Movebank·OBIS·Dryad의 다년 추적 자료를 통합하여 주요 산란지, 먹이터, 이동통로를 공간적으로 식별한다."));
children.push(bullet("식별된 핵심 서식지를 중심으로 기존 해양보호구역(MPA)을 확대하거나, 동적 보호구역(dMPA) 제도를 도입하여 동물의 실시간 이동에 따라 보호 범위를 조정한다."));

children.push(H3("4.2 국경을 넘는 보호와 관리"));
children.push(bullet("바다거북과 상어가 여러 국가 EEZ를 오가므로, 영해 간 연결통로를 관리하는 국제적인 협약이 필요하다. 예를 들어 지중해 국가들은 공동으로 붉은바다거북 이동경로를 보호하는 네트워크형 MPA를 설계할 수 있다."));
children.push(bullet("공해상 서식지에 대해서는 지역수산관리기구(RFMO) 또는 국제해사기구(IMO)와 협력하여 어업 규제와 선박 감속 구역을 설정한다."));

children.push(H3("4.3 데이터 공유 및 표준화"));
children.push(bullet("Movebank, OBIS, Dryad 등 여러 플랫폼에 분산된 데이터를 통합 메타데이터 표준으로 연동하는 것이 중요하다. 연구자와 관리기관이 라이선스 문제없이 데이터를 교환할 수 있도록 법적 틀을 마련해야 한다."));
children.push(bullet("각국 정부와 연구기관은 추적 데이터를 실시간 또는 주기적으로 업로드하여 관리자가 서식지 변화를 빠르게 파악할 수 있도록 지원해야 한다."));

children.push(H3("4.4 지속적인 모니터링과 적응형 관리"));
children.push(bullet("보호구역 설정 이후에도 추적 연구를 지속하여 동물의 이동 패턴 변화와 보호효과를 평가해야 한다. 기후변화나 인간 활동 변화에 따라 서식지가 이동하는 경우, 보호구역 경계를 조정할 수 있도록 적응형 관리 계획을 도입한다."));

// 5. 국제 협력의 필요성
children.push(H1("5. 국제 협력의 필요성"));
children.push(bullet("다수 국가의 참여: 녹색바다거북 추적 결과에서 먹이터가 세이셸, 코모로, 마다가스카르, 케냐, 탄자니아 등 여러 국가에 걸쳐 있었고, 일부 개체는 공해를 이용했다. 이는 단일 국가의 노력만으로는 개체 보호가 어렵다는 점을 강조한다."));
children.push(bullet("자료 공유와 공동 연구: 이동 경로 분석은 여러 연구팀의 데이터를 종합해야 정확도가 높아진다. Movebank와 같은 플랫폼에 연구 데이터를 업로드하고, 국제 워킹그룹을 구성해 분석 및 정책 논의를 공동으로 수행할 것을 제안한다."));
children.push(bullet("법적·재정적 지원: 국제협력에는 통합된 관리 계획과 함께 안정적인 재원과 법적 기반이 필요하다. UNEP 지역 해양협약 또는 국제자연보전연맹(IUCN) 등을 통해 기금과 조율 메커니즘을 마련할 수 있다."));

// 6. 실행 방안
children.push(H1("6. 실행 방안"));
children.push(numbered("데이터 통합 태스크포스 구성: 각국 연구자와 정부기관, NGO가 참여하는 태스크포스를 구성해 Movebank·OBIS·Dryad의 데이터를 표준화하고 통합 플랫폼을 구축한다."));
children.push(numbered("핵심 서식지 식별 프로젝트 착수: 통합 데이터로 GIS 분석을 수행해 핵심 서식지와 이동통로를 도출하고, 국가별 보고서를 작성한다."));
children.push(numbered("정책·보호구역 설계 워크숍 개최: 식별된 서식지를 토대로 관계국 관리기관과 보전단체가 공동으로 보호구역 설계 및 관리 방안을 논의한다."));
children.push(numbered("국제협약 체결 및 이행 모니터링: 핵심 서식지가 걸쳐 있는 국가 간에 보호 협약을 체결하고 이행 상황을 공동 모니터링한다. 공해 구역에 대해서는 UN 해양생물다양성협정(BBNJ) 등 국제 법틀을 활용한다."));

// roadmap table
children.push(new Paragraph({ spacing: { before: 200, after: 120 },
  children: [new TextRun({ text: "[표 2] 단계별 실행 로드맵(예시)", bold: true, size: 22 })] }));
children.push(dataTable(
  ["단계", "주요 활동", "기간(예시)", "핵심 주체"],
  [
    ["1단계", "데이터 통합 태스크포스 구성·표준화", "0–6개월", "연구기관·정부·NGO"],
    ["2단계", "GIS 기반 핵심 서식지 식별·국가별 보고", "6–18개월", "분석팀·관계국"],
    ["3단계", "보호구역 설계 워크숍·관리방안 합의", "18–24개월", "관리기관·보전단체"],
    ["4단계", "국제협약 체결·이행 공동 모니터링", "24개월 이후", "관계국·국제기구"],
  ],
  [1300, 4060, 1800, 2200],
));

// 7. 결론
children.push(H1("7. 결론"));
children.push(P("대규모 고해상도 추적 자료는 해양동물의 이동 패턴과 서식지 이용을 과학적으로 밝혀내어 보호구역 설정과 국제 협력을 추진하는 강력한 근거를 제공한다. Movebank·OBIS·Dryad 등의 공개 데이터는 종과 개체 수, 기간 면에서 충분히 풍부하여 정책 수립에 필요한 분석을 가능하게 한다. 이러한 자료를 통합하여 다양한 국가의 EEZ와 공해를 아우르는 보호 전략을 수립하고, 지속적인 데이터 공유와 적응형 관리를 통해 해양생물 보전을 강화해야 한다."));

// note on sources
children.push(new Paragraph({ spacing: { before: 240, after: 80 },
  border: { top: { style: BorderStyle.SINGLE, size: 6, color: "1F4E5F", space: 6 } },
  children: [new TextRun({ text: "비고", bold: true })] }));
children.push(new Paragraph({ spacing: { after: 120 },
  children: [new TextRun({ text: "본 제안서의 수치(Movebank 보유량, 거북·상어 추적 통계 등)는 원자료 출처의 보고 값을 인용한 것으로, 최종 제출 전 각 데이터셋·뉴스레터·논문 원문과의 대조 검증을 권장한다.", italics: true, size: 20, color: "555555" })] }));

// ---- assemble ---------------------------------------------------------
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: "1F4E5F" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: FONT, color: "2E6B7E" },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: FONT, color: "333333" },
        paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 600, hanging: 300 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1140, hanging: 300 } } } },
      ] },
      { reference: "ol", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 600, hanging: 300 } } } },
      ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 } },
        children: [new TextRun({ text: "해양동물 이동 데이터 기반 보호구역 설정 및 국제 협력 제안서", size: 16, color: "888888" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "- ", size: 18, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
          new TextRun({ text: " -", size: 18, color: "888888" })],
      })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("해양동물_보호구역_국제협력_제안서.docx", buffer);
  console.log("written:", buffer.length, "bytes");
});
