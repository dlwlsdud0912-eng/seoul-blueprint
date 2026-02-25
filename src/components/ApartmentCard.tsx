'use client';

import { Apartment } from '@/types';

interface ApartmentCardProps {
  apartment: Apartment & { articleCount?: number };
  folderSlot?: React.ReactNode;
}

export default function ApartmentCard({ apartment, folderSlot }: ApartmentCardProps) {
  const price = apartment.currentPrice ?? apartment.basePrice;
  const change = apartment.priceChange;

  const desktopUrl = apartment.naverComplexId
    ? `https://new.land.naver.com/complexes/${apartment.naverComplexId}?markerId=${apartment.naverComplexId}&a=APT&e=RETAIL`
    : `https://new.land.naver.com/search?query=${encodeURIComponent(apartment.name)}`;

  const handleClick = (e: React.MouseEvent) => {
    if (!apartment.naverComplexId) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      e.preventDefault();
      window.open(
        `https://fin.land.naver.com/complexes/${apartment.naverComplexId}?tab=article`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="group flex items-center gap-1">
      {folderSlot}
      <a
        href={desktopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex-1 flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-[#f7f7f5] transition-colors cursor-pointer no-underline min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] text-[#37352f] truncate">{apartment.name}</span>
          <span className="shrink-0 text-[11px] text-[#b4b4b0] bg-[#f1f1ef] px-1.5 py-0.5 rounded">
            {apartment.size}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[#dbeddb] text-[10px] font-bold text-[#0f7b6c] opacity-0 transition-opacity group-hover:opacity-100" title="네이버 부동산">
            N
          </span>
          {apartment.articleCount !== undefined && apartment.articleCount > 0 && (
            <span className="text-[10px] text-[#b4b4b0]">
              {apartment.articleCount}건
            </span>
          )}
          <span className={`text-[13px] font-semibold ${
            change && change > 0 ? 'text-[#eb5757]' :
            change && change < 0 ? 'text-[#0f7b6c]' :
            'text-[#2383e2]'
          }`}>
            {price}억~
          </span>
          {change !== undefined && change !== 0 && (
            <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${
              change > 0
                ? 'text-[#eb5757] bg-[#fbe4e4]'
                : 'text-[#0f7b6c] bg-[#dbeddb]'
            }`}>
              {change > 0 ? '▲' : '▼'}{Math.abs(change)}
            </span>
          )}
        </div>
      </a>
    </div>
  );
}
