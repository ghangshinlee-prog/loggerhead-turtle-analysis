# 지중해 붉은바다거북 이동 분석 · Loggerhead Sea Turtle Analysis

서·중부 지중해에서 위성추적된 붉은바다거북(*Caretta caretta*)의 실제 이동 데이터를 내려받아,
품질 필터링 → 공간·환경 분석 → 지도·보고서·인터랙티브 스토리맵까지 end-to-end로 수행한 프로젝트입니다.
해양동물 이동 데이터 기반 **보호구역 설정·국제 협력 제안서**의 근거 분석으로 제작되었습니다.

데이터셋: OBIS `e69a5cc7-2c7d-4ef7-8662-a68a326bddad`
— *"Satellite-tracking of loggerhead sea turtles tracked from western Mediterranean"*
(원시 24,125 위치 · 44 개체 · 2016–2018, CC0).

## 핵심 결과

- **품질 위치 13,522개**(원시의 56.2%) · 분석 개체 **43마리** (Argos-Z·육상오류·속도이상 제거 후)
- 개체들이 **10개국 EEZ**를 이용: 스페인·알제리·이탈리아·튀니지·리비아·그리스·몰타·모로코·프랑스·터키
- 개체당 횡단 국가 수 **중앙값 3개국, 최대 8개국** (한 개체 'Torrevieja'는 터키 포함 8개국 통과)
- 이동 경로 길이 중앙값 **2,827 km**, 최대 **16,658 km**
- 전체 위치의 **97.8%가 표층수온 18–26°C**(중앙값 19.7°C) — 강한 수온 선호
- 공해(ABNJ) 이용 **0%** — 지중해는 반폐쇄해라 핵심 과제는 공해가 아니라 **국가 간 EEZ 공조**

> ⚠️ EEZ는 공식 해양경계가 아니라 "최근접 국가 ≤200해리" 근사입니다. 정밀 분석에는 Marine Regions의 공식 EEZ 경계 적용을 권장합니다.

## 산출물

| 파일 | 설명 |
|------|------|
| `turtle_storymap.html` | **인터랙티브 GIS 스토리맵** — 더블클릭하면 브라우저에서 열림. Leaflet·국경·트랙 전부 내장(인터넷 불필요). 개체 선택 드롭다운·애니메이션 재생·수온색 트레일·국경 횡단 시각화 |
| `붉은바다거북_분석결과_보고서.docx` | 그림 5장이 삽입된 분석 결과 보고서 |
| `해양동물_보호구역_국제협력_제안서.docx` | 보호구역 설정·국제 협력 제안서 |
| `fig_*.png` | 트랙 지도, 핫스팟, EEZ 이용, SST 분포, 개체별 횡단 국가 |

## 코드 (재현)

```bash
python3 download_obis.py     # OBIS API에서 24,125 위치 수집 → loggerhead_clean.csv
python3 analyze.py           # 품질 필터·EEZ 관할권·통계 → loggerhead_filtered.csv, per_individual.csv, hotspots.csv, findings.json
python3 plots.py             # 그림 생성 → fig_*.png
python3 build_webdata.py     # 스토리맵용 경량 JSON → webdata.json
# 문서(docx): npm install && node build_proposal.js && node build_report.js
```

의존성: Python (`numpy pandas matplotlib scipy shapely pyproj requests scikit-learn`), Node (`docx`).
공간 분석에는 Natural Earth 50m 국가/해안선 GeoJSON을 사용합니다(`ne_50m_*.geojson`, 퍼블릭 도메인).

## 데이터 출처 · 라이선스

- 추적 데이터: [OBIS](https://obis.org) — 해당 데이터셋 CC0
- 국경·해안선: [Natural Earth](https://www.naturalearthdata.com) (퍼블릭 도메인)
- 지도 렌더링: [Leaflet](https://leafletjs.com) (BSD-2-Clause, 파일에 인라인)

분석 코드·문서는 저자 소유입니다.
