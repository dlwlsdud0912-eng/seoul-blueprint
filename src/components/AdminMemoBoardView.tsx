'use client';

import { useMemo, useState } from 'react';
import MemoEditor from '@/components/MemoEditor';
import { checkPriceProximity } from '@/lib/price-proximity';
import {
  APARTMENT_FEATURE_RESEARCH_MAP,
  type ApartmentFeatureResearch,
} from '@/data/apartment-feature-research';
import type { Apartment, MemoMap, PriceMap, TierKey } from '@/types';

interface AdminMemoBoardViewProps {
  apartments: Apartment[];
  prices: PriceMap;
  memos: MemoMap;
  activeTier: TierKey;
  title: string;
  subtitle: string;
  onSaveMemo: (apartmentId: string, content: string) => void;
  onDeleteMemo: (apartmentId: string) => void;
}

function formatPrice(value?: number | null) {
  if (value == null) return '--';
  return `${value}억`;
}

function getPriceSummary(apartment: Apartment, priceEntry?: PriceMap[string]) {
  return {
    current: formatPrice(priceEntry?.price ?? apartment.currentPrice ?? null),
    s59: formatPrice(priceEntry?.sizes?.['59']?.price ?? null),
    s84: formatPrice(priceEntry?.sizes?.['84']?.price ?? null),
  };
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const researchedApartments = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
      const priceEntry = prices[apartment.id];
      if (!research) return false;
      if (districtFilter !== '전체' && apartment.district !== districtFilter) return false;

      const proximity = checkPriceProximity(priceEntry?.sizes);
      if (showOnlyProximity && !proximity.hasProximity) return false;

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
  }, [apartments, districtFilter, memos, prices, query, showOnlyProximity]);

  const districts = useMemo(() => {
    const set = new Set(researchedApartments.map((item) => item.district));
    return ['전체', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))];
  }, [researchedApartments]);

  const groupedApartments = useMemo(() => {
    const grouped = researchedApartments.reduce<Record<string, Apartment[]>>((acc, apartment) => {
      if (!acc[apartment.district]) acc[apartment.district] = [];
      acc[apartment.district].push(apartment);
      return acc;
    }, {});

    for (const district of Object.keys(grouped)) {
      grouped[district].sort((a, b) => {
        const aPrice = prices[a.id]?.price ?? a.currentPrice ?? Number.POSITIVE_INFINITY;
        const bPrice = prices[b.id]?.price ?? b.currentPrice ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      });
    }

    return grouped;
  }, [prices, researchedApartments]);

  const proximityCount = useMemo(
    () =>
      researchedApartments.filter((apartment) => checkPriceProximity(prices[apartment.id]?.sizes).hasProximity)
        .length,
    [prices, researchedApartments]
  );

  const orderedDistricts = useMemo(
    () =>
      Object.keys(groupedApartments).sort((a, b) => {
        const aMin = groupedApartments[a]?.[0];
        const bMin = groupedApartments[b]?.[0];
        const aPrice = aMin ? prices[aMin.id]?.price ?? aMin.currentPrice ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        const bPrice = bMin ? prices[bMin.id]?.price ?? bMin.currentPrice ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      }),
    [groupedApartments, prices]
  );

  const toggleExpanded = (apartmentId: string) => {
    setExpandedIds((prev) => ({ ...prev, [apartmentId]: !prev[apartmentId] }));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[28px] border border-[#dfe8e2] bg-[linear-gradient(180deg,#f7fcf9_0%,#ffffff_100%)] p-5 shadow-[0_16px_40px_rgba(22,91,62,0.08)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-[#1f8f5f] px-4 py-2 text-sm font-semibold text-white">
                관리자 메모 체계도
              </span>
              <div>
                <h2 className="text-[26px] font-semibold leading-tight text-[#173226]">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#557060]">{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-2xl bg-white px-4 py-3 text-sm text-[#557060] shadow-sm">
                현재 티어
                <strong className="ml-2 text-[#173226]">{activeTier} 티어</strong>
              </span>
              <span className="rounded-2xl bg-white px-4 py-3 text-sm text-[#557060] shadow-sm">
                메모 반영
                <strong className="ml-2 text-[#173226]">{researchedApartments.length}개</strong>
              </span>
              <span className="rounded-2xl bg-white px-4 py-3 text-sm text-[#557060] shadow-sm">
                가격근접
                <strong className="ml-2 text-[#d65252]">{proximityCount}개</strong>
              </span>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="구, 아파트명, 비교군, 학교, 메모 내용 검색"
              className="h-14 rounded-[22px] border border-[#dfe8e2] bg-white px-5 text-sm text-[#173226] outline-none transition focus:border-[#1f8f5f] focus:ring-4 focus:ring-[#dff3e8]"
            />

            <button
              type="button"
              onClick={() => setShowOnlyProximity((prev) => !prev)}
              className={`rounded-[22px] border px-4 py-3 text-sm font-semibold transition-colors ${
                showOnlyProximity
                  ? 'border-[#eb5757] bg-[#fff2f2] text-[#d65252]'
                  : 'border-[#dfe8e2] bg-white text-[#4d665a] hover:bg-[#f6fbf8]'
              }`}
            >
              {showOnlyProximity ? '가격근접 ON만' : '전체 보기'}
            </button>

            <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
              {districts.map((district) => {
                const active = districtFilter === district;
                return (
                  <button
                    key={district}
                    type="button"
                    onClick={() => setDistrictFilter(district)}
                    className={`shrink-0 rounded-full border px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'border-[#1f8f5f] bg-[#e9f8f0] text-[#1f8f5f]'
                        : 'border-[#dfe8e2] bg-white text-[#4d665a] hover:bg-[#f6fbf8]'
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

      {orderedDistricts.length === 0 ? (
        <div className="rounded-[24px] border border-[#e6ebe7] bg-white px-6 py-16 text-center text-sm text-[#6a7f72]">
          조건에 맞는 메모 데이터가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orderedDistricts.map((district) => {
            const districtApartments = groupedApartments[district] ?? [];

            return (
              <section
                key={district}
                className="rounded-[20px] border border-[#e7ece8] bg-white shadow-[0_12px_28px_rgba(16,24,40,0.05)]"
              >
                <div className="flex items-center justify-between border-b border-[#eef2ef] px-4 py-3">
                  <h3 className="text-lg font-semibold text-[#173226]">{district}</h3>
                  <span className="rounded-full bg-[#f4f7f5] px-2.5 py-1 text-xs font-medium text-[#60786b]">
                    {districtApartments.length}개
                  </span>
                </div>

                <div className="space-y-2 p-3">
                  {districtApartments.map((apartment) => {
                    const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
                    if (!research) return null;

                    const priceEntry = prices[apartment.id];
                    const priceSummary = getPriceSummary(apartment, priceEntry);
                    const proximity = checkPriceProximity(priceEntry?.sizes);
                    const expanded = !!expandedIds[apartment.id];
                    const schoolRows = getSchoolRows(research);

                    return (
                      <article
                        key={apartment.id}
                        className="overflow-hidden rounded-[18px] border border-[#eef2ef] bg-[#fbfcfb]"
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-[16px] font-semibold text-[#173226]">
                                {apartment.name}
                              </h4>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {proximity.hasProximity ? (
                                  <span className="rounded-full bg-[#fff2f2] px-2 py-0.5 text-[10px] font-semibold text-[#d65252]">
                                    가격근접
                                  </span>
                                ) : null}
                                {research.leaderContext ? (
                                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold text-[#4764c5]">
                                    대장·준대장 언급
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-[11px] text-[#7d8f84]">현재가</div>
                              <div className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#2383e2]">
                                {priceSummary.current}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-white px-3 py-2">
                              <div className="text-[11px] text-[#7d8f84]">59㎡</div>
                              <div className="mt-1 text-[18px] font-bold leading-none text-[#173226]">
                                {priceSummary.s59}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-3 py-2">
                              <div className="text-[11px] text-[#7d8f84]">84㎡</div>
                              <div className="mt-1 text-[18px] font-bold leading-none text-[#173226]">
                                {priceSummary.s84}
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#5e7268]">
                            {research.headline}
                          </p>

                          {proximity.hasProximity ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {proximity.pairs.map((pair) => (
                                <span
                                  key={`${apartment.id}-${pair.smallSize}-${pair.largeSize}`}
                                  className="rounded-full bg-[#fff2f2] px-2 py-1 text-[11px] font-medium text-[#d65252]"
                                >
                                  {pair.smallSize}↔{pair.largeSize} 차이 {pair.diff}억 ({pair.diffPercent}%)
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="border-t border-[#eef2ef] bg-white px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(apartment.id)}
                            className="w-full rounded-xl border border-[#dde9e2] bg-[#f7fbf8] px-3 py-2 text-sm font-medium text-[#2b5a45] transition hover:bg-[#eef8f1]"
                          >
                            {expanded ? '메모 접기' : '메모 펼치기'}
                          </button>
                        </div>

                        {expanded ? (
                          <div className="space-y-3 border-t border-[#eef2ef] bg-[#fcfdfc] px-4 py-4">
                            {research.comparedWith.length > 0 ? (
                              <div>
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                  비교되는 아파트
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {research.comparedWith.map((item) => (
                                    <span
                                      key={`${apartment.id}-${item}`}
                                      className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-medium text-[#4764c5]"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                핵심 메모
                              </div>
                              <div className="space-y-2">
                                {research.noteLines.map((line) => (
                                  <p
                                    key={`${apartment.id}-${line}`}
                                    className="rounded-2xl bg-white px-3 py-2.5 text-[13px] leading-6 text-[#244035]"
                                  >
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl bg-white px-3 py-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                  학교
                                </div>
                                <div className="space-y-1 text-[13px] leading-6 text-[#355045]">
                                  {schoolRows.length > 0 ? (
                                    schoolRows.map((row) => <p key={`${apartment.id}-${row}`}>{row}</p>)
                                  ) : (
                                    <p>학교 언급 없음</p>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-2xl bg-white px-3 py-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                  대장·준대장 맥락
                                </div>
                                <p className="text-[13px] leading-6 text-[#355045]">
                                  {research.leaderContext ?? '대장/준대장 언급 없음'}
                                </p>
                              </div>
                            </div>

                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                출처
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {research.sources.map((source, index) => (
                                  <a
                                    key={`${source.url}-${index}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-[#d6e8db] bg-white px-3 py-1.5 text-[11px] font-medium text-[#2a6650] hover:bg-[#f1faf4]"
                                  >
                                    출처 {index + 1}
                                  </a>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7c8f84]">
                                관리자 추가 메모
                              </div>
                              <MemoEditor
                                apartmentId={apartment.id}
                                initialMemo={memos[apartment.id]}
                                onSave={onSaveMemo}
                                onDelete={onDeleteMemo}
                              />
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
