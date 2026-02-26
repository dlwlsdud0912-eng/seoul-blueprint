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
