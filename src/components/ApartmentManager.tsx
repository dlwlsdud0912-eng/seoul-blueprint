'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { District, TierKey } from '@/types';
import {
  addApartment,
  clearOverlay,
  getOverlay,
  AddedApartment,
} from '@/lib/apartment-overlay';
import { APARTMENTS } from '@/data/apartments';
import { fuzzySearchApartments, SearchResult } from '@/lib/fuzzy-search';

const DISTRICTS: District[] = [
  '성북구','동대문구','성동구','강서구','영등포구','강동구','양천구','관악구',
  '마포구','동작구','용산구','송파구','비잠실송파','강남구','서초구','서대문구',
  '강북구','구로구','은평구','노원구','종로구','중구',
];

const TIERS: TierKey[] = ['12','14','16','20','24','28','32','50'];

function determineTier(price: number): TierKey {
  if (price <= 12) return '12';
  if (price <= 14) return '14';
  if (price <= 16) return '16';
  if (price <= 20) return '20';
  if (price <= 24) return '24';
  if (price <= 28) return '28';
  if (price <= 32) return '32';
  return '50';
}

interface ApartmentManagerProps {
  isManageMode: boolean;
  activeTier: TierKey;
  onToggleManageMode: () => void;
  onOverlayChange: () => void;
  onAddComplete?: (tier: TierKey) => void;
}

