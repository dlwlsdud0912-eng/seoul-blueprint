import Link from 'next/link';

export const metadata = {
  title: '아파트 추가 가이드 — 서울 아파트 체계도',
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-[#e8e5e0]">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#37352f]">아파트 추가 & 크롤링 가이드</h1>
          <Link href="/" className="text-[12px] text-[#2383e2] hover:underline">
            체계도로 돌아가기
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex flex-col gap-8">

          {/* 1. 아파트 추가 방법 */}
          <section>
            <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">1</span>
              아파트 추가하기
            </h2>
            <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
              <p>
                <strong>파일 위치:</strong>{' '}
                <code className="bg-[#f1f1ef] px-1.5 py-0.5 rounded text-[12px]">src/data/apartments.ts</code>
              </p>
              <p>아래 형식으로 배열에 새 항목을 추가합니다:</p>
              <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`{
  id: 'district-name-unique',      // 고유 ID (영문, 하이픈)
  name: '아파트이름',               // 표시 이름
  district: '강남구',               // 구 이름 (types/index.ts의 District 타입 참조)
  size: '34평',                     // 평형 (24평, 34평, 43평 등)
  basePrice: 15.5,                  // 기준가 (억 단위)
  tier: '14',                       // 티어 ('10','12','14','16','18','20','22','24','26','28','30','32','50')
  naverComplexId: '12345',          // 네이버 부동산 단지 ID (필수!)
}`}</pre>
              <div className="bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-3 py-2 text-[11px] text-[#8b6914]">
                <strong>naverComplexId 찾는 법:</strong> 네이버 부동산에서 아파트 검색 → URL에서 complexes/ 뒤의 숫자가 ID입니다.
                <br/>
                예: <code className="bg-[#f1e5bc]/50 px-1 rounded">new.land.naver.com/complexes/<strong>113059</strong></code> → ID는 113059
              </div>
            </div>
          </section>

          {/* 2. 크롤링 실행 */}
          <section>
            <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">2</span>
              가격 크롤링 실행
            </h2>
            <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
              <p>터미널에서 아래 명령어를 실행합니다:</p>
              <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`npm run crawl:browser`}</pre>
              <ul className="list-disc ml-5 flex flex-col gap-1.5 text-[12px] text-[#787774]">
                <li>Chrome 창이 자동으로 열리며 각 아파트 페이지를 순회합니다</li>
                <li>약 277개 단지 × 4초 = 약 18분 소요</li>
                <li>결과는 <code className="bg-[#f1f1ef] px-1 rounded">public/prices.json</code>에 저장됩니다</li>
                <li>크롤링 중 Chrome 창을 닫지 마세요!</li>
              </ul>
              <div className="bg-[#dbeddb] border border-[#b8d8b8] rounded-md px-3 py-2 text-[11px] text-[#0f7b6c]">
                <strong>참고:</strong> headless 모드가 아닌 실제 Chrome 창을 사용합니다 (네이버 봇 감지 우회).
                Stealth 플러그인이 자동 적용됩니다.
              </div>
            </div>
          </section>

          {/* 3. 배포 */}
          <section>
            <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">3</span>
              배포하기
            </h2>
            <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
              <p>크롤링 완료 후 Git push만 하면 Vercel이 자동 배포합니다:</p>
              <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`git add public/prices.json
git commit -m "chore: 가격 데이터 갱신"
git push`}</pre>
              <p className="text-[12px] text-[#787774]">
                아파트를 새로 추가한 경우에는 <code className="bg-[#f1f1ef] px-1 rounded">src/data/apartments.ts</code>도 함께 커밋합니다.
              </p>
            </div>
          </section>

          {/* 4. 노트 추가 */}
          <section>
            <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">4</span>
              노트 추가 (선택)
            </h2>
            <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
              <p>
                <strong>파일 위치:</strong>{' '}
                <code className="bg-[#f1f1ef] px-1.5 py-0.5 rounded text-[12px]">src/data/notes.ts</code>
              </p>
              <p>구 단위 노트 또는 개별 아파트 노트를 추가할 수 있습니다:</p>
              <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`// 구 단위 노트
{ tier: '14', content: '길음이 요즘 핫함', district: '성북구' },

// 개별 아파트 노트
{ tier: '14', content: '세대수 461, 흐름 좋음', apartmentId: 'some-apt-id' },`}</pre>
            </div>
          </section>

          {/* 5. 즐겨찾기 폴더 */}
          <section>
            <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">5</span>
              즐겨찾기 폴더 사용법
            </h2>
            <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
              <ul className="list-disc ml-5 flex flex-col gap-1.5 text-[12px] text-[#787774]">
                <li>메인 페이지 상단의 <strong>"+ 새 폴더"</strong>로 폴더 생성 (예: 고객명)</li>
                <li>각 아파트 카드 왼쪽의 폴더 아이콘을 클릭하여 폴더에 추가/제거</li>
                <li>폴더를 선택하면 해당 폴더의 아파트만 모아 볼 수 있습니다</li>
                <li>하나의 아파트를 여러 폴더에 동시 추가 가능</li>
                <li>데이터는 브라우저 localStorage에 저장됩니다 (기기별 독립)</li>
              </ul>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
