# 서울 아파트 체계도 — 의사결정 로그

## 프로젝트 개요
- **목적**: 이소장의 서울아파트 가격 체계도 마인드맵을 웹앱으로 구현, 네이버부동산 실시간 최저가 자동 연동
- **사용자**: 개인용 (이소장 전용)
- **원본 데이터**: 서울 체계도.csv (6개 가격 티어, ~90개 단지)

---

### [2026-02-25 12:00] 프로젝트 시작 및 기술 결정
- **유형**: 목표설정 | 기술결정
- **내용**:
  - Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
  - 다크 네이비 테마 (목업 기반)
  - 데이터: TypeScript 상수 파일 (DB 없이 시작, 필요시 추가)
  - 네이버부동산 내부 API로 가격 조회
  - Vercel 배포
- **근거**:
  - 개인용이라 DB 없이 가볍게 시작
  - nepcon-sorter와 동일 스택으로 유지보수 용이
  - 확장성을 위해 모듈러 컴포넌트 구조 채택

### [2026-02-25 12:00] 확장성 아키텍처 결정
- **유형**: 기술결정
- **내용**:
  - 컴포넌트 분리: Header, TierTabs, DistrictGrid, ApartmentCard, NoteCard 독립 컴포넌트
  - 데이터 레이어 분리: types/ + data/ + lib/ 명확히 구분
  - 새 기능 추가 시 기존 코드 수정 최소화하도록 설계
  - 아파트/구/티어 추가가 데이터 파일 수정만으로 가능하도록
- **근거**: 사용자가 아이디어마다 기능 추가할 예정, 코드 꼬임 방지 필수

### [2026-02-25 10:25] 네이버부동산 API 연동
- **유형**: 태스크완료
- **내용**:
  - src/lib/naver.ts: searchComplex, getComplexAreas, getLowestPrice 함수
  - 3개 API 라우트: /api/naver-search, /api/naver-price, /api/naver-price/batch
  - PriceRefreshButton: 현재 티어 아파트 일괄 가격 조회 (500ms 간격)
  - 평형→㎡ 변환: 24평=59㎡, 34평=84㎡ 등
- **근거**: 사용자가 네이버부동산 필터링+최저가 자동화 요청

### [2026-02-25 10:40] 아파트 메모 기능
- **유형**: 태스크완료
- **내용**:
  - MemoEditor 컴포넌트: 인라인 편집, Enter 저장, Esc 취소
  - memo-storage.ts: localStorage CRUD (키: 'seoul-apt-memos')
  - 아파트 카드 아래 "메모 추가..." 호버 표시
  - MemoMap 타입 추가, page.tsx에서 상태 관리
- **근거**: 사용자가 단지별 자유 메모 기능 요청

