'use client';

import { useState, useRef, useEffect } from 'react';
import { Apartment, TierKey, FolderMap } from '@/types';
import { saveTierChange, removeTierChange, removeAddition } from '@/lib/apartment-overlay';
import { checkPriceProximity } from '@/lib/price-proximity';
import { TIERS as TIER_OPTIONS } from '@/data/tiers';

interface ApartmentCardProps {
  apartment: Apartment & {
    articleCount?: number;
    areaName?: string;
    sizes?: Record<string, { price: number; count: number } | null>;
    ownerVerified?: boolean;
    statusBadges?: string[];
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
  const isOwnerVerificationMissing = apartment.ownerVerified === false;
  const isLowestPriceFirstFloor = apartment.isFirstFloor === true;
  const statusBadges = apartment.statusBadges ?? [];

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

  // Price proximity calculation
  const proximity = showProximity ? checkPriceProximity(apartment.sizes) : null;
  const hasProximity = proximity?.hasProximity ?? false;
  const proximitySizeSet = new Set(proximity?.pairs.map(p => p.largeSize) ?? []);

  // 면적 표시: 항상 59→84 고정 순서. 최저가 면적을 큰 글씨로 강조
  const fixedSizeKeys = ['59', '84'] as const;

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
          {TIER_OPTIONS.map((tier) => (
            <button
              key={tier.key}
              onClick={() => handleTierChange(tier.key)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                tier.key === apartment.tier
                  ? 'bg-[#2383e2] text-white'
                  : 'bg-[#f1f1ef] text-[#787774] hover:bg-[#e8e5e0]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      )}
      <a
        href={desktopUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex-1 flex flex-col px-3 py-2 rounded-lg border border-[#f0ede8] bg-[#fafaf8] hover:bg-[#f5f4f1] hover:border-[#e8e5e0] transition-colors cursor-pointer no-underline min-w-0"
      >
        {/* 1행: 이름 + 평형뱃지 + 상태뱃지 + N버튼 */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] text-[#37352f] font-medium leading-snug">{apartment.name}</span>
          {isOverlayChanged && (
            <span className="shrink-0 text-[8px] text-[#c77c14] bg-[#fff8ee] px-1 py-px rounded">변경</span>
          )}
          {isCustomAdded && (
            <span className="shrink-0 text-[8px] text-[#5b9bd5] bg-[#f0f7ff] px-1 py-px rounded">추가</span>
          )}
          {hasProximity && (
            <span className="shrink-0 text-[8px] text-[#eb5757] bg-[#fbe4e4] px-1 py-px rounded font-medium">근접</span>
          )}
          {isLowestPriceFirstFloor && (
            <span className="shrink-0 text-[8px] text-[#8b5a2b] bg-[#fff1e5] px-1 py-px rounded font-medium">최저가 1층</span>
          )}
          {isOwnerVerificationMissing && (
            <span className="shrink-0 text-[8px] text-[#8c6d1f] bg-[#fff7db] px-1 py-px rounded font-medium">집주인인증X</span>
          )}
          {isCustomUnverified && (
            <span className="shrink-0 text-[10px] text-[#b4b4b0] italic">미확인</span>
          )}
          {isPendingCrawl && (
            <span className="shrink-0 text-[10px] text-[#1a73e8] italic">대기</span>
          )}
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#dbeddb] text-[9px] font-bold text-[#0f7b6c] opacity-0 transition-opacity group-hover:opacity-100 ml-auto" title="네이버 부동산">
            N
          </span>
        </div>
        {/* 2행: 면적 + 가격 (항상 59→84 고정 순서, 최저가 강조) */}
        {statusBadges.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {statusBadges.map((badge) => (
              <span
                key={badge}
                className="shrink-0 rounded bg-[#f3efe8] px-1.5 py-px text-[9px] font-medium text-[#7a6854]"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
          {fixedSizeKeys.map((sizeKey) => {
            const sizeData = apartment.sizes?.[sizeKey];
            const isMin = sizeKey === minSizeKey;
            return (
              <span key={sizeKey} className={`flex items-baseline gap-0.5 ${sizeKey === '84' ? 'ml-1.5' : ''}`}>
                <span className={isMin ? 'text-[11px] text-[#9ca3af]' : 'text-[10px] text-[#b4b4b0]'}>{sizeKey}&#13217;</span>
                {sizeData === undefined ? (
                  <span className="text-[#d5cec4] text-[10px]">&mdash;</span>
                ) : sizeData === null ? (
                  <span className="text-[#d1d5db] text-[10px]">매물없음</span>
                ) : isMin ? (
                  <span className="text-[16px] font-bold text-[#2383e2] leading-none">{sizeData.price}억~</span>
                ) : (
                  <span className={`text-[12px] font-semibold ${proximitySizeSet.has(sizeKey) ? 'text-[#eb5757]' : 'text-[#78909c]'}`}>{sizeData.price}억</span>
                )}
              </span>
            );
          })}
        </div>
        {/* 근접 상세 정보 */}
        {hasProximity && showProximity && proximity && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {proximity.pairs.map((pair, i) => (
              <span key={`${pair.smallSize}-${pair.largeSize}`} className="text-[10px] text-[#eb5757] bg-[#fbe4e4] px-1.5 py-0.5 rounded">
                {pair.smallSize}↔{pair.largeSize} 차이 {pair.diff}억 ({pair.diffPercent}%)
              </span>
            ))}
          </div>
        )}
      </a>
    </div>
  );
}
