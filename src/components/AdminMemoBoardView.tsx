'use client';

import { useMemo, useState } from 'react';
import MemoEditor from '@/components/MemoEditor';
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

type OpenMap = Record<string, boolean>;

function formatPrice(value?: number | null) {
  if (value == null) return '--';
  if (Number.isInteger(value)) return `${value}억`;
  return `${value}억`;
}

function getPriceSummary(apartment: Apartment, priceEntry?: PriceMap[string]) {
  return {
    current: formatPrice(priceEntry?.price ?? apartment.currentPrice ?? null),
    s59: formatPrice(priceEntry?.sizes?.['59']?.price ?? null),
    s84: formatPrice(priceEntry?.sizes?.['84']?.price ?? null),
  };
}

function getSchoolSummary(research?: ApartmentFeatureResearch) {
  const parts = [
    research?.schools?.elementary ? `초 ${research.schools.elementary}` : null,
    research?.schools?.middle ? `중 ${research.schools.middle}` : null,
    research?.schools?.high ? `고 ${research.schools.high}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' / ') : '학교 정보 언급 없음';
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
  const [openMap, setOpenMap] = useState<OpenMap>({});
  const [districtOpenMap, setDistrictOpenMap] = useState<OpenMap>({});

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
      if (!research) return false;
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
  }, [apartments, memos, query]);

  const grouped = useMemo(() => {
    const groupedMap = new Map<string, Apartment[]>();

    for (const apartment of filtered) {
      const current = groupedMap.get(apartment.district) ?? [];
      current.push(apartment);
      groupedMap.set(apartment.district, current);
    }

    return Array.from(groupedMap.entries()).sort(([a], [b]) => a.localeCompare(b, 'ko'));
  }, [filtered]);

  const toggleCard = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDistrict = (district: string) => {
    setDistrictOpenMap((prev) => ({ ...prev, [district]: !(prev[district] ?? true) }));
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
                리서치 반영
                <strong className="ml-2 text-[#173226]">{filtered.length}개</strong>
              </span>
            </div>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="구, 아파트명, 비교 단지, 학교, 메모 내용 검색"
            className="h-14 rounded-[22px] border border-[#dfe8e2] bg-white px-5 text-sm text-[#173226] outline-none transition focus:border-[#1f8f5f] focus:ring-4 focus:ring-[#dff3e8]"
          />
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(([district, items]) => {
          const districtOpen = districtOpenMap[district] ?? true;

          return (
            <section
              key={district}
              className="rounded-[24px] border border-[#e6ebe7] bg-white p-4 shadow-[0_10px_24px_rgba(16,24,40,0.04)]"
            >
              <button
                type="button"
                onClick={() => toggleDistrict(district)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="text-lg font-semibold text-[#173226]">{district}</h3>
                  <p className="mt-1 text-xs text-[#6a7f72]">{items.length}개 단지</p>
                </div>
                <span className="rounded-full border border-[#d8e6dc] px-3 py-1 text-xs font-medium text-[#456957]">
                  {districtOpen ? '접기' : '펼치기'}
                </span>
              </button>

              {districtOpen ? (
                <div className="mt-4 grid gap-3">
                  {items.map((apartment) => {
                    const research = APARTMENT_FEATURE_RESEARCH_MAP[apartment.id];
                    if (!research) return null;

                    const open = openMap[apartment.id] ?? false;
                    const priceSummary = getPriceSummary(apartment, prices[apartment.id]);

                    return (
                      <article
                        key={apartment.id}
                        className="overflow-hidden rounded-[22px] border border-[#e5ece7] bg-[#fbfcfb] shadow-[0_8px_18px_rgba(18,52,38,0.04)]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCard(apartment.id)}
                          className="flex w-full flex-col gap-3 px-4 py-4 text-left sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#eef7f1] px-2.5 py-1 text-[11px] font-semibold text-[#1f8f5f]">
                                {apartment.district}
                              </span>
                              <span className="rounded-full bg-[#fff6dc] px-2.5 py-1 text-[11px] font-semibold text-[#9a6b00]">
                                리서치 메모 있음
                              </span>
                              {research.leaderContext ? (
                                <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px] font-semibold text-[#3b5bcc]">
                                  대장·준대장 맥락 포함
                                </span>
                              ) : null}
                            </div>

                            <h4 className="mt-2 text-lg font-semibold text-[#173226]">{apartment.name}</h4>
                            <p className="mt-2 text-sm text-[#3d5448]">{research.headline}</p>
                            <p className="mt-2 text-sm text-[#5f7667]">
                              현재 {priceSummary.current} · 59㎡ {priceSummary.s59} · 84㎡ {priceSummary.s84}
                            </p>
                          </div>

                          <span className="inline-flex shrink-0 items-center rounded-full border border-[#d8e6dc] px-3 py-1 text-xs font-medium text-[#456957]">
                            {open ? '메모 접기' : '메모 펼치기'}
                          </span>
                        </button>

                        {open ? (
                          <div className="border-t border-[#e9f0eb] bg-white px-4 py-4">
                            <div className="rounded-[18px] border border-[#e8f2eb] bg-[#f6fbf7] p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#dff3e8] px-2.5 py-1 text-[11px] font-semibold text-[#1f8f5f]">
                                  자동 리서치 메모
                                </span>
                                <span className="text-xs text-[#6f8477]">
                                  비교 단지: {research.comparedWith.length > 0 ? research.comparedWith.join(', ') : '언급 없음'}
                                </span>
                              </div>

                              <div className="mt-4 space-y-2 text-sm leading-7 text-[#22392c]">
                                {research.noteLines.map((line) => (
                                  <p key={line} className="rounded-2xl bg-white/70 px-4 py-2">
                                    {line}
                                  </p>
                                ))}
                              </div>

                              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-2xl bg-white px-4 py-3">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#769180]">
                                    학교
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#365143]">{getSchoolSummary(research)}</p>
                                </div>

                                <div className="rounded-2xl bg-white px-4 py-3">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#769180]">
                                    대장/준대장 맥락
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#365143]">
                                    {research.leaderContext ?? '특별히 반복된 대장/준대장 언급 없음'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {research.sources.map((source, index) => (
                                  <a
                                    key={`${source.url}-${index}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-[#d6e8db] bg-white px-3 py-1.5 text-xs font-medium text-[#2a6650] hover:bg-[#f1faf4]"
                                  >
                                    출처 {index + 1}
                                  </a>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8f82]">
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
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
