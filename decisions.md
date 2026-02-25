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
