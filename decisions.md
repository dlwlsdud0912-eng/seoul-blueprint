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
