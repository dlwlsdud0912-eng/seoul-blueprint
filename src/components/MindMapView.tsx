'use client';

import { useMemo, useRef, useState } from 'react';
import { Apartment, MemoMap, TierKey } from '@/types';

type MindMapApartment = Apartment & {
  articleCount?: number;
  areaName?: string;
  sizes?: Record<string, { price: number; count: number } | null>;
  ownerVerified?: boolean;
};

interface MindMapViewProps {
  apartments: MindMapApartment[];
  memos: MemoMap;
  title: string;
  subtitle?: string;
  activeTier: TierKey;
}

type DistrictGroup = {
  district: string;
  items: MindMapApartment[];
  minPrice: number;
};

const SQUARE_METER = '\u33A1';
const EOK = '\uC5B5';
const OWNER_BADGE = '\uC9D1\uC8FC\uC778\uC778\uC99DX';
const DISTRICT_LABEL = '\uAD6C';
const APARTMENT_LABEL = '\uC544\uD30C\uD2B8';
const ARTICLE_LABEL = '\uB9E4\uBB3C';
const COUNT_LABEL = '\uAC1C';
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.1;

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '--';
  return `${value}${EOK}`;
}

function formatPriceLabel(apartment: MindMapApartment) {
  const size59 = apartment.sizes?.['59'];
  const size84 = apartment.sizes?.['84'];

  if (size59 || size84) {
    return [
      `59${SQUARE_METER} ${formatPrice(size59?.price)}`,
      `84${SQUARE_METER} ${formatPrice(size84?.price)}`,
    ].join('  |  ');
  }

  const fallbackPrice = apartment.currentPrice;
  const fallbackArea = apartment.areaName || apartment.size;
  return `${fallbackArea} ${formatPrice(fallbackPrice)}`;
}

