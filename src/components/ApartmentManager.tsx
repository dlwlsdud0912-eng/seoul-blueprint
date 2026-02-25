'use client';

import { useState } from 'react';
import { District, TierKey } from '@/types';
import {
  addApartment,
  clearOverlay,
  getOverlay,
  AddedApartment,
} from '@/lib/apartment-overlay';

const DISTRICTS: District[] = [
  '성북구','동대문구','성동구','강서구','영등포구','강동구','양천구','관악구',
  '마포구','동작구','용산구','송파구','비잠실송파','강남구','서초구','서대문구',
  '강북구','구로구','은평구','노원구','종로구','중구',
];

const TIERS: TierKey[] = ['12','14','16','20','24','28','32','50'];

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState<District>('강남구');
  const [size, setSize] = useState('24평');
  const [basePrice, setBasePrice] = useState('');
  const [tier, setTier] = useState<TierKey>('12');
  const [naverComplexId, setNaverComplexId] = useState('');

  const overlay = getOverlay();
  const tierChangeCount = Object.keys(overlay.tierChanges).length;
  const additionCount = overlay.additions.length;
  const hasOverlay = tierChangeCount > 0 || additionCount > 0;

  const handleAdd = () => {
    if (!name.trim() || !basePrice.trim()) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const apt: AddedApartment = {
      id,
      name: name.trim(),
      district,
      size: size.trim() || '24평',
      basePrice: parseFloat(basePrice),
      tier,
      ...(naverComplexId.trim() ? { naverComplexId: naverComplexId.trim() } : {}),
    };
    addApartment(apt);
    onOverlayChange();
    // Reset form
    setName('');
    setBasePrice('');
    setNaverComplexId('');
    setShowAddForm(false);
  };

  const handleReset = () => {
    if (window.confirm('모든 오버레이(티어 변경, 추가 아파트)를 초기화하시겠습니까?')) {
      clearOverlay();
      onOverlayChange();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 관리 토글 + 상태 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onToggleManageMode}
          className={`text-[11px] font-medium px-3 py-1.5 rounded-md border transition-colors ${
            isManageMode
              ? 'bg-[#fff3e0] border-[#ffcc80] text-[#e65100]'
              : 'bg-white border-[#e8e5e0] text-[#787774] hover:bg-[#f7f7f5]'
          }`}
        >
          {isManageMode ? '관리모드 ON' : '관리'}
        </button>

        {isManageMode && (
          <>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#2383e2] hover:bg-[#f0f7ff] transition-colors"
            >
              + 아파트 추가
            </button>
            {hasOverlay && (
              <button
                onClick={handleReset}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#eb5757] hover:bg-[#fbe4e4] transition-colors"
              >
                초기화
              </button>
            )}
            {hasOverlay && (
              <span className="text-[11px] text-[#787774]">
                {tierChangeCount > 0 && `티어 변경 ${tierChangeCount}건`}
                {tierChangeCount > 0 && additionCount > 0 && ' / '}
                {additionCount > 0 && `추가 ${additionCount}건`}
              </span>
            )}
          </>
        )}
      </div>

      {/* 아파트 추가 폼 */}
      {isManageMode && showAddForm && (
        <div className="rounded-lg border border-[#ffcc80] bg-[#fff3e0] p-4">
          <h4 className="text-[13px] font-semibold text-[#e65100] mb-3">아파트 추가</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="아파트 이름"
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">구</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value as District)}
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">평형</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="24평"
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">기준가 (억) *</label>
              <input
                type="number"
                step="0.1"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="12.5"
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">티어</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TierKey)}
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>{t}억</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#787774] mb-1">네이버 단지ID (선택)</label>
              <input
                type="text"
                value={naverComplexId}
                onChange={(e) => setNaverComplexId(e.target.value)}
                placeholder="12345"
                className="w-full text-[13px] px-2.5 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#37352f] outline-none focus:border-[#2383e2]"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !basePrice.trim()}
              className="text-[12px] font-medium px-4 py-1.5 rounded-md bg-[#2383e2] text-white hover:bg-[#1b6ec2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              추가
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-[12px] font-medium px-4 py-1.5 rounded-md border border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
