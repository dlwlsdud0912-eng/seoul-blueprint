'use client';

import Link from 'next/link';

interface HeaderProps {
  lastUpdated?: string | null;
}

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e8e5e0]">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#37352f] flex items-center gap-2">
              <Link href="/" className="no-underline text-inherit hover:text-inherit">
                서울 아파트 체계도
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0f7b6c] bg-[#dbeddb] px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-[#0f7b6c] rounded-full animate-pulse" />
                LIVE
              </span>
            </h1>
            <p className="text-xs text-[#787774] mt-0.5">
              이소장의 서울아파트 가격 체계도 — 네이버 부동산 실시간 최저가 연동
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-[11px] text-[#787774] hover:text-[#2383e2] transition-colors no-underline"
            >
              관리자
            </Link>
            <Link
              href="/guide"
              className="text-[11px] text-[#787774] hover:text-[#2383e2] transition-colors no-underline"
            >
              가이드
            </Link>
            <div className="text-[11px] text-[#b4b4b0] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#0f7b6c] rounded-full" />
              {lastUpdated ? `마지막 크롤링: ${lastUpdated}` : '갱신 전'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