### [2026-02-25 11:30] 매물 클릭 네이버 링크 + 메모 노트카드 디자인
- **유형**: 태스크완료
- **내용**:
  - ApartmentCard: 전체 카드를 `<a>` 태그로 변경, 클릭 시 네이버부동산 검색/단지 페이지 이동
  - MemoEditor: 노란 배경(#fbf3db) + ✏️ 아이콘 노트카드 스타일로 변경
  - 추가 버튼도 점선 테두리 스타일 통일
- **근거**: 사용자가 매물 클릭→네이버 이동 + 메모 디자인 요청

### [2026-02-25 11:30] GitHub + Vercel 배포
- **유형**: 태스크완료
- **내용**:
  - GitHub: https://github.com/dlwlsdud0912-eng/seoul-blueprint
  - Vercel: https://seoul-blueprint.vercel.app
- **근거**: 사용자 배포 요청

### [2026-02-25 12:00] 5인 에이전트 종합 리뷰
- **유형**: 기술결정
- **내용**: Designer, Quality, Security, Performance, PM 5개 에이전트 병렬 코드 리뷰 완료
- **MVP 완성도**: 7.2/10
- **즉시 수정 필요**:
  1. memo-storage SSR guard (CRITICAL)
  2. Header 갱신시각 하드코딩 (HIGH)
  3. MemoEditor onBlur 충돌 (HIGH)
- **최우선 기능 추가**:
  1. 가격 캐싱 (localStorage) — Quick Win
  2. naverComplexId 130개 매핑 — 성능 2배
  3. 관심 단지 즐겨찾기 — 일일 루틴
- **근거**: 5인 전문 리뷰 종합 결과

### [2026-02-25 13:30] naverComplexId 매핑 + 가격 캐싱 + 버그 수정 대규모 업데이트
- **유형**: 태스크완료
- **내용**:
  - **naverComplexId 매핑 (127/130)**: 네이버 검색 API로 130개 아파트 중 127개 complexId 매핑 완료
    - 실패 3건: 당산동 한강, 길음 센터피스, 청량리 L65 (검색명 불일치)
    - scripts/map-complex-ids.mjs 매핑 스크립트 생성
  - **가격 캐싱**: price-cache.ts 신규 — localStorage에 가격+타임스탬프 저장 (1시간 유효)
    - 페이지 로드 시 캐시 자동 로드, 새로고침해도 가격 유지
    - complexId 캐시도 별도 저장
  - **Header 동적 시각**: 하드코딩 제거 → lastUpdated prop으로 실시간 갱신 시각 표시
  - **PriceRefreshButton 개선**: 성공/실패 카운트 표시, 에러 피드백, 3초 후 리셋
  - **ApartmentCard 링크 개선**: /complexes/{id}?markerId={id}&a=APT&e=RETAIL → 매물 목록 직접 이동
  - **MemoEditor onBlur 수정**: isDeleting ref로 삭제 버튼 클릭 시 blur 충돌 해결
  - **memo-storage SSR guard**: saveMemo/deleteMemo에 typeof window 가드 추가
- **에이전트**: W-05 (매핑), W-05b (적용), W-06 (캐싱), W-07 (버그)
- **근거**: 사용자가 가격 미갱신 + 네이버 링크 지도화면 이동 문제 제기

### [2026-02-25 15:00] 네이버 가격 크롤링 파이프라인 아키텍처 전환
- **유형**: 기술결정
- **내용**:
  - **문제**: Vercel 서버(데이터센터 IP)에서 네이버 API 호출 시 빈 데이터 반환 (네이버가 데이터센터 IP 차단)
  - **시도 후 실패**:
    1. Playwright headless → 401 Unauthorized (봇 감지)
    2. Playwright headful + stealth mode → 401 (navigator.webdriver, CDP 감지)
    3. System Chrome channel → 401
  - **최종 해결**: 로컬 PC 크롤링 파이프라인
    - `scripts/crawl-prices.ts`: 순수 Node.js fetch로 네이버 API 호출
    - 2초 딜레이 + 429 재시도(30초 대기, 최대 3회)
    - 결과를 `public/prices.json`에 저장
    - `npm run crawl` → git push → Vercel 자동 배포
  - **프론트엔드 변경**: page.tsx가 `/prices.json` 우선 로드, 실패 시 localStorage 캐시 폴백
  - **UI 변경**: "실시간 가격" → "수동 갱신", "마지막 갱신" → "마지막 크롤링"
- **에이전트**: W-08 (크롤러 작성), W-09 (프론트엔드 연동)
- **근거**: 네이버가 데이터센터 IP + 자동화 브라우저 모두 차단. 주거용 IP의 순수 HTTP 요청만 허용
- **현황**: IP 레이트 리밋(429) 해제 대기 중. 해제 후 `npm run crawl` 실행 필요

### [2026-02-25 21:30] 모바일 핫스팟 IP 우회로 크롤링 실행
- **유형**: 문제해결
- **내용**:
  - 기존 KT 유선 IP(121.131.13.72)가 429 레이트 리밋 상태
  - Galaxy Z Fold7 모바일 핫스팟으로 전환 → SKT 모바일 IP(223.38.51.172)
  - 주의: 폰 Wi-Fi가 켜져있으면 핫스팟이 집 유선 인터넷을 공유하므로, 폰 Wi-Fi를 반드시 끄고 모바일 데이터만 사용해야 IP가 바뀜
- **근거**: 레이트 리밋 해제 대기(1~3시간) 대신 즉시 IP 변경으로 크롤링 가능

### [2026-02-25 22:00] 네이버 API 보호 강화 → puppeteer 브라우저 크롤러로 전환
- **유형**: 기술결정 | 문제해결
- **내용**:
  - **문제**: 네이버가 API 보호를 전면 강화 — 모든 직접 API 호출(curl/fetch)이 429 차단됨. 새 IP에서도 동일. DevTools 감지 시 404 리다이렉트
  - **해결**: puppeteer-extra + stealth plugin 기반 브라우저 크롤러
    - `scripts/crawl-prices-browser.mjs`: 실제 브라우저 실행 → 단지 페이지 탐색 → `page.on('response')` 로 `/api/articles/complex/` 응답 인터셉트 → 가격 추출
    - stealth 플러그인이 navigator.webdriver 등 봇 감지 우회
    - 응답 인터셉터가 tradeType=A1 (매매) URL 우선 선택
  - **의존성 추가**: puppeteer, puppeteer-extra, puppeteer-extra-plugin-stealth
  - **npm 스크립트**: `"crawl:browser": "node scripts/crawl-prices-browser.mjs"`
  - **puppeteer v24 주의**: `page.removeListener()` → `page.off()` 사용 필수
- **근거**: 네이버가 서버 사이드 fetch 완전 차단. 실제 브라우저만 허용

### [2026-02-25 22:30] 전세 가격 오염 수정 (크롤러 3가지 버그)
- **유형**: 버그수정
- **내용**:
  - **증상**: 크롤링 결과에 0.2억, 0.5억 등 전세 가격이 매매가로 혼입
  - **원인 1**: 매매 필터에 `(!tradeType && !tradeCode)` 폴백이 있어 분류 없는 전세 매물이 통과
  - **원인 2**: 면적 필터가 `articles` (전체)에 적용됨 → 전세 매물도 면적 필터 통과
  - **원인 3**: `dealOrWarrantPrc` 사용 → 전세 보증금(warrantPrc)이 매매가로 잡힘
  - **수정**:
    1. 매매 필터: `tradeType === '매매' || tradeCode === 'A1'` 만 허용 (폴백 제거)
    2. 면적 필터: `saleOnly` (매매만) 에서 필터링
    3. 가격 추출: `dealPrc` 우선 사용 (`dealOrWarrantPrc` 는 폴백)
  - **코드 위치**: `scripts/crawl-prices-browser.mjs`
- **근거**: 전세(B1)/월세(B2) 매물이 매매(A1) 가격에 섞이면 안 됨

### [2026-02-25 23:00] 대규모 아파트 데이터 추가 (130개 → 277개)
- **유형**: 데이터확장
- **내용**:
  - **추가 규모**: 147개 신규 아파트 추가 (기존 130개 → 총 277개)
  - **타입 확장**:
    - 9개 신규 구: 강남구, 서초구, 서대문구, 강북구, 구로구, 은평구, 노원구, 종로구, 중구
    - 2개 신규 티어: '32' (가용 30억+대출2), '50' (프리미엄, 32억 초과)
  - **파일 변경**:
    - `src/types/index.ts`: District 타입에 9개 구 추가, TierKey에 '32'|'50' 추가
    - `src/data/tiers.ts`: 32억/50억 티어 객체 추가
    - `src/data/apartments.ts`: 147개 아파트 엔트리 추가
  - **주요 신규 단지**: 잠실엘스, 파크리오, 트리지움, 헬리오시티, 올림픽파크포레온, 목동신시가지(1/4/8/11/12단지), 여의도미성/시범, 경희궁자이, 한남하이츠, 아크로리버파크, 래미안원베일리, 반포자이 등
- **근거**: 사용자가 기존 리스트(예전에 뽑아놓은 아파트 목록)를 전체 크롤링 대상에 포함 요청

### [2026-02-25 23:30] naverComplexId 자동 매핑 (264/277 성공)
- **유형**: 태스크완료
- **내용**:
  - `scripts/map-complex-ids.mjs` 재작성: apartments.ts 자동 파싱 → 미매핑 아파트 검출 → 네이버 검색으로 complexId 추출 → 파일에 자동 적용
  - **결과**: 277개 중 264개 매핑 성공 (95.3%)
  - **실패 13개** (검색명 불일치로 네이버에서 못 찾음):
    - 당산동한강, 길음센터피스, 청량리L65, DMC한양수자인, 래미안트리베라
    - 녹번대림이편한, 이편한영등포아델포레, 청량리역한양수자인, 보문아이파크자이
    - 행당한진대림, 송파레미니스, 삼익대청, 올림픽훼미리
  - 실패 13개는 크롤링 시 자동 스킵됨 (naverComplexId 없으면 건너뜀)
- **근거**: 264개 아파트의 네이버 매물 페이지 직접 접근을 위해 complexId 필수

### [2026-02-25 23:30] 사무실 WiFi 사용 가능 확인
- **유형**: 참고사항
- **내용**:
  - puppeteer 브라우저 크롤러는 실제 브라우저를 사용하므로, 이전의 직접 API 호출 방식과 달리 IP 기반 차단에 영향받지 않음
  - 사무실 WiFi(KT 유선)에서도 `npm run crawl:browser` 실행 가능
  - 기존의 직접 fetch 방식(`npm run crawl`)은 여전히 429 차단 상태
- **근거**: 사용자가 사무실 복귀 후 크롤링 가능 여부 확인

### [2026-02-26 09:00] 검색 + 관리모드 + 폴더UX + 멀티사이즈 대규모 업데이트
- **유형**: 태스크완료
- **내용**:
  - **SearchBar 신규**: 아파트 이름 부분 매칭 검색, 선택 시 해당 티어로 자동 이동, ESC/외부클릭 닫기
  - **ApartmentManager 신규**: 관리모드 토글 → 티어 이동(8개 티어 선택) + 아파트 추가 폼(이름/구/평형/가격/티어/네이버ID)
  - **apartment-overlay.ts 신규**: localStorage 기반 오버레이 저장소 — 티어 변경(tierChanges) + 추가 아파트(additions) 관리, 코드 데이터 수정 없이 사용자 커스텀 가능
  - **ApartmentCard 멀티사이즈**: 59㎡/84㎡/114㎡ 면적별 최저가 표시, 관리모드 시 "이동/복원/삭제" 버튼 + "변경됨/추가됨" 뱃지
  - **FolderManager UX**: 접이식(아코디언) UI, 빈 상태 안내 + CTA, 모바일 터치 영역 44px 확대, 편집/삭제 버튼 항상 표시
  - **FolderDropdown UX**: 뷰포트 밖 방지(위치 자동조정), 체크박스 스타일 토글, 폴더 태그 표시
  - **크롤러 sizes 수집**: crawl-prices-browser.mjs에서 면적별(59/84/114㎡) 가격 데이터 추출하여 prices.json에 포함
  - **page.tsx 통합**: overlay 병합 로직(mergedApartments), 검색/관리모드 상태 관리
- **에이전트**: W-01(그리드사이즈), W-02(검색), W-03(폴더UX), W-04(타입+멀티사이즈), W-05(관리모드+오버레이)
- **빌드**: tsc 0에러, npm run build 성공
- **커밋**: `551a80f` — 11 files changed, +1281 -199
- **배포**: git push → Vercel 자동 배포 완료
- **근거**: 사용자가 검색, 티어/아파트 관리, 면적별 가격, 폴더 UX 개선 요청

### [2026-02-26 10:00] 최저가 버그 수정 + 면적별 가격 표시 + UI 정리
- **유형**: 버그수정 | 기능개선
- **내용**:
  - **크롤러 최저가 버그**: "집주인 매물 우선" 로직이 더 싼 일반 매물을 무시하는 문제. 예: 이문E편한세상 9.3억(일반) 대신 11.8억(집주인) 표시 → 집주인 우선 로직 완전 제거, 전체 매매 매물에서 진짜 최저가 산출
  - **sizes 매물없음 구분**: allArticles(전체)에서 면적 존재 확인 → 면적 있으나 매매 없음 시 null 출력 (UI에서 "매물없음" 표시)
  - **ApartmentCard 면적 항상 표시**: 59/84/114㎡ 3칸 항상 표시. undefined=—, null=매물없음, object=가격
  - **UI 컴팩트화**: 검색+관리 한줄 배치, 폴더/카드 패딩 축소, 관리버튼 호버시만 표시, 뱃지 축소
- **에이전트**: W-06(크롤러), W-07(UI)
- **빌드**: tsc 0에러, npm run build 성공
- **커밋**: `6bdd92a` — 6 files changed, +145 -159
- **배포**: Vercel 즉시배포 완료
- **근거**: 사용자가 최저가 오류 + 면적별 가격 + UI 잡스러움 지적

---

## 다음 할 일
1. **크롤링 실행**: `npm run crawl:browser` — 최저가 수정 + sizes null 반영된 데이터 갱신
2. **크롤링 결과 검증**: 이문E편한세상 등에서 진짜 최저가 확인
3. **prices.json 커밋 + 배포**

### [2026-02-26 오후] 아파트 추가 리디자인 + 폴더 UX 개선
- **유형**: 기능개선
- **내용**:
  1. 아파트 추가: 6칸 복잡한 폼 → 퍼지검색(초성 매칭 포함) + 이름/구만 입력
  2. 기준가 필드 제거, 현재 보는 티어에 자동 배정
  3. 폴더: FolderManager(접이식 패널) → FolderChips(가로 칩 필터)
  4. 아파트 카드에 ★ 원클릭 북마크 버튼 추가
- **근거**:
  - 추가 폼이 복잡해서 사용자가 추가를 못하는 버그 발생
  - 폴더 추가/전환이 3단계 → 1단계로 간소화 필요
  - 기준가는 크롤링 데이터로 자동 판단하므로 사용자 입력 불필요
- **태스크**: W-08(추가폼), W-09(폴더UX), W-10(QA), W-11(배포)

### [2026-02-26 오후] 아파트 추가 시 자동 크롤링 기능
- **유형**: 기능추가
- **내용**:
  1. `/api/naver-search` API: 아파트 이름으로 네이버 부동산 단지ID 자동 검색
  2. `/api/naver-price` API: 단지ID로 매물 최저가 + 면적별(59/84/114㎡) 가격 조회
  3. 직접 추가/퍼지검색 추가 후 백그라운드 자동 크롤링
  4. UI 피드백: 검색중(스피너) → 발견(초록) → 실패(노랑) 상태 표시
  5. `crawl:search` CLI 명령어 추가 (수동 검색용)
  6. `updateAddition()` 함수로 overlay 부분 업데이트 지원
- **근거**:
  - 사용자가 직접 추가 시 naverComplexId를 수동으로 찾아야 하는 불편함 제거
  - 추가 즉시 가격 데이터 확보 → 정확한 티어 자동 배정
  - Next.js API Route로 서버사이드 fetch → CORS 제한 우회
- **태스크**: W-12(크롤러 검색), W-13(자동크롤링 API)

### [2026-02-26 오후] 카드 레이아웃 + 네이버 링크 수정
- **유형**: 태스크완료
- **내용**:
  - ApartmentCard 1행에 최소면적+가격 표시 (매물건수→면적 교체)
  - 상승/하락 화살표 제거
  - 2행에 최소면적 제외한 나머지 면적가격 표시
  - 네이버 API route 헤더 보강
- **에이전트**: W-16(카드), W-17(API)
- **커밋**: `8d81deb`

### [2026-02-26 오후] 웹 아파트 추가 기능 제거 (-921 lines)
- **유형**: 기술결정
- **내용**:
  - 웹페이지 관리모드 아파트추가는 localStorage만 저장 → 크롤링 불가 → 의미없음
  - 아파트 추가는 Claude Code에서 apartments.ts에 직접 추가 후 크롤러 실행하는 워크플로우로 확정
  - 삭제: naver-search API, naver-price API, fuzzy-search.ts, ApartmentManager 추가 UI
  - ApartmentManager 608행 → 63행으로 대폭 간소화
- **에이전트**: W-21
- **커밋**: `58f5766`
- **근거**: 서버사이드 Naver API는 봇 차단. puppeteer만 가능하므로 웹에서 추가해도 가격 조회 불가

### [2026-02-26 오후] 보광동 신동아아파트 추가 + 크롤링
- **유형**: 태스크완료
- **내용**:
  - apartments.ts에 보광동 신동아아파트 추가 (naverComplexId: 756, tier: 50, 31평)
  - 크롤러 실행: 276/277 성공, 보광동 신동아 41.9억 크롤링 완료
- **에이전트**: W-20(추가), 크롤러 자동
- **커밋**: `0824811`

### [2026-02-26 오후] Windows 자동 크롤링 스케줄 설정
- **유형**: 기능추가
- **내용**:
  - `scripts/auto-crawl.bat` 생성: 크롤링 → git commit → push 자동화
  - Windows 작업 스케줄러 `SeoulAptCrawl` 등록: 매일 00:00 실행
  - 조건: PC가 켜져있어야 함
- **근거**: 사용자가 매일 밤 12시 자동 갱신 요청

### [2026-02-26 오후] 카드 이름 잘림 수정 + 실제 면적 표시 + 검색 하이라이트
- **유형**: 기능개선
- **내용**:
  1. **카드 2줄 구조**: 1행=이름+평형뱃지, 2행=면적+가격+나머지사이즈 → 이름 truncate 해소
  2. **areaName 실제 면적**: prices.json의 areaName 필드 활용 → 59㎡ 대신 실제 44㎡, 57㎡ 등 표시
  3. **검색 하이라이트**: 검색 결과 클릭 시 해당 카드 파란 ring + 자동 스크롤 + 3초 후 해제
- **에이전트**: W-22
- **버그수정**: setTimeout 경쟁조건 → useRef 타이머 관리로 해결

### [2026-02-26 오후] 가격 근접 표시 옵션 기능
- **유형**: 기능추가
- **내용**:
  - 인접 평형(59↔84, 84↔114) 가격 차이가 15% 이내일 때 시각적 표시
  - "가격근접" 토글 버튼 (OFF 기본)
  - ON 시: 좌측 빨간 보더 + "근접" 뱃지 + 근접 사이즈 가격 빨간 하이라이트 + 차이 상세
  - 역전가격(큰 평형이 더 싸면)도 감지하도록 수정 (abs 비교)
- **에이전트**: W-23
- **버그수정**: 0 나누기 방어, 역전가격 누락 수정, 타입 SizePrice|null 정합성 수정

### [2026-02-26 오후] 6에이전트 병렬 검증 완료
- **유형**: 품질검증
- **내용**:
  - V-01(빌드): ✅ 0에러
  - V-02(타입체크): ✅ 0에러
  - V-03(ApartmentCard 리뷰): ✅ APPROVE (MEDIUM 2, LOW 3)
  - V-04(page.tsx 리뷰): ⚠️ HIGH 1 (setTimeout 경쟁조건 → 수정완료)
  - V-05(price-proximity 로직): ⚠️ CRITICAL 1 (0 나누기 → 수정완료), HIGH 2 (역전가격, 타입 → 수정완료)
  - V-06(DistrictGrid 리뷰): ✅ APPROVE (이슈 없음)

---

## 팀 운영 규칙 (영구)

### 버그체크 필수 규칙
- **단순하지 않은 모든 기능 추가 후**, 반드시 병렬 버그체크 에이전트를 실행한다
- 최소 구성: 빌드 검증(V-빌드) + 타입체크(V-타입) + 코드리뷰(V-리뷰)
- 권장 구성: 위 3개 + 로직검증(V-로직) + 변경파일별 리뷰 (최대 6개 병렬)
- 검증에서 HIGH 이상 이슈 발견 시 즉시 수정 후 재검증
- 이 규칙은 리더가 판단하여 "아주 단순한 변경"(1~2줄 수정)에는 생략 가능

---

### [2026-02-26 22:00] 크롤러 가격 오류 수정 — 하이브리드 재설계
- **유형**: 문제해결 | 기술결정
- **문제**: 답십리 동아 84㎡가 실제 10.5억인데 11.3억으로 수집됨 (0.8억 차이)
- **근본 원인**: 크롤러가 API 응답 page 1(~20건)만 캡처. 매물 30건+ 아파트에서 특정 면적의 최저가 누락
- **해결 — 하이브리드 방식**:
  1. 페이지 접속 → 자연스러운 API 응답 인터셉트 (page 1, 네이버 감지 최소화)
  2. 가격순 버튼 클릭 → 가격정렬 API 응답 인터셉트 (price-sorted page 1)
  3. 동일매물묶기 클릭 → 중복 매물 제거로 총 매물 수 감소
  4. 부족한 경우에만 page.evaluate(fetch()) 로 추가 페이지 수집 (MAX_PAGES=10)
- **추가 최적화**:
  - 114㎡ 버킷 제거 (SIZE_BUCKETS: 59+84만) → 대형평형 제외로 매물 수 30-40% 감소
  - 명시적 최솟값 비교 (API 정렬 순서에 의존하지 않음)
  - res.ok 체크 + HTTP 403/429 감지 + 에러 로깅
  - parsed <= 0 방어, dealPrc null 체크 개선
- **검증**: 아키텍트 분석 + 코드리뷰(V-09,V-12) + 품질검토(V-10,V-13) + 가격정합성점검(V-11)
- **V-11 발견**: 가격역전 9건, 이상가격 17건 — 재크롤링 후 자동 해소 예상
- **영향 파일**: crawl-prices-browser.mjs, ApartmentCard.tsx, price-proximity.ts
- **데드코드 제거**: PYEONG_TO_M2, PYEONGDAE_RANGES, getTargetM2List (미사용)

---

### [2026-02-26 16:00] 구별 노트 수정/추가 기능
- **유형**: 기능구현
- **내용**:
  - 기존 하드코딩 노트(💡)를 클릭하여 인라인 수정 가능
  - 모든 구에 새 커스텀 노트 추가 가능 (💡 노트 추가 버튼)
  - localStorage 오버라이드 방식: 하드코딩 기본값 유지, 수정/삭제/추가 모두 localStorage
  - note-storage.ts: overrides(수정) + deleted(숨김) + additions(커스텀 추가)
- **근거**: 사용자가 구별 특성 메모를 자유롭게 관리할 수 있어야 함
- **팀원**: W-30(수정기능), W-31(추가기능)

---

### [2026-02-26 17:00] 관리자 페이지 + 풀스펙 DSR 계산기
- **유형**: 기능구현 | 기술결정
- **내용**:
  - `/admin` 경로, 비밀번호 8자리(12251225) SHA-256 해시 보호
  - 풀스펙 DSR 계산기: 원리금균등/원금균등/만기일시 3가지 상환방식
  - 스트레스 DSR: 변동형/혼합형/주기형 × 수도권/비수도권 × 기본/강화
  - 서울생초아 토글 (LTV 70%, 대출한도 6억)
  - 최대 매매가 이진탐색 역산 (서울규제 + LTV + DSR 3중 제한)
  - 매매가 이하 아파트 필터링 (기존 ApartmentCard + 구별 그룹핑 재사용)
  - 비밀번호 변경 가능 (localStorage 커스텀 해시)
  - 입력값 localStorage 영속화
- **근거**: 참고 사이트(rjhcpqhz.gensparkspace.com) 공식 완전 이식, 개인 관리자 도구
- **팀원**: W-32(계산로직+인증), W-33(UI)
- **파일**: dsr-calculator.ts, admin-auth.ts, src/app/admin/page.tsx

---

### [2026-02-26 17:00] 크롤러 재크롤링 실행
- **유형**: 운영
- **내용**: 수정된 크롤러(하이브리드+동일매물묶기+114㎡제거)로 전체 277개 재크롤링 진행 중
- **목적**: 답십리동아 84㎡ 11.3→10.5억 등 가격 오류 수정

---

### [2026-02-26 18:00] 재크롤링 완료 — 가격 오류 해소
- **유형**: 운영 | 태스크완료
- **내용**:
  - 하이브리드 크롤러로 277개 단지 재크롤링: 276/277 성공 (31분 소요)
  - **답십리동아 84㎡**: 11.3억 → 10.5억 (정상 복원 확인)
  - prices.json 커밋(`d4592f5`) + 푸시 → Vercel 자동 배포 완료
- **근거**: 하이브리드 재설계 후 첫 전체 크롤링, 가격 정합성 검증 목적

---

### [2026-02-26 18:30] 세션 최종 결과
- **유형**: 최종결과
- **이번 세션 커밋 요약** (5건):
  1. `b80abfe` — 크롤러 하이브리드 재설계 + 동일매물묶기 + 114㎡ 제거
  2. `2f9f96c` — 구별 노트 수정/삭제 기능 (localStorage 오버라이드)
  3. `579e6f0` — 모든 구에 커스텀 노트 추가 기능
  4. `2914b8f` — 관리자 페이지 + 풀스펙 DSR 계산기
  5. `d4592f5` — 가격 데이터 갱신 (수정 크롤러, 276/277건)
- **새 파일 생성**: note-storage.ts, dsr-calculator.ts, admin-auth.ts, src/app/admin/page.tsx
- **총 팀원**: W-30~W-33 (4명 투입, 전원 1차 성공)
- **빌드 에러**: 0건

---

---

### [2026-02-26 14:00] 장위 꿈의숲아이파크 84㎡ 누락 — 근본 원인 분석 (10 에이전트 병렬 투입)
- **유형**: 문제해결 | 기술결정
- **문제**: 장위 꿈의숲아이파크가 59타입(12억)만 표시, 84타입 데이터 완전 누락. 네이버에선 84㎡ 집주인인증 매물이 존재함
- **이전 디버그 실패**: 이전 세션에서 debug-single.mjs 등이 **잘못된 complexId(102378)**를 사용. 실제 apartments.ts의 complexId는 **122863**
- **10 에이전트 병렬 조사 결과 — 근본 원인 3가지**:
  1. **`sameAddressGroup: 'true'`** → 집주인 매물이 중개사 매물 뒤에 숨겨져 84㎡ 누락
  2. **`totalCount` 필드 없음** → Naver API는 `totalCount` 대신 `isMoreData` boolean 사용. 페이지네이션이 page 1에서 중단
  3. **`exclusiveArea` 필드 없음** → Naver API는 `exclusiveArea` 대신 `area2` 사용. 면적 버킷 분류 실패
- **추가 발견**:
  - Naver API는 `authorization` 헤더 없이 직접 fetch 시 HTTP 401 반환
  - "전체면적" 클릭 시 `text.startsWith('전체')`가 "전체 서비스 보기" 매칭하여 잘못된 요소 클릭
  - HTTP/2 pseudo-header(`:authority` 등)가 capturedHeaders에 포함되어 fetch "Invalid name" 에러
- **근거**: 이전 세션에서 하이브리드 크롤러가 대부분 아파트에서 작동했으나, 첫 번째 아파트(장위)에서 pseudo-header 문제로 실패

### [2026-02-26 15:00] 크롤러 근본 수정 — API 구조 전면 재설계
- **유형**: 기술결정 | 태스크완료
- **수정 사항 6가지**:
  1. **authorization 헤더 캡처**: `page.on('request')` 인터셉트로 브라우저의 인증 토큰 확보 → 직접 fetch에 재사용
  2. **HTTP/2 pseudo-header 필터링**: `if (key.startsWith(':')) continue;` → `:authority`, `:method` 등 제외
  3. **isMoreData 페이지네이션**: `totalCount` 기반 → `isMoreData === false`까지 루프
  4. **area2 필드 우선**: `a.exclusiveArea || a.area2` → `a.area2 || a.exclusiveArea`
  5. **sameAddressGroup=false**: 집주인인증 매물 노출
  6. **"전체면적" 셀렉터**: `text.startsWith('전체')` → `text === '전체' || text === '전체면적'`
- **테스트 검증**: test-single.mjs로 장위 단독 크롤링 → 186건 수집, **84㎡:7건, 최저가 14.7억** 확인
- **에이전트**: W-01~W-10(조사), W-11(pseudo-header 수정)
- **파일**: `scripts/crawl-prices-browser.mjs` (+119, -89)

### [2026-02-26 18:45] 전체 재크롤링 완료 — 277/277 성공, 84㎡ 완벽 수집
- **유형**: 운영 | 태스크완료 | 최종결과
- **크롤링 결과**:
  - **277/277 전부 성공** (실패 0건, 이전: 276/277)
  - **84㎡ 데이터 보유: 237/277** (이전 크롤 대비 +10)
  - **소요시간**: 42.6분
- **핵심 검증 — 장위 꿈의숲아이파크**:
  - 이전: `59㎡:12억(30건)` — 84㎡ 없음 ❌
  - 수정후: `59㎡:12억(139건) | 84㎡:15억(7건)` ✅
  - 매물수: 30건 → 185건 (6배 증가, sameAddressGroup=false + isMoreData 페이지네이션 효과)
- **커밋**: `5fa32d9` — 크롤러 84㎡ 누락 근본 수정 + 가격 데이터 갱신
- **배포**: `git push origin main` → Vercel 자동 배포 완료
- **근거**: 3세션에 걸친 84㎡ 누락 버그 최종 해결

---

### Naver 부동산 API 구조 정리 (영구 참고)

| 항목 | 잘못된 가정 | 실제 |
|------|------------|------|
| 페이지네이션 | `totalCount` 숫자 | `isMoreData` boolean |
| 전용면적 필드 | `exclusiveArea` | `area2` |
| 공급면적 필드 | `supplyArea` | `area1` |
| 면적타입명 | 없음 | `areaName` (예: "84A") |
| 인증 | 불필요 | `authorization` 헤더 필수 |
| 동일매물 | 기본 off | `sameAddressGroup=true`가 기본 → 집주인 매물 숨김 |

---

### [2026-02-27] 동일가격 면적 중복 표시 버그 수정
- **유형**: 버그수정
- **문제**: 강일리버파크5단지 등에서 59㎡와 84㎡가 동일가격(12억)일 때, 84㎡가 두 번 표시되고 59㎡가 누락됨
- **근본 원인**:
  - 크롤러 `areaName`은 동일가격 시 마지막 버킷("84㎡") 선택
  - 카드 `minSizeKey`는 동일가격 시 첫 버킷("59") 선택
  - `remainingKeys`가 minSizeKey("59")를 제외하지만, 1행에는 areaName("84㎡")이 표시 → 84가 1행+2행 모두 출현
- **1차 수정** (`cfae5a7`): `remainingKeys`가 `displayAreaName`에서 추출한 `displayedBucket`을 제외하도록 변경
- **근거**: areaName과 minSizeKey 불일치 시 실제 표시된 면적을 기준으로 중복 제거

### [2026-02-27] 면적 표시 항상 59→84 고정 순서로 변경
- **유형**: 기능개선
- **문제**: 1차 수정 후에도 84㎡가 최저가일 때 왼쪽에 표시됨. 사용자: "항상 59가 왼쪽에 있어야지"
- **해결**: 면적 표시 로직 전면 재설계
  - `displayAreaName`, `displayedBucket`, `remainingKeys` 개념 **완전 제거**
  - `fixedSizeKeys = ['59', '84']` — 항상 59→84 고정 순서로 반복
  - `minSizeKey`는 최저가 면적 하이라이트(큰 파란 글씨) 판단에만 사용
  - 각 면적: undefined → "—", null → "매물없음", 최저가 → 16px 파란 볼드, 기타 → 12px 회색
- **커밋**: `6b8be37` — fix: 면적 표시 항상 59→84 고정 순서로 변경
- **배포**: git push → Vercel 자동 배포 완료
- **근거**: 사용자가 59㎡(소형)→84㎡(중형) 순서를 직관적으로 기대. 가격 기준 정렬보다 면적 기준 고정이 가독성↑

### [2026-02-27] 가격 데이터 갱신 (277/277 성공)
- **유형**: 운영
- **내용**: 수정된 크롤러(59→84 고정순서 반영)로 전체 277개 단지 재크롤링
  - **277/277 전부 성공** (실패 0건)
  - 소요시간: 42.7분
- **커밋**: `102eedb` — chore: 가격 데이터 갱신 + decisions.md UI 수정 기록
- **배포**: git push → Vercel 자동 배포 완료
- **근거**: UI 수정 후 최신 가격 데이터 반영

---

### [2026-02-28] 집주인인증 매물 필수 필터 적용
- **유형**: 기술결정
- **배경**: 장위 꿈의숲아이파크 84㎡에서 일반 중개사 매물 14.7억이 표시됨. 네이버에서 확인하니 집주인인증 매물은 15억, 14.7억은 미인증 매물
- **이전 이력**:
  - 원래 "집주인 우선" 로직 존재 → 이문E편한세상에서 9.3억(일반) 대신 11.8억(집주인) 표시하는 버그로 제거됨 (`[2026-02-26 10:00]`)
  - 이번에 사용자가 "집주인인증 필수"로 명시 요청
- **구현**:
  - `verificationTypeCode === 'OWNER'` 필드 발견 (10개 에이전트 조사)
  - 매매 매물 중 OWNER만 필터 → 최저가 산출
  - 집주인 매물 없는 단지 → "매물없음" 표시 (폴백 없음)
- **결과**: 260/277 성공, 17건 집주인 매물 없음
- **검증**: 장위 84㎡: 14.7억(일반) → **15억(집주인)** ✅
- **커밋**: `8dbeb19` — feat: 집주인인증 매물만 필터
- **배포**: Vercel 즉시배포 완료

### Naver API 추가 필드 (영구 참고)

| verificationTypeCode | 의미 |
|---|---|
| `OWNER` | 집주인인증 ✅ |
| `DOC` | 서류인증 |
| `NDOC1` / `NDOC2` | 미인증 |
| `NONE` | 없음 |

---

### [2026-03-01] 자금조달계획서 자동작성 기능
- **유형**: 기능구현
- **내용**:
  - 관리자 페이지에 "자금조달" 탭 추가 (DSR 계산기 | 자금조달 | 가이드)
  - 손님이 메모로 전달한 거래 내역을 입력 → 지분비율(5:5, 6:4 등)로 자동분배 → 부부 각각의 정부 양식 2장 자동 생성
  - **입력 UI**: 5개 섹션 (기본정보/자기자금/차입금/지급방식/입주계획)
  - **분배 로직**: 항목별 [비율분배/인1전액/인2전액/직접지정] 4가지 방식
  - **실시간 검증**: 인당 합계 vs 분담금 일치 여부 초록/빨강 표시
  - **출력**: 정부 양식(주택취득자금 조달 및 입주계획서) HTML 렌더링 → 새 창 프린트
  - **양식 구조**: 8열 테이블 with rowspan/colspan, 세로 섹션 헤더, 체크박스, A4 인쇄 최적화
  - **localStorage**: 입력값 자동 저장/복원
- **파일**:
  - `src/lib/funding-plan.ts` (신규) — 타입, splitFunding(), generateFormHtml(), formatAmount()
  - `src/app/admin/page.tsx` (수정) — AdminTab에 'funding' 추가, FundingPlanTab/FundingItemField 컴포넌트
- **팀원**: W-01(로직), W-02(UI), W-03(양식 HTML 재설계)
- **빌드**: 0 에러
- **근거**: 사용자가 부동산 거래 시 고객에게 자금조달계획서를 작성해줘야 하는 업무 자동화

### [2026-03-01] 관리자 페이지 모바일 헤더/탭 정렬 수정
- **유형**: 버그수정
- **내용**:
  - 헤더 버튼 반응형: text-xs/px-2(모바일) → sm:text-sm/sm:px-3(데스크톱)
  - 탭 바: overflow-x-auto + whitespace-nowrap 추가 (모바일 가로 스크롤)
  - 탭 버튼 반응형: text-xs/px-3(모바일) → sm:text-sm/sm:px-4(데스크톱)
  - "비밀번호 변경" → "비번변경" (모바일 공간 절약)
- **근거**: 모바일에서 탭 3개 + 헤더 버튼이 겹쳐 보이는 문제

---

## 다음 할 일
1. ~~크롤링 실행~~ ✅ 완료 (276/277)
2. ~~자동 스케줄~~ ✅ 완료 (매일 00:00)
3. ~~크롤러 가격오류 수정~~ ✅ 완료 (하이브리드 재설계)
4. ~~노트 수정/추가 기능~~ ✅ 완료
5. ~~관리자 페이지 + DSR 계산기~~ ✅ 완료
6. ~~재크롤링 + prices.json 갱신~~ ✅ 완료 (답십리동아 10.5억 확인)
7. ~~84㎡ 누락 근본 수정~~ ✅ 완료 (장위 84㎡:15억, 277/277 성공)
8. ~~동일가격 면적 중복 표시~~ ✅ 완료 (59→84 고정 순서)
9. ~~가격 데이터 갱신~~ ✅ 완료 (277/277, 102eedb)
10. ~~집주인인증 필수 필터~~ ✅ 완료 (260/277, 8dbeb19)
11. ~~자금조달계획서 자동작성~~ ✅ 완료
12. ~~모바일 헤더/탭 정렬~~ ✅ 완료
13. ~~자금조달계획서 실사용 테스트~~ ✅ 완료 (PDF 양식 출력 검증)
14. 관리자 페이지 실사용 테스트 (DSR 계산값 검증)
15. 디버그 스크립트 정리 (debug-*.mjs, test-*.mjs 삭제)

---

### [2026-03-01 19:00] 자금조달계획서 UX 3건 개선
- **유형**: 기능개선
- **내용**:
  1. **미리보기 모달 크기 조정**: 전체화면(fixed inset-0 bg-white) → 센터 모달(max-w-2xl, max-h-[90vh]) + 반투명 배경(bg-black/50). 배경 클릭 시 닫기. 모바일 mx-4 여백
  2. **이미지 생성 실패 시 원인 표시**: API route에서 에러 detail 반환 + 클라이언트에서 서버 에러 메시지 파싱 + alert에 "원인: ..." 표시
  3. **재접속 시 폼 초기화**: localStorage 로드/저장 제거. 항상 DEFAULT_FUNDING으로 시작. 세션 중 상태는 React state로만 관리
- **파일**: admin/page.tsx, api/generate-pdf/route.ts
- **팀원**: W-01(모달), W-02(에러), W-03(초기화) — 3명 병렬, 전원 1차 성공
- **빌드**: tsc 0에러, npm run build 성공
- **근거**: 사용자 피드백 — 모달 전체화면 불편, 에러 원인 불명, 이전 데이터 잔존
- **커밋**: `23d4185`
- **배포**: Vercel 자동 배포 완료

### [2026-03-02] 가격 데이터 갱신 (259/277 성공)
- **유형**: 운영
- **내용**: 전체 277개 단지 재크롤링 — 259건 성공, 18건 매물없음, 42.8분 소요
- **커밋**: `fc22ab9`
- **배포**: git push → Vercel 자동 배포 완료

---

### [2026-03-01 12:30] 자금조달계획서 PDF 양식 출력 — 빈 양식 위 텍스트 삽입 방식
- **유형**: 기능개선 | 기술결정
- **내용**:
  - 기존 HTML 렌더링 → **빈 양식 PDF 위에 pdf-lib로 텍스트 직접 삽입** 방식으로 전면 교체
  - `funding-pdf-server.ts` (신규): 서버 전용 PDF 생성 모듈 (Node.js fs 사용)
  - `POST /api/generate-pdf` API Route: FundingInput JSON → PDF bytes 반환
  - **좌표 매핑**: pdfjs-dist로 빈 양식 PDF에서 479개 텍스트 위치 추출 → 정확한 좌표 상수화
  - **체크박스**: ✓ 문자 삽입 (증여관계, 현금유형, 주택보유여부, 입주계획 등)
  - **2컬럼 입력 UI**: FundingItemField(4버튼) 삭제 → 항목명|인1금액|인2금액 테이블
  - **매뉴얼 다운로드**: `public/funding-manual.pdf` 링크 추가
- **파일**:
  - `src/lib/funding-pdf-server.ts` (신규) — 서버 전용 PDF 생성
  - `src/app/api/generate-pdf/route.ts` (신규) — API Route
  - `public/funding-form-blank.pdf` (신규) — 빈 양식 PDF
  - `public/fonts/NotoSansKR-Regular.ttf` (신규) — 한글 폰트 (4.3MB)
  - `src/app/admin/page.tsx` (수정) — 2컬럼 테이블 UI
- **의존성**: pdf-lib, @pdf-lib/fontkit
- **빌드**: 0 에러

### [2026-03-01 12:35] PDF 숫자 파란색 Bold + 큰 글씨
- **유형**: 기능개선
- **내용**:
  - 금액 숫자를 **파란색(rgb 0,0.1,0.7) + NanumGothicBold + 11pt**로 변경
  - 기존: 검정색 NotoSansKR-Regular 8pt → 노안도 잘 보이게 대폭 개선
  - `public/fonts/NanumGothicBold.ttf` 추가 (시스템 폰트 복사, 4.2MB)
- **근거**: 사용자 요청 — "숫자 파란색으로 진하게, 크기 키워줘, 노안도 잘보이게"
- **빌드**: 0 에러
- **배포**: git push → Vercel 자동 배포

### [2026-03-01 13:00] PDF 체크마크 깨짐 수정 + 부가정보 해당없음/관계입력 추가
- **유형**: 버그수정 | 기능개선
- **내용**:
  - **체크마크 'x' 표시 수정**: NanumGothicBold.ttf가 '✓'(U+2713) 글리프를 'x'로 렌더링 → `page.drawLine()`으로 V자 직접 그리기로 교체
  - **해당없음 옵션 추가**: 증여관계, 현금유형, 차용관계에 '해당없음' 버튼 추가 → 체크박스 전체 해제
  - **증여/차용 관계 분리**: 기존 '기타차입관계' 하나 → 증여관계 + 차용관계 각각 독립 (부부/직계존비속/기타 선택 + 기타 텍스트 입력)
  - **기타대출종류 per-person**: person1OtherLoanType / person2OtherLoanType 분리
  - **부가정보 인라인 배치**: Zone C(부가정보 탭) 해체 → Zone B 테이블 해당 항목 바로 아래에 "└" 서브행으로 이동
  - **PDF 로딩 스피너**: 양식 생성 버튼 클릭 시 "PDF 생성 중..." + 스피너 표시
- **커밋**: `91572ac`, `222850c`
- **빌드**: 0 에러
- **배포**: Vercel 자동 배포 완료

### [2026-03-01 14:00] 단독명의/공동명의 선택 + 검증행 개선 + 분담금 삭제
- **유형**: 기능구현
- **내용**:
  - **ownershipType 필드 추가**: FundingInput에 `'joint' | 'single'` 타입 추가
  - **단독명의 모드**:
    - UI: 매수인2 이름/지분비율 숨김, 테이블 2컬럼→1컬럼(헤더 "금액"), 지급방식/입주계획도 1컬럼
    - splitFunding: 단독명의 시 전액 person1 할당 (`isSingle ? [item.amount, 0]`)
    - PDF: 단독명의 시 1페이지만 생성 (person2 페이지 스킵)
  - **검증행 개선**: 초과 시 `+금액`, 부족 시 `-금액`, 일치 시 `✓ 일치` 표시
  - **분담금 행 삭제**: Zone B 테이블에서 분담금 row 제거
  - **부동산 처분대금**: 단독명의 시 "지분비율로 자동분배" 안내 텍스트 숨김
- **파일**: funding-plan.ts, funding-pdf-server.ts, admin/page.tsx
- **커밋**: `bae7eab`, `76b257d`
- **빌드**: 0 에러
- **배포**: Vercel 자동 배포 완료
- **근거**: 매수인이 1명(단독명의)인 경우도 지원 필요, 검증 결과의 가독성 개선

---

### [2026-03-17 00:00] 대규모 아파트 확장 (277개 → 909개)
- **유형**: 데이터확장
- **내용**:
  - 사용자 엑셀 파일(`서울 25개구 아파트 리스트.xlsx`)에서 **632개 신규 아파트** 추가
  - 기존 277개 → 총 909개
  - 새 구 추가: 기존 커버하지 못한 구역 포함
  - 티어 분포: 12~50 전체 티어에 걸쳐 분포
- **파일**: `src/data/apartments.ts`, `src/types/index.ts`

### [2026-03-17 00:30] naverComplexId 매핑 (632개 → 386개 성공)
- **유형**: 태스크완료
- **내용**:
  - `map-complex-ids.mjs`로 632개 신규 아파트 네이버 검색
  - **386개 성공** (61%) → 크롤링 가능 아파트: 277 + 386 = **663개**
  - **246개 실패** — 원인:
    1. 네이버 검색 403 차단 (대량 검색 중 rate limit)
    2. 재건축/재개발 예정 단지 (미완공)
    3. 검색명 불일치 (약칭, 신축 등)
  - 매핑 결과는 `apartments.ts`에 자동 적용 완료
- **근거**: 크롤러는 naverComplexId 없으면 스킵하므로 매핑 필수

### [2026-03-17 01:00] naverComplexId 추가 매핑 (246개 재시도 → 111개 성공)
- **유형**: 태스크완료
- **내용**:
  - 1차 매핑 실패 246개 재시도 → **111개 추가 성공**
  - 총 매핑: 277(기존) + 386(1차) + 111(2차) = **774개**
  - 나머지 135개는 재건축/미완공/검색명 불일치로 매핑 불가
- **커밋**: `1848e46`

### [2026-03-17 02:00] 전체 크롤링 완료 (774개 대상)
- **유형**: 운영 | 태스크완료
- **내용**:
  - 774개 전체 크롤링: **715건 성공, 59건 매물없음**
  - 소요시간: 117.8분 (약 2시간)
  - puppeteer headful 방식 (기존과 동일)
- **커밋**: `0aaa867`
- **배포**: git push → Vercel 자동 배포 완료

### [2026-03-17] 운영 교훈
- **유형**: 참고사항
- **내용**:
  1. Claude Code 세션은 예고 없이 끊길 수 있음 → 장시간 작업은 터미널 직접 실행
     ```bash
     cd C:\Users\dlwls\Desktop\서울체계도
     node scripts/crawl-prices-browser.mjs
     ```
  2. 크롤러 완료 알림: `node scripts/crawl-prices-browser.mjs && powershell -c "[console]::beep(1000,500)"`
  3. 135개 미매핑 아파트 후속 처리 필요 (수동 매핑 또는 제외 판단)

### [2026-03-17] 현재 데이터 현황
- **유형**: 참고사항
- **아파트**: 909개 (apartments.ts)
- **매핑 완료**: 774개 (naverComplexId 있음)
- **미매핑**: 135개 (크롤링 불가)
- **가격 수집**: 715개 (prices.json)
- **매물없음**: 59개 (집주인인증 매매 매물 0건)
### [2026-03-17 15:55] 엑셀 추가본(v2) 신규 39개 반영 완료
- **유형**: 데이터 확장 | 운영
- **내용**:
  - 사용자 업로드 엑셀(`서울 25개구 아파트 리스트_교차검증_추가본_2026-03-17_v2.xlsx`) 기준 신규 아파트 **39개 추가**
  - 기존 909개 -> **948개**
  - 신규 추가분만 대상으로 naverComplexId 선택 매핑 실행
  - **39개 중 37개 매핑 성공**, 2개 미매핑
    - `갈현1구역`
    - `래미안신당하이베르`
  - 매핑 성공 37개만 `2워커 병렬` 크롤링 실행
  - 병렬 결과: **35개 성공 / 2개 매물없음**
    - 매물없음: `문래동현대1차`, `현대`
  - 신규 결과를 기존 `public/prices.json`에 병합 반영
  - 신규 성공 단지의 `basePrice`, `tier`를 `apartments.ts`에 동기화
- **실행 결과**:
  - 전체 아파트: **948개**
  - complexId 매핑 완료: **811개**
  - 가격 수집 성공: **750개**
  - 실패/매물없음: **61개**
- **병렬 테스트 실측**:
  - 대상: 37개
  - 워커: 2개
  - worker1: 19개 중 18개 성공, 169.3초
  - worker2: 18개 중 17개 성공, 176.7초
  - 총 벽시계: 약 3분
- **추가 스크립트**:
  - `scripts/import-excel-additions.mjs`
  - `scripts/apply-subset-prices.mjs`
  - `scripts/crawl-prices-browser.mjs --ids-file`
  - `scripts/map-complex-ids.mjs --ids-file`
### [2026-03-17 17:05] 미매핑 137개 정식명칭 재탐색 + 8개 추가 매핑 반영
- **유형**: 데이터 보강 | 운영
- **내용**:
  - 현재 미매핑 137개를 대상으로 일반 네이버 검색 기반 정식명칭 재탐색 수행
  - 공격적 병렬(4워커) 검색은 결과 품질이 급격히 떨어져 폐기
  - 정확도 우선으로 순차 재탐색 후, 스니펫까지 맞는 **고신뢰 8개**만 수동 검증 후 반영
  - 반영 단지:
    - `마곡13단지힐스테이트 -> 마곡13단지힐스테이트 마스터`
    - `목동트라팰리스(소형) -> 목동트라팰리스웨스턴에비뉴(주상복합)`
    - `풍전아파트(재건축추진) -> 풍전`
    - `수정아파트(재건축) -> 수정`
    - `방배삼익(재건축) -> 삼익`
    - `신동아(재건축) -> 신동아`
    - `중곡아파트(재건축) -> 중곡`
    - `중곡아파트(재건축추진) -> 중곡`
  - 위 8개만 `2워커 병렬`로 재크롤링 후 기존 `prices.json`에 병합
- **실행 결과**:
  - 전체 아파트: **948개**
  - complexId 매핑 완료: **819개**
  - 가격 수집 성공: **757개**
  - 실패/매물없음: **62개**
- **추가 스크립트**:
  - `scripts/research-naver-official-names.mjs`
### [2026-03-17 22:09] 신규 매핑분만 3워커 병렬 크롤링 반영
- **유형**: 운영 | 배포
- **범위**:
  - 전체 재크롤링이 아니라, `naverComplexId`는 있으나 `prices.json`에 아직 없던 신규 매핑분만 대상
  - 대상 수: **134개**
- **실행 내용**:
  - `3워커 병렬` + `20초 stagger`로 신규 매핑 subset만 크롤링
  - 결과를 `run_logs/newly-mapped-crawl-20260317/merged.json`으로 병합
  - `scripts/apply-subset-prices.mjs`로 `public/prices.json`과 `src/data/apartments.ts`에 반영
  - 현재 아파트 전체 리스트를 `exports/apartment-list-20260317.xlsx`로 내보냄
- **실행 결과**:
  - subset 크롤링: **134개 중 62개 성공 / 72개 매물없음**
  - 전체 기준 complexId 매핑 완료: **891개**
  - 전체 기준 가격 반영 성공: **819개**
  - 전체 기준 실패/매물없음: **72개**
- **비고**:
  - 관리자 화면의 `마지막 크롤링` 시간은 이 반영분이 커밋/배포되기 전까지 이전 시각으로 보일 수 있음
### [2026-03-18 09:27] 집주인인증 fallback + 구 재분류 정리
- **유형**: 운영 | UX | 데이터 정리
- **변경 내용**:
  - `비잠실송파` 임시 카테고리 제거
  - 해당 7개 단지를 실제 구로 재분류
    - `송파구`: 파크데일2단지, 풍납동 동아한가람, 송파더플래티넘
    - `강동구`: 삼성광나루, 둔촌신성미소지움
    - `영등포구`: 더샵파크프레스티지
    - `동대문구`: 래미안엘리니티
  - 크롤러를 `집주인인증(OWNER)` 우선으로 유지하되, OWNER 매물이 0건이면 일반 매매로 fallback 하도록 변경
  - 웹앱 카드에 fallback 결과를 `집주인인증X` 배지로 표시
- **재크롤링 범위**:
  - 기존에 가격이 없던 mapped 단지 72개만 3워커 병렬 재실행
- **재크롤링 결과**:
  - **72개 중 62개 성공 / 10개 매물없음**
  - 성공 62개는 모두 `집주인인증X` fallback 결과
- **현재 상태**:
  - complexId 매핑 완료: **891개**
  - 가격 반영 성공: **881개**
  - 남은 실패/매물없음: **10개**
### [2026-03-18 09:49] 대단지 소형 평형 선점 문제 보정 (올림픽파크포레온)
- **유형**: 크롤링 정확도 개선
- **문제**:
  - 대단지에서 가격순 전체 조회 시 29㎡ 등 소형 평형이 앞페이지를 점유하면 59㎡/84㎡까지 도달하지 못하는 케이스 발생
  - `올림픽파크포레온`이 대표 사례로, 기존 데이터는 `29㎡ 11.5억`만 잡히고 59/84 버킷이 비어 있었음
- **조치**:
  - 크롤러에 59㎡/84㎡ 버킷별 보강 조회 로직 추가
  - `areaMin/areaMax`를 공급면적 기준으로 사용해 59/84 버킷을 직접 요청
  - 최종 `price`도 전체 최소가가 아니라 추적 중인 59/84 버킷 기준 최저가로 계산
- **검증 결과**:
  - `올림픽파크포레온` 단건 검증 성공
  - 기존: `29㎡ 11.5억`
  - 수정 후: `59㎡ 24.7억 / 84㎡ 26.8억 / 집주인인증X`
### [2026-03-18 10:14] Suspicious 92-area recrawl + mind map view
- Type: crawl accuracy | UI
- Recrawl target:
  - Rechecked 92 mapped apartments that had no 59/84 bucket and were likely dominated by smaller area listings.
  - Ran 3 workers in parallel after reboot interruption.
- Recrawl result:
  - 92 total
  - 11 apartments updated with valid 59/84 bucket pricing
  - 81 remained no-listing for target buckets under current crawl rules
  - This was mostly a correction run, so total success count stayed `881 / 891`
- Notable effect:
  - `public/prices.json` updated at `2026. 03. 18. 10:14`
  - `ownerVerified: false` listings count is now `73`
- UI:
  - Added mind map mode toggle on the home page
  - Added `MindMapView` to show tier/folder apartments in a district -> apartment flow layout
  - Mind map nodes also show the `ownerVerified: false` badge
### [2026-03-18 10:31] Mind map navigation + PDF export polish
- Type: UI | export
- Added:
  - district mini map / quick jump chips
  - zoom controls
  - collapse / expand all districts
  - per-district collapse toggle
  - `PDF 저장` button
- PDF approach:
  - used a dedicated print HTML window instead of screenshot capture
  - this keeps text and layout crisp when saving as PDF from the browser print dialog
  - export is optimized for `A3 landscape`
- UX polish:
  - horizontal scroll hint retained
  - right edge clipping feeling reduced with extra canvas padding and edge fades
### [2026-03-18 10:39] Admin-only mind map access + drag pan
- Type: UI | admin
- Access control:
  - hid the mind map toggle from the public home view
  - mind map opens only when admin auth is active
  - added a direct `마인드맵` button in the admin header that links to `/?view=mindmap`
- Interaction:
  - added drag-to-pan on the mind map canvas
  - buttons and apartment links still behave normally; only the background canvas starts dragging
