'use client';

import { clearOverlay, getOverlay } from '@/lib/apartment-overlay';
import { TierKey } from '@/types';

interface ApartmentManagerProps {
  isManageMode: boolean;
  onToggleManageMode: () => void;
  onOverlayChange: () => void;
}

export default function ApartmentManager({
  isManageMode,
  onToggleManageMode,
  onOverlayChange,
}: ApartmentManagerProps) {
  const overlay = getOverlay();
  const tierChangeCount = Object.keys(overlay.tierChanges).length;
  const additionCount = overlay.additions.length;
  const hasOverlay = tierChangeCount > 0 || additionCount > 0;

  const handleReset = () => {
    if (window.confirm('모든 오버레이(티어 변경, 추가 아파트)를 초기화하시겠습니까?')) {
      clearOverlay();
      onOverlayChange();
    }
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={onToggleManageMode}
        className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
          isManageMode
            ? 'bg-[#fff3e0] border-[#ffcc80] text-[#e65100]'
            : 'bg-white border-[#e8e5e0] text-[#787774] hover:bg-[#f7f7f5]'
        }`}
      >
        {isManageMode ? '관리 ON' : '관리'}
      </button>

      {isManageMode && (
        <>
          {hasOverlay && (
            <button
              onClick={handleReset}
              className="text-[11px] font-medium px-2 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#eb5757] hover:bg-[#fbe4e4] transition-colors whitespace-nowrap"
            >
              초기화
            </button>
          )}
          {hasOverlay && (
            <span className="text-[10px] text-[#787774] whitespace-nowrap hidden sm:inline">
              {tierChangeCount > 0 && `${tierChangeCount}변경`}
              {tierChangeCount > 0 && additionCount > 0 && '/'}
              {additionCount > 0 && `${additionCount}추가`}
            </span>
          )}
        </>
      )}
    </div>
  );
}