export default function ApartmentManager({
  isManageMode,
  activeTier,
  onToggleManageMode,
  onOverlayChange,
  onAddComplete,
}: ApartmentManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<District | ''>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);

  // 직접 추가 폼 상태
  const [manualName, setManualName] = useState('');
  const [manualDistrict, setManualDistrict] = useState<District>('강남구');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlay = getOverlay();
  const tierChangeCount = Object.keys(overlay.tierChanges).length;
  const additionCount = overlay.additions.length;
  const hasOverlay = tierChangeCount > 0 || additionCount > 0;

  // 이미 추가된 아파트 ID 세트 (중복 방지 표시용)
  const addedIds = new Set(overlay.additions.map((a) => a.id));

  // 검색 debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const results = fuzzySearchApartments(
        searchQuery,
        APARTMENTS,
        selectedDistrict || undefined,
      );
      setSearchResults(results);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedDistrict]);

  // 검색 결과에서 아파트 추가
  const handleAddFromSearch = useCallback(
    (result: SearchResult) => {
      const apt = result.apartment;
      const added: AddedApartment = {
        id: apt.id,
        name: apt.name,
        district: apt.district,
        size: apt.size,
        basePrice: apt.basePrice,
        tier: apt.tier,
        ...(apt.naverComplexId ? { naverComplexId: apt.naverComplexId } : {}),
      };
      addApartment(added);
      onOverlayChange();
      onAddComplete?.(apt.tier);

      // 검색 초기화
      setSearchQuery('');
      setSearchResults([]);
      setShowAddForm(false);
    },
    [onOverlayChange, onAddComplete],
  );

  // 직접 추가 (현재 보고 있는 티어에 자동 배정)
  const handleManualAdd = useCallback(() => {
    if (!manualName.trim()) return;

    const tierPrice: Record<TierKey, number> = {
      '12': 12, '14': 14, '16': 16, '20': 20,
      '24': 24, '28': 28, '32': 32, '50': 50,
    };
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const apt: AddedApartment = {
      id,
      name: manualName.trim(),
      district: manualDistrict,
      size: '24평',
      basePrice: tierPrice[activeTier] ?? 12,
      tier: activeTier,
    };
    addApartment(apt);
    onOverlayChange();
    onAddComplete?.(activeTier);

    // 폼 초기화
    setManualName('');
    setShowManualForm(false);
    setShowAddForm(false);
  }, [manualName, manualDistrict, activeTier, onOverlayChange, onAddComplete]);

  const handleReset = () => {
    if (window.confirm('모든 오버레이(티어 변경, 추가 아파트)를 초기화하시겠습니까?')) {
      clearOverlay();
      onOverlayChange();
    }
  };

  const handleOpenForm = () => {
    setShowAddForm(!showAddForm);
    if (showAddForm) {
      // 닫을 때 초기화
      setSearchQuery('');
      setSearchResults([]);
      setShowManualForm(false);
    }
  };

  /** 매치 타입 라벨 */
  const matchLabel = (type: SearchResult['matchType']) => {
    switch (type) {
      case 'exact': return '일치';
      case 'startsWith': return '시작';
      case 'contains': return '포함';
      case 'chosung': return '초성';
      default: return '유사';
    }
  };

  return (
    <>
      {/* 인라인 버튼들 */}
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
            <button
              onClick={handleOpenForm}
              className="text-[11px] font-medium px-2 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#2383e2] hover:bg-[#f0f7ff] transition-colors whitespace-nowrap"
            >
              +추가
            </button>
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

      {/* 아파트 추가 폼 (검색 기반) */}
      {isManageMode && showAddForm && (
        <div className="w-full rounded-lg border border-[#ffcc80] bg-[#fff3e0] p-3 mt-2">
          <h4 className="text-[12px] font-semibold text-[#e65100] mb-2">아파트 추가</h4>

          {/* 검색 입력 */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="아파트 이름 검색 (예: 래미안, ㅎㅅ)"
                className="w-full text-[12px] px-3 py-2 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2] placeholder:text-[#b4b4b0]"
                autoFocus
              />
            </div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value as District | '')}
              className="text-[12px] px-2 py-2 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2] shrink-0"
            >
              <option value="">전체 구</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#e8e5e0] rounded-md bg-white divide-y divide-[#f0efeb] max-h-[240px] overflow-y-auto">
              {searchResults.map((result) => {
                const apt = result.apartment;
                const alreadyAdded = addedIds.has(apt.id);
                return (
                  <button
                    key={apt.id}
                    onClick={() => !alreadyAdded && handleAddFromSearch(result)}
                    disabled={alreadyAdded}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      alreadyAdded
                        ? 'opacity-40 cursor-not-allowed bg-[#f7f7f5]'
                        : 'hover:bg-[#f0f7ff] cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-[#37352f]">
                        {apt.name}
                      </span>
                      <span className="text-[11px] text-[#787774] ml-1.5">
                        {apt.district} {apt.size}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#2383e2] font-medium shrink-0">
                      {apt.basePrice}억
                    </span>
                    <span className="text-[10px] text-[#787774] bg-[#f7f7f5] px-1.5 py-0.5 rounded shrink-0">
                      T{apt.tier}
                    </span>
                    <span className="text-[9px] text-[#b4b4b0] shrink-0">
                      {alreadyAdded ? '추가됨' : matchLabel(result.matchType)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 검색어 입력 중인데 결과 없음 */}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-[11px] text-[#787774]">
              검색 결과가 없습니다.
            </p>
          )}

          {/* 직접 추가 토글 */}
          {!showManualForm ? (
            <button
              onClick={() => setShowManualForm(true)}
              className="mt-2 text-[11px] text-[#2383e2] hover:underline"
            >
              찾는 아파트가 없나요? 직접 추가 &rsaquo;
            </button>
          ) : (
            <div className="mt-2 pt-2 border-t border-[#ffcc80]">
              <p className="text-[11px] font-medium text-[#e65100] mb-1.5">직접 추가</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="아파트 이름"
                    className="w-full text-[12px] px-2 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
                  />
                </div>
                <select
                  value={manualDistrict}
                  onChange={(e) => setManualDistrict(e.target.value as District)}
                  className="text-[12px] px-2 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2] shrink-0"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[10px] text-[#787774]">
                현재 티어({activeTier}억)에 자동 배정됩니다. 크롤링 후 실제 가격이 반영됩니다.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleManualAdd}
                  disabled={!manualName.trim()}
                  className="text-[11px] font-medium px-3 py-1 rounded-md bg-[#2383e2] text-white hover:bg-[#1b6ec2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowManualForm(false)}
                  className="text-[11px] font-medium px-3 py-1 rounded-md border border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5] transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 닫기 */}
          <div className="mt-2 pt-2 border-t border-[#ffcc80] flex justify-end">
            <button
              onClick={handleOpenForm}
              className="text-[11px] font-medium px-3 py-1 rounded-md border border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
