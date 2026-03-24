'use client';

import { useMemo, useState } from 'react';
import ApartmentCard from '@/components/ApartmentCard';
import MemoEditor from '@/components/MemoEditor';
import { checkPriceProximity } from '@/lib/price-proximity';
import {
  APARTMENT_FEATURE_RESEARCH_MAP,
  type ApartmentFeatureResearch,
} from '@/data/apartment-feature-research';
import type { Apartment, MemoMap, PriceMap, TierKey } from '@/types';

interface AdminMemoBoardViewProps {
  apartments: Apartment[];
  allApartments: Apartment[];
  prices: PriceMap;
  memos: MemoMap;
  activeTier: TierKey;
  title: string;
  subtitle: string;
  onSaveMemo: (apartmentId: string, content: string) => void;
  onDeleteMemo: (apartmentId: string) => void;
}

function getSchoolRows(research?: ApartmentFeatureResearch) {
  return [
    research?.schools?.elementary ? `초등학교: ${research.schools.elementary}` : null,
    research?.schools?.middle ? `중학교: ${research.schools.middle}` : null,
    research?.schools?.high ? `고등학교: ${research.schools.high}` : null,
  ].filter(Boolean) as string[];
}

export default function AdminMemoBoardView({
  apartments,
  allApartments,
  prices,
  memos,
  activeTier,
  title,
  subtitle,
  onSaveMemo,
  onDeleteMemo,
}: AdminMemoBoardViewProps) {
  const [query, setQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('전체');
  const [showOnlyProximity, setShowOnlyProximity] = useState(false);
  const [showOnlyFirstFloor, setShowOnlyFirstFloor] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const searchableApartments = query.trim() ? allApartments : apartments;

  const filteredApartments = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return searchableApartments.filter((apartment) => {
      const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
      const priceEntry = prices[apartment.id];
      if (!research || !priceEntry) return false;
      if (districtFilter !== '전체' && apartment.district !== districtFilter) return false;

      const proximity = checkPriceProximity(priceEntry.sizes);
      if (showOnlyProximity && !proximity.hasProximity) return false;
      if (showOnlyFirstFloor && priceEntry.isFirstFloor !== true) return false;

      if (!lowered) return true;

      return [
        apartment.name,
        apartment.district,
        research.headline,
        research.leaderContext,
        ...research.comparedWith,
        ...research.noteLines,
        research.schools?.elementary,
        research.schools?.middle,
        research.schools?.high,
        memos[apartment.id],
      ]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(lowered));
    });
  }, [districtFilter, memos, prices, query, searchableApartments, showOnlyFirstFloor, showOnlyProximity]);

  const districts = useMemo(() => {
    const set = new Set(filteredApartments.map((item) => item.district));
    return ['전체', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [filteredApartments]);

  const grouped = useMemo(() => {
    const map = filteredApartments.reduce<Record<string, Apartment[]>>((acc, apartment) => {
      if (!acc[apartment.district]) acc[apartment.district] = [];
      acc[apartment.district].push(apartment);
      return acc;
    }, {});

    for (const district of Object.keys(map)) {
      map[district].sort((a, b) => {
        const aPrice = prices[a.id]?.price ?? a.currentPrice ?? Number.POSITIVE_INFINITY;
        const bPrice = prices[b.id]?.price ?? b.currentPrice ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      });
    }

    return map;
  }, [filteredApartments, prices]);

  const orderedDistricts = useMemo(() => Object.keys(grouped), [grouped]);

  const proximityCount = useMemo(
    () =>
      filteredApartments.filter((apartment) => checkPriceProximity(prices[apartment.id]?.sizes).hasProximity)
        .length,
    [filteredApartments, prices]
  );

  const firstFloorCount = useMemo(
    () => filteredApartments.filter((apartment) => prices[apartment.id]?.isFirstFloor === true).length,
    [filteredApartments, prices]
  );

  const toggleExpanded = (apartmentId: string) => {
    setExpandedIds((prev) => ({ ...prev, [apartmentId]: !prev[apartmentId] }));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[20px] border border-[#e8e5e0] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#37352f]">{title}</h2>
              <p className="mt-1 text-sm text-[#787774]">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#787774]">
              <span className="rounded-full border border-[#e8e5e0] bg-[#f7f7f5] px-3 py-1.5">
                티어 {activeTier}
              </span>
              <span className="rounded-full border border-[#e8e5e0] bg-[#f7f7f5] px-3 py-1.5">
                관리자체계도 {filteredApartments.length}개
              </span>
              <span className="rounded-full border border-[#f5c6c6] bg-[#fbe4e4] px-3 py-1.5 text-[#eb5757]">
                가격근접 {proximityCount}개
              </span>
              <span className="rounded-full border border-[#f6c58f] bg-[#fff1e5] px-3 py-1.5 text-[#b86a00]">
                1층 {firstFloorCount}개
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="구, 아파트명, 비교군, 학교, 메모 내용 검색"
              className="h-12 rounded-xl border border-[#e8e5e0] bg-white px-4 text-sm text-[#37352f] outline-none transition focus:border-[#2383e2] focus:ring-4 focus:ring-[#e8f2ff]"
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowOnlyProximity((prev) => !prev)}
                  className={`w-full shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:w-auto sm:min-w-[170px] ${
                    showOnlyProximity
                      ? 'border-[#eb5757] bg-[#fbe4e4] text-[#eb5757]'
                      : 'border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5]'
                  }`}
                >
                  {showOnlyProximity ? '전체 아파트 보기' : '가격근접만 보기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyFirstFloor((prev) => !prev)}
                  className={`w-full shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors sm:w-auto sm:min-w-[150px] ${
                    showOnlyFirstFloor
                      ? 'border-[#f6c58f] bg-[#fff1e5] text-[#b86a00]'
                      : 'border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5]'
                  }`}
                >
                  {showOnlyFirstFloor ? '전체 층 보기' : '1층만 보기'}
                </button>
              </div>

              <div className="min-w-0 flex-1 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2">
                  {districts.map((district) => {
                    const active = districtFilter === district;
                    return (
                      <button
                        key={district}
                        type="button"
                        onClick={() => setDistrictFilter(district)}
                        className={`shrink-0 rounded-full border px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-[#2383e2] bg-[#f0f7ff] text-[#2383e2]'
                            : 'border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5]'
                        }`}
                      >
                        {district}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {query.trim() ? (
        <div className="rounded-[18px] border border-[#d9e3ef] bg-[#f7fbff] px-4 py-3 text-sm text-[#4b647f]">
          검색 중에는 현재 티어와 무관하게 전체 아파트 목록에서 결과를 보여줍니다.
        </div>
      ) : null}

      {orderedDistricts.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-[#e8e5e0] bg-white py-20 text-sm text-[#b4b4b0]">
          조건에 맞는 관리자체계도 데이터가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orderedDistricts.map((district) => {
            const districtApartments = grouped[district];

            return (
              <div key={district} className="rounded-lg border border-[#e8e5e0] bg-white">
                <div className="border-b border-[#e8e5e0] bg-[#f7f7f5] px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-[#37352f]">
                    {district}
                    <span className="ml-2 text-[11px] font-normal text-[#b4b4b0]">
                      {districtApartments.length}개
                    </span>
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5 p-2">
                  {districtApartments.map((apartment) => {
                    const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
                    if (!research) return null;

                    const priceEntry = prices[apartment.id];
                    const schoolRows = getSchoolRows(research);
                    const proximity = checkPriceProximity(priceEntry?.sizes);
                    const expanded = !!expandedIds[apartment.id];

                    const apartmentForCard = {
                      ...apartment,
                      currentPrice: priceEntry?.price ?? apartment.currentPrice,
                      articleCount: priceEntry?.articleCount,
                      areaName: priceEntry?.areaName,
                      sizes: priceEntry?.sizes,
                      ownerVerified: priceEntry?.ownerVerified,
                      statusBadges: apartment.statusBadges,
                      isFirstFloor: priceEntry?.isFirstFloor ?? apartment.isFirstFloor,
                    };

                    return (
                      <div key={apartment.id}>
                        <div className="rounded-lg border border-[#e8e5e0] bg-white">
                          <ApartmentCard apartment={apartmentForCard} showProximity />
                          <div className="border-t border-dashed border-[#e8e5e0] bg-[#fffdfa] px-2.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(apartment.id)}
                              className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-[12px] text-[#c4a03a] transition-colors hover:bg-[#fff7db] hover:text-[#8b6914]"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>✎</span>
                                <span>관리자체계도 메모</span>
                              </span>
                              <span className="rounded-full border border-[#ead9ab] bg-white px-3 py-1 text-[11px] font-medium text-[#8b6914]">
                                {expanded ? '접기' : '펼치기'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="mt-1 rounded-lg border border-[#f1e5bc] bg-[#fffaf0] px-3 py-3 text-[12px] leading-6 text-[#6a5634]">
                            {proximity.hasProximity ? (
                              <div className="mb-3 flex flex-wrap gap-1.5">
                                {proximity.pairs.map((pair) => (
                                  <span
                                    key={`${apartment.id}-${pair.smallSize}-${pair.largeSize}`}
                                    className="rounded-full bg-[#fbe4e4] px-2 py-0.5 text-[10px] font-medium text-[#eb5757]"
                                  >
                                    가격근접 {pair.smallSize}↔{pair.largeSize} 차이 {pair.diff}억 ({pair.diffPercent}%)
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            {research.comparedWith.length > 0 ? (
                              <div className="mb-3">
                                <div className="mb-1 text-[10px] font-semibold text-[#8b6914]">비교 아파트</div>
                                <div className="flex flex-wrap gap-1">
                                  {research.comparedWith.map((item) => (
                                    <span
                                      key={`${apartment.id}-${item}`}
                                      className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#6a5634]"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div className="space-y-1.5">
                              {research.noteLines.map((line) => (
                                <p key={`${apartment.id}-${line}`} className="whitespace-pre-line">
                                  {line}
                                </p>
                              ))}
                            </div>

                            {schoolRows.length > 0 ? (
                              <div className="mt-3">
                                <div className="mb-1 text-[10px] font-semibold text-[#8b6914]">배정 학교</div>
                                <div className="space-y-1">
                                  {schoolRows.map((row) => (
                                    <p key={`${apartment.id}-${row}`}>{row}</p>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {research.leaderContext ? (
                              <div className="mt-3">
                                <div className="mb-1 text-[10px] font-semibold text-[#8b6914]">대장/준대장 맥락</div>
                                <p>{research.leaderContext}</p>
                              </div>
                            ) : null}

                            <div className="mt-3">
                              <div className="mb-1 text-[10px] font-semibold text-[#8b6914]">출처</div>
                              <div className="flex flex-wrap gap-1.5">
                                {research.sources.map((source, index) => (
                                  <a
                                    key={`${source.url}-${index}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-[#ead9ab] bg-white px-2 py-0.5 text-[10px] text-[#8b6914] hover:bg-[#fff7db]"
                                  >
                                    출처 {index + 1}
                                  </a>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 border-t border-dashed border-[#ead9ab] pt-3">
                              <div className="mb-1 text-[10px] font-semibold text-[#8b6914]">관리자 추가 메모</div>
                              <MemoEditor
                                apartmentId={apartment.id}
                                initialMemo={memos[apartment.id]}
                                onSave={onSaveMemo}
                                onDelete={onDeleteMemo}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
