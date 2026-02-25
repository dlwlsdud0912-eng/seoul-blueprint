'use client';

import { useState } from 'react';
import { Apartment, TierKey, FolderMap } from '@/types';
import { saveTierChange, removeTierChange, removeAddition } from '@/lib/apartment-overlay';

const TIERS: TierKey[] = ['12','14','16','20','24','28','32','50'];

interface ApartmentCardProps {
  apartment: Apartment & {
    articleCount?: number;
    sizes?: Record<string, { price: number; count: number }>;
  };
  folderSlot?: React.ReactNode;
  folders?: FolderMap;
  onQuickToggleFolder?: (folderId: string, apartmentId: string, isAdding: boolean) => void;
  isManageMode?: boolean;
  isOverlayChanged?: boolean;
  isCustomAdded?: boolean;
  onOverlayChange?: () => void;
}

export default function ApartmentCard({
  apartment, folderSlot, folders, onQuickToggleFolder, isManageMode, isOverlayChanged, isCustomAdded, onOverlayChange,
}: ApartmentCardProps) {
  const [showTierSelect, setShowTierSelect] = useState(false);

  // Bookmark (folder) calculations
  const folderList = folders ? Object.values(folders).sort((a, b) => a.createdAt - b.createdAt) : [];
  const inFolders = folderList.filter(f => f.apartmentIds.includes(apartment.id));
  const isBookmarked = inFolders.length > 0;
  const hasSingleFolder = folderList.length === 1;

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

  return (
    <div className="group flex items-center gap-1">
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
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] text-[#37352f] truncate">{apartment.name}</span>
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
        </div>
        {apartment.sizes && (
          <div className="flex gap-3 mt-1 ml-0">
            {(['59', '84', '114'] as const).map((sizeKey) => {
              const sizeData = apartment.sizes?.[sizeKey];
              return (
                <span key={sizeKey} className="text-[10px]">
                  <span className="text-[#b4b4b0]">{sizeKey}&#13217; </span>
                  {sizeData === undefined ? (
                    <span className="text-[#d3d1cb]">&mdash;</span>
                  ) : sizeData === null ? (
                    <span className="text-[#b4b4b0]">매물없음</span>
                  ) : (
                    <span className="text-[#2383e2] font-medium">{sizeData.price}억</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </a>
    </div>
  );
}
