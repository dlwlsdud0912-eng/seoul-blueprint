'use client';

import { useState, useRef, useEffect } from 'react';
import { Apartment, TierKey } from '@/types';
import { TIERS } from '@/data/tiers';

interface SearchBarProps {
  apartments: Apartment[];
  onSelectApartment: (apartment: Apartment) => void;
}

export default function SearchBar({ apartments, onSelectApartment }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색 결과: 이름 부분 매칭, 최대 10개
  const results = query.trim()
    ? apartments
        .filter((a) => a.name.includes(query.trim()))
        .slice(0, 10)
    : [];

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function getTierLabel(tierKey: TierKey): string {
    const tier = TIERS.find((t) => t.key === tierKey);
    return tier ? tier.maxPrice : tierKey;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setIsOpen(true);
  }

  function handleSelect(apartment: Apartment) {
    onSelectApartment(apartment);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleClear() {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 검색 입력 필드 */}
      <div className="flex items-center gap-2 rounded-md border border-[#e8e5e0] bg-white px-3 py-2 transition-colors focus-within:border-[#2383e2]">
        {/* 돋보기 아이콘 */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M11.5 11.5L14 14"
            stroke="#b4b4b0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="7" cy="7" r="4.5" stroke="#b4b4b0" strokeWidth="1.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          placeholder="아파트 검색..."
          className="flex-1 bg-transparent text-[13px] text-[#37352f] placeholder-[#b4b4b0] outline-none"
        />
        {/* X 버튼 */}
        {query && (
          <button
            onClick={handleClear}
            className="shrink-0 rounded p-0.5 text-[#b4b4b0] hover:bg-[#f1f1ef] hover:text-[#787774] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M4 4L10 10M10 4L4 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[340px] overflow-y-auto rounded-md border border-[#e8e5e0] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          {results.map((apt) => {
            const price = apt.currentPrice ?? apt.basePrice;
            const change = apt.priceChange;
            return (
              <button
                key={apt.id}
                onClick={() => handleSelect(apt)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[#f1f1ef]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] text-[#37352f] truncate">
                    {apt.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#b4b4b0]">
                    {apt.district}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#b4b4b0] bg-[#f1f1ef] px-1.5 py-0.5 rounded">
                    {getTierLabel(apt.tier)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <span
                    className={`text-[13px] font-semibold ${
                      change && change > 0
                        ? 'text-[#eb5757]'
                        : change && change < 0
                        ? 'text-[#0f7b6c]'
                        : 'text-[#2383e2]'
                    }`}
                  >
                    {price}억~
                  </span>
                  {change !== undefined && change !== 0 && (
                    <span
                      className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                        change > 0
                          ? 'text-[#eb5757] bg-[#fbe4e4]'
                          : 'text-[#0f7b6c] bg-[#dbeddb]'
                      }`}
                    >
                      {change > 0 ? '▲' : '▼'}
                      {Math.abs(change)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[#e8e5e0] bg-white px-3 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <p className="text-center text-[13px] text-[#b4b4b0]">
            검색 결과가 없습니다
          </p>
        </div>
      )}
    </div>
  );
}
