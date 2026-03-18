'use client';

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

const SQUARE_METER = '\u33A1';
const EOK = '\uC5B5';
const OWNER_BADGE = '\uC9D1\uC8FC\uC778\uC778\uC99DX';
const DISTRICT_LABEL = '\uAD6C';
const APARTMENT_LABEL = '\uC544\uD30C\uD2B8';
const ARTICLE_LABEL = '\uB9E4\uBB3C';
const COUNT_LABEL = '\uAC1C';

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

  const fallbackPrice = apartment.currentPrice ?? apartment.basePrice;
  const fallbackArea = apartment.areaName || apartment.size;
  return `${fallbackArea} ${formatPrice(fallbackPrice)}`;
}

export default function MindMapView({
  apartments,
  memos,
  title,
  subtitle,
}: MindMapViewProps) {
  const grouped = apartments.reduce<Record<string, MindMapApartment[]>>((acc, apartment) => {
    if (!acc[apartment.district]) acc[apartment.district] = [];
    acc[apartment.district].push(apartment);
    return acc;
  }, {});

  const districts = Object.entries(grouped)
    .map(([district, items]) => ({
      district,
      items: [...items].sort(
        (a, b) => (a.currentPrice ?? a.basePrice) - (b.currentPrice ?? b.basePrice)
      ),
      minPrice: Math.min(...items.map((item) => item.currentPrice ?? item.basePrice)),
    }))
    .sort((a, b) => a.minPrice - b.minPrice);

  return (
    <section className="rounded-[28px] border border-[#d9cff8] bg-[radial-gradient(circle_at_top,_#efe9ff_0%,_#e8e4fb_35%,_#f5f1ff_100%)] px-4 py-5 shadow-[0_20px_60px_rgba(109,82,255,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex rounded-full bg-[#6d4dff] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(109,77,255,0.22)]">
            {title}
          </h2>
          {subtitle ? <p className="mt-2 text-xs text-[#6f6895]">{subtitle}</p> : null}
        </div>
        <div className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-[11px] text-[#5d567a] backdrop-blur">
          {`${DISTRICT_LABEL} ${districts.length}${COUNT_LABEL} | ${APARTMENT_LABEL} ${apartments.length}${COUNT_LABEL}`}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-[#7f78a8]">
          넓은 마인드맵이라 좌우로 스크롤해서 보세요.
        </div>
        <div className="rounded-full border border-[#d9cff8] bg-white/70 px-3 py-1 text-[11px] text-[#6d4dff] shadow-[0_8px_18px_rgba(109,77,255,0.08)]">
          좌우 스크롤 가능
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-[#f4f0ff] to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-[#f4f0ff] to-transparent md:block" />

        <div className="overflow-x-auto px-1 pb-4">
          <div className="mx-auto w-max min-w-full px-8 py-4 pr-16">
            <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-[#6d4dff] px-5 py-3 text-center text-white shadow-[0_18px_30px_rgba(109,77,255,0.24)]">
              <div className="text-[15px] font-semibold">{title}</div>
              {subtitle ? <div className="mt-1 text-[11px] text-white/85">{subtitle}</div> : null}
            </div>
            </div>

            <div className="relative flex items-start gap-8">
              <div className="pointer-events-none absolute left-12 right-12 top-6 h-px bg-[#9f8cff]" />

              {districts.map(({ district, items }) => (
                <div key={district} className="relative w-[260px] pt-6">
                  <div className="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-[#9f8cff]" />

                  <div className="relative mx-auto w-fit rounded-2xl bg-[#7b3ff2] px-4 py-2 text-center text-white shadow-[0_14px_24px_rgba(123,63,242,0.26)]">
                    <div className="text-[13px] font-semibold">{district}</div>
                    <div className="mt-0.5 text-[11px] text-white/80">{`${items.length}${COUNT_LABEL}`}</div>
                  </div>

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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
