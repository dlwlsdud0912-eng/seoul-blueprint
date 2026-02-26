'use client';

import { useState, useRef, useEffect } from 'react';
import { Apartment, TierKey, FolderMap } from '@/types';
import { saveTierChange, removeTierChange, removeAddition } from '@/lib/apartment-overlay';
import { checkPriceProximity } from '@/lib/price-proximity';

const TIERS: TierKey[] = ['12','14','16','20','24','28','32','50'];

interface ApartmentCardProps {
  apartment: Apartment & {
    articleCount?: number;
    areaName?: string;
    sizes?: Record<string, { price: number; count: number } | null>;
  };
  folderSlot?: React.ReactNode;
  folders?: FolderMap;
  onQuickToggleFolder?: (folderId: string, apartmentId: string, isAdding: boolean) => void;
  isManageMode?: boolean;
  isOverlayChanged?: boolean;
  isCustomAdded?: boolean;
  onOverlayChange?: () => void;
  isHighlighted?: boolean;
  showProximity?: boolean;
}

export default function ApartmentCard({
  apartment, folderSlot, folders, onQuickToggleFolder, isManageMode, isOverlayChanged, isCustomAdded, onOverlayChange, isHighlighted, showProximity,
}: ApartmentCardProps) {
  const [showTierSelect, setShowTierSelect] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Bookmark (folder) calculations
  const folderList = folders ? Object.values(folders).sort((a, b) => a.createdAt - b.createdAt) : [];
  const inFolders = folderList.filter(f => f.apartmentIds.includes(apartment.id));
  const isBookmarked = inFolders.length > 0;
  const hasSingleFolder = folderList.length === 1;

  const isCustomUnverified = apartment.id.startsWith('custom-') && !apartment.naverComplexId;
  const isPendingCrawl = apartment.id.startsWith('custom-') && !!apartment.naverComplexId && !apartment.currentPrice;

  const price = apartment.currentPrice ?? apartment.basePrice;

  // Minimum size key: the size key with the lowest price
  const sizeEntries = apartment.sizes
    ? Object.entries(apartment.sizes).filter(([, v]) => v && (v as { price: number; count: number }).price)
    : [];
  const minSizeEntry = sizeEntries.length > 0
    ? sizeEntries.reduce((min, curr) =>
        (curr[1] as { price: number; count: number }).price < (min[1] as { price: number; count: number }).price ? curr : min
      )
    : null;
  const minSizeKey = minSizeEntry ? minSizeEntry[0] : null;

  const desktopUrl = apartment.naverComplexId
    ? `https://new.land.naver.com/complexes/${apartment.naverComplexId}?markerId=${apartment.naverComplexId}&a=APT&e=RETAIL`
    : `https://new.land.naver.com/complexes?query=${encodeURIComponent(apartment.name)}`;

  const handleClick = (e: React.MouseEvent) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      e.preventDefault();
      if (apartment.naverComplexId) {
        window.open(
          `https://fin.land.naver.com/complexes/${apartment.naverComplexId}?tab=article`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        window.open(
          `https://m.land.naver.com/search/result/${encodeURIComponent(apartment.name)}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
    }
  };

  const handleTierChange = (newTier: TierKey) => {
    saveTierChange(apartment.id, newTier);
    setShowTierSelect(false);
    onOverlayChange?.();
  };

  const handleRevertTier = () => {
    removeTierChange(apartment.id);
    onOverlayChange?.();
  };

  const handleRemoveCustom = () => {
    removeAddition(apartment.id);
    onOverlayChange?.();
  };

  // Display area name: prefer areaName from prices.json, fallback to minSizeKey
  const displayAreaName = apartment.areaName || (minSizeKey ? `${minSizeKey}㎡` : null);

  // Price proximity calculation
  const proximity = showProximity ? checkPriceProximity(apartment.sizes) : null;
  const hasProximity = proximity?.hasProximity ?? false;
  const proximitySizeSet = new Set(proximity?.pairs.map(p => p.largeSize) ?? []);

  // Build the remaining sizes for row 2 (all sizes except minSizeKey)
  const allSizeKeys = ['59', '84', '114'] as const;
  const remainingKeys = apartment.sizes
    ? allSizeKeys.filter(k => k !== minSizeKey)
    : [];

  return (
    <div ref={cardRef} className={`group flex items-center gap-1 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-[#2383e2] bg-[#f0f7ff] rounded-lg' : ''} ${hasProximity ? 'border-l-2 border-l-[#eb5757]' : ''}`}>
      {/* Bookmark star button - only interactive for single folder (quick toggle) */}
      {folderList.length > 0 && hasSingleFolder && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const folder = folderList[0];
            onQuickToggleFolder?.(folder.id, apartment.id, !isBookmarked);
          }}
          className={`shrink-0 transition-colors ${
            isBookmarked
              ? 'text-[#2383e2] hover:text-[#1a6bc4]'
              : 'text-[#d3d1cb] hover:text-[#787774]'
          }`}
          title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3">
            <path d="M3 2.5h10a.5.5 0 01.5.5v11.5l-5.5-3-5.5 3V3a.5.5 0 01.5-.5z" />
          </svg>
        </button>
      )}
      {/* Show folderSlot (dropdown) only when multiple folders exist */}
      {!hasSingleFolder && folderSlot}
      {/* 관리모드 버튼들 - 호버 시에만 표시 (모바일은 항상) */}
      {isManageMode && (
        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowTierSelect(!showTierSelect)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-[#ffcc80] bg-[#fff3e0] text-[#e65100] hover:bg-[#ffe0b2] transition-colors"
            title="티어 이동"
          >
            이동
          </button>
          {isOverlayChanged && (
            <button
              onClick={handleRevertTier}
              className="text-[10px] px-1 py-0.5 rounded border border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5] transition-colors"
              title="티어 변경 되돌리기"
            >
              복원
            </button>
          )}
          {isCustomAdded && (
            <button
              onClick={handleRemoveCustom}
              className="text-[10px] px-1 py-0.5 rounded border border-[#e8e5e0] bg-white text-[#eb5757] hover:bg-[#fbe4e4] transition-colors"
              title="추가 아파트 삭제"
            >
              삭제
            </button>
          )}
        </div>
      )}
      {/* 티어 선택 드롭다운 */}
      {showTierSelect && isManageMode && (
        <div className="flex items-center gap-0.5 shrink-0">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => handleTierChange(t)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                t === apartment.tier
                  ? 'bg-[#2383e2] text-white'
                  : 'bg-[#f1f1ef] text-[#787774] hover:bg-[#e8e5e0]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <a
        href={desktopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex-1 flex flex-col px-2.5 py-2 rounded-md hover:bg-[#f7f7f5] transition-colors cursor-pointer no-underline min-w-0"
      >
        {/* 1행: 이름 + 뱃지들 + N버튼 + 면적 + 가격 */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] text-[#37352f] font-medium truncate">{apartment.name}</span>
          <span className="shrink-0 text-[11px] text-[#b4b4b0] bg-[#f1f1ef] px-1.5 py-0.5 rounded">
            {apartment.size}
          </span>
          {isOverlayChanged && (
            <span className="shrink-0 text-[8px] text-[#c77c14] bg-[#fff8ee] px-1 py-px rounded">
              변경
            </span>
          )}
          {isCustomAdded && (
            <span className="shrink-0 text-[8px] text-[#5b9bd5] bg-[#f0f7ff] px-1 py-px rounded">
              추가
            </span>
          )}
          {hasProximity && (
            <span className="shrink-0 text-[8px] text-[#eb5757] bg-[#fbe4e4] px-1 py-px rounded font-medium">
              근접
            </span>
          )}
          {isCustomUnverified && (
            <span className="shrink-0 text-[10px] text-[#b4b4b0] italic">가격 미확인</span>
          )}
          {isPendingCrawl && (
            <span className="shrink-0 text-[10px] text-[#1a73e8] italic">크롤링 대기</span>
          )}
          {/* N 버튼 (hover시 표시) */}
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#dbeddb] text-[10px] font-bold text-[#0f7b6c] opacity-0 transition-opacity group-hover:opacity-100 ml-auto" title="네이버 부동산">
            N
          </span>
          {/* 최소면적 + 가격 (오른쪽 정렬) */}
          <div className="flex items-baseline gap-1 shrink-0">
            {displayAreaName && (
              <span className="text-[12px] text-[#9ca3af] font-medium">
                {displayAreaName}
              </span>
            )}
            <span className="text-[17px] font-bold text-[#2383e2] leading-tight">
              {price}억~
            </span>
          </div>
        </div>
        {/* 2행: 면적별 가격 (부가 정보, 작고 컴팩트) */}
        {remainingKeys.length > 0 && (
          <div className="flex items-center gap-3 mt-0.5 pl-1">
            {remainingKeys.map((sizeKey, idx) => {
              const sizeData = apartment.sizes?.[sizeKey];
              return (
                <div key={sizeKey} className="flex items-center gap-0">
                  {idx > 0 && <span className="text-[#d5cec4] text-[10px] mr-3">&middot;</span>}
                  <span className="text-[11px] text-[#9ca3af] mr-0.5">{sizeKey}&#13217;</span>
                  {sizeData === undefined ? (
                    <span className="text-[#d5cec4] text-[11px]">&mdash;</span>
                  ) : sizeData === null ? (
                    <span className="text-[#d1d5db] text-[10px]">매물없음</span>
                  ) : (
                    <span className={`text-[12px] font-medium ${proximitySizeSet.has(sizeKey) ? 'text-[#eb5757]' : 'text-[#6b7280]'}`}>{sizeData.price}억</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* 근접 상세 정보 */}
        {hasProximity && showProximity && proximity && (
          <div className="flex items-center gap-1 mt-0.5 pl-1 flex-wrap">
            {proximity.pairs.map((pair, i) => (
              <span key={i} className="text-[10px] text-[#eb5757] bg-[#fbe4e4] px-1.5 py-0.5 rounded">
                {pair.smallSize}↔{pair.largeSize} 차이 {pair.diff}억 ({pair.diffPercent}%)
              </span>
            ))}
          </div>
        )}
      </a>
    </div>
  );
}