export default function MindMapView({
  apartments,
  memos,
  title,
  subtitle,
}: MindMapViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const districtRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const [zoom, setZoom] = useState(1);
  const [collapsedDistricts, setCollapsedDistricts] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const districts = useMemo<DistrictGroup[]>(() => {
    const grouped = apartments.reduce<Record<string, MindMapApartment[]>>((acc, apartment) => {
      if (!acc[apartment.district]) acc[apartment.district] = [];
      acc[apartment.district].push(apartment);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([district, items]) => ({
        district,
        items: [...items].sort(
          (a, b) => (a.currentPrice ?? Number.POSITIVE_INFINITY) - (b.currentPrice ?? Number.POSITIVE_INFINITY)
        ),
        minPrice: Math.min(...items.map((item) => item.currentPrice ?? Number.POSITIVE_INFINITY)),
      }))
      .sort((a, b) => a.minPrice - b.minPrice);
  }, [apartments]);

  const filteredDistricts = useMemo<DistrictGroup[]>(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return districts;

    return districts
      .map((district) => {
        const items = district.items.filter((apartment) => {
          const memo = memos[apartment.id] ?? '';
          return (
            district.district.toLowerCase().includes(keyword) ||
            apartment.name.toLowerCase().includes(keyword) ||
            memo.toLowerCase().includes(keyword)
          );
        });

        return {
          ...district,
          items,
          minPrice: items.length
            ? Math.min(...items.map((item) => item.currentPrice ?? Number.POSITIVE_INFINITY))
            : district.minPrice,
        };
      })
      .filter((district) => district.items.length > 0);
  }, [districts, memos, searchQuery]);

  const visibleApartmentCount = useMemo(
    () =>
      filteredDistricts.reduce((sum, district) => {
        return sum + (collapsedDistricts[district.district] ? 0 : district.items.length);
      }, 0),
    [collapsedDistricts, filteredDistricts]
  );

  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;

  function scrollToDistrict(district: string) {
    const container = scrollRef.current;
    const target = districtRefs.current[district];
    if (!container || !target) return;

    const left = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
    container.scrollTo({
      left: Math.max(left, 0),
      behavior: 'smooth',
    });
  }

  function toggleDistrict(district: string) {
    setCollapsedDistricts((current) => ({
      ...current,
      [district]: !current[district],
    }));
  }

  function setAllDistricts(collapsed: boolean) {
    setCollapsedDistricts(
      Object.fromEntries(filteredDistricts.map((district) => [district.district, collapsed]))
    );
  }

  async function exportToPdf() {
    setPdfLoading(true);
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const baseTitle = title.replace(/\s+/g, '-');
      const filename = `${baseTitle}-${y}${m}${d}.pdf`;

      const payload = {
        title,
        subtitle,
        filename,
        districts: filteredDistricts.map((district) => ({
          district: district.district,
          items: district.items.map((apartment) => ({
            id: apartment.id,
            name: apartment.name,
            priceLabel: formatPriceLabel(apartment),
            articleCount: apartment.articleCount,
            ownerVerified: apartment.ownerVerified,
            memo: memos[apartment.id] ?? '',
          })),
        })),
      };

      const response = await fetch('/api/mindmap-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('PDF export failed');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button')) return;

    const container = scrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    const dragState = dragStateRef.current;
    if (!container || !dragState.active) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    container.scrollLeft = dragState.startScrollLeft - deltaX;
    container.scrollTop = dragState.startScrollTop - deltaY;
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const container = scrollRef.current;
    if (container && container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current.active = false;
    setIsDragging(false);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    setZoom((current) => {
      const next = event.deltaY > 0 ? current - ZOOM_STEP : current + ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next.toFixed(2))));
    });
  }

  return (
    <section className="rounded-[28px] border border-[#d9cff8] bg-[radial-gradient(circle_at_top,_#efe9ff_0%,_#e8e4fb_35%,_#f5f1ff_100%)] px-4 py-5 shadow-[0_20px_60px_rgba(109,82,255,0.08)]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="inline-flex rounded-full bg-[#6d4dff] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(109,77,255,0.22)]">
            {title}
          </h2>
          {subtitle ? <p className="mt-2 text-xs text-[#6f6895]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-[11px] text-[#5d567a] backdrop-blur">
            {`${DISTRICT_LABEL} ${filteredDistricts.length}${COUNT_LABEL} | ${APARTMENT_LABEL} ${filteredDistricts.reduce((sum, district) => sum + district.items.length, 0)}${COUNT_LABEL}`}
          </div>
          <button
            onClick={exportToPdf}
            disabled={pdfLoading || filteredDistricts.length === 0}
            className="rounded-full border border-[#d9cff8] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#6d4dff] shadow-[0_8px_18px_rgba(109,77,255,0.08)] transition-colors hover:bg-white"
          >
            {pdfLoading ? 'PDF 생성 중...' : 'PDF 저장'}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-[11px] text-[#7f78a8]">
          넓은 마인드맵이라 드래그, 좌우 스크롤, Ctrl/⌘ + 휠 줌으로 탐색할 수 있습니다.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="구, 아파트, 메모 검색"
            className="min-w-[220px] rounded-full border border-[#d9cff8] bg-white/85 px-3 py-1.5 text-[11px] text-[#37352f] shadow-[0_8px_18px_rgba(109,77,255,0.06)] outline-none placeholder:text-[#9d97bf]"
          />
          <div className="inline-flex rounded-full border border-[#d9cff8] bg-white/75 p-1 shadow-[0_8px_18px_rgba(109,77,255,0.08)]">
            <button
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))}
              disabled={!canZoomOut}
              className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#6d4dff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              -
            </button>
            <div className="flex min-w-[56px] items-center justify-center text-[11px] font-semibold text-[#554a85]">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))}
              disabled={!canZoomIn}
              className="rounded-full px-3 py-1 text-[11px] font-semibold text-[#6d4dff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            onClick={() => setAllDistricts(false)}
            className="rounded-full border border-[#d9cff8] bg-white/75 px-3 py-1.5 text-[11px] font-medium text-[#6d4dff] shadow-[0_8px_18px_rgba(109,77,255,0.08)]"
          >
            전체 펼치기
          </button>
          <button
            onClick={() => setAllDistricts(true)}
            className="rounded-full border border-[#d9cff8] bg-white/75 px-3 py-1.5 text-[11px] font-medium text-[#6d4dff] shadow-[0_8px_18px_rgba(109,77,255,0.08)]"
          >
            전체 접기
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-[24px] border border-white/70 bg-white/55 p-3 shadow-[0_10px_30px_rgba(109,77,255,0.06)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[12px] font-semibold text-[#5e4ec2]">미니맵</div>
          <div className="text-[11px] text-[#7f78a8]">보이는 카드 {visibleApartmentCount}개</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredDistricts.map((district) => {
            const isCollapsed = !!collapsedDistricts[district.district];
            return (
              <button
                key={district.district}
                onClick={() => scrollToDistrict(district.district)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  isCollapsed
                    ? 'border-[#ddd6ff] bg-[#f5f1ff] text-[#8b82b5]'
                    : 'border-[#cfc1ff] bg-[#efe9ff] text-[#6d4dff]'
                }`}
              >
                {district.district} · {district.items.length}개
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-[#f4f0ff] to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-[#f4f0ff] to-transparent md:block" />

        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onWheel={handleWheel}
          className={`overflow-x-auto px-1 pb-4 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        >
          <div
            className="mx-auto w-max min-w-full px-8 py-4 pr-16"
            style={{ zoom } as React.CSSProperties}
          >
            <div className="mb-8 flex justify-center">
              <div className="rounded-2xl bg-[#6d4dff] px-5 py-3 text-center text-white shadow-[0_18px_30px_rgba(109,77,255,0.24)]">
                <div className="text-[15px] font-semibold">{title}</div>
                {subtitle ? <div className="mt-1 text-[11px] text-white/85">{subtitle}</div> : null}
              </div>
            </div>

            <div className="relative flex items-start gap-8">
              <div className="pointer-events-none absolute left-12 right-12 top-6 h-px bg-[#9f8cff]" />

              {filteredDistricts.map(({ district, items }) => {
                const isCollapsed = !!collapsedDistricts[district];

                return (
                  <div
                    key={district}
                    ref={(node) => {
                      districtRefs.current[district] = node;
                    }}
                    className="relative w-[260px] pt-6"
                  >
                    <div className="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-[#9f8cff]" />

                    <button
                      type="button"
                      onClick={() => toggleDistrict(district)}
                      className="relative mx-auto flex w-fit items-center gap-2 rounded-2xl bg-[#7b3ff2] px-4 py-2 text-center text-white shadow-[0_14px_24px_rgba(123,63,242,0.26)] transition-transform hover:-translate-y-0.5"
                    >
                      <div>
                        <div className="text-[13px] font-semibold">{district}</div>
                        <div className="mt-0.5 text-[11px] text-white/80">{`${items.length}${COUNT_LABEL}`}</div>
                      </div>
                      <span className="text-[11px] text-white/80">{isCollapsed ? '펼치기' : '접기'}</span>
                    </button>

                    {!isCollapsed ? (
                      <div className="mt-5 flex flex-col gap-4">
                        {items.map((apartment) => {
                          const desktopUrl = apartment.naverComplexId
                            ? `https://new.land.naver.com/complexes/${apartment.naverComplexId}?markerId=${apartment.naverComplexId}&a=APT&e=RETAIL`
                            : undefined;
                          const memo = memos[apartment.id];

                          return (
                            <div key={apartment.id} className="relative pl-7">
                              <div className="pointer-events-none absolute left-[13px] top-[-12px] h-[calc(100%+16px)] w-px bg-[#a895ff]" />
                              <div className="pointer-events-none absolute left-[13px] top-7 h-px w-4 bg-[#a895ff]" />

                              <a
                                href={desktopUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-[20px] border border-white/60 bg-[#7b3ff2] px-4 py-3 text-white shadow-[0_12px_22px_rgba(88,52,201,0.18)] transition-transform duration-200 hover:-translate-y-0.5 no-underline"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-[13px] font-semibold leading-snug">{apartment.name}</div>
                                  {apartment.ownerVerified === false ? (
                                    <span className="shrink-0 rounded-full bg-[#fff3b2] px-2 py-0.5 text-[10px] font-semibold text-[#7b5d00]">
                                      {OWNER_BADGE}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 text-[12px] text-white/92">{formatPriceLabel(apartment)}</div>
                                <div className="mt-1 text-[10px] text-white/70">
                                  {`${ARTICLE_LABEL} ${apartment.articleCount ?? 0}${COUNT_LABEL}`}
                                </div>
                              </a>

                              {memo ? (
                                <div className="ml-4 mt-2 rounded-md border border-[#efe08b] bg-[#fff4ad] px-3 py-2 text-[11px] leading-relaxed text-[#5d4a00] shadow-[0_8px_16px_rgba(201,171,32,0.12)]">
                                  {memo}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-[18px] border border-dashed border-[#cbbcff] bg-white/45 px-4 py-3 text-[11px] text-[#7f78a8]">
                        이 구는 접혀 있습니다. 미니맵에서 이동하거나 다시 펼쳐서 볼 수 있습니다.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
