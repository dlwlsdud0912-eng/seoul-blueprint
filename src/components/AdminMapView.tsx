'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Apartment, MemoMap, TierKey } from '@/types';
import { getComplexCoordinate } from '@/data/complex-coordinates';
import { getTierLabel } from '@/data/tiers';

declare global {
  interface Window {
    naver?: any;
  }
}

type MapApartment = Apartment & {
  articleCount?: number;
  areaName?: string;
  sizes?: Record<string, { price: number; count: number } | null>;
  ownerVerified?: boolean;
  statusBadges?: string[];
};

interface AdminMapViewProps {
  apartments: MapApartment[];
  memos: MemoMap;
  title: string;
  subtitle?: string;
  activeTier: TierKey;
}

type MarkerApartment = MapApartment & {
  lat: number;
  lng: number;
  effectivePrice: number;
  memo: string;
};

type MapProvider = 'loading' | 'naver' | 'leaflet';

type MapRuntime =
  | {
      provider: 'naver';
      map: any;
      naver: any;
      overlays: any[];
      infoWindow: any | null;
    }
  | {
      provider: 'leaflet';
      map: any;
      leaflet: any;
      layer: any;
    };

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID ?? '';
const NAVER_SCRIPT_ID = 'naver-maps-sdk';
const TIER_MARKER_COLORS: Record<TierKey, string> = {
  '10': '#2383e2',
  '12': '#2b8cff',
  '14': '#3f88ff',
  '16': '#6d4dff',
  '18': '#7c3aed',
  '20': '#8b5cf6',
  '22': '#a162f7',
  '24': '#c084fc',
  '26': '#d946ef',
  '28': '#ec4899',
  '30': '#f97316',
  '32': '#f59e0b',
  '50': '#ef4444',
};

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '--';
  return `${value}억`;
}

function formatPriceSummary(apartment: MarkerApartment) {
  const size59 = apartment.sizes?.['59'];
  const size84 = apartment.sizes?.['84'];

  if (size59 || size84) {
    return `59㎡ ${formatPrice(size59?.price)} | 84㎡ ${formatPrice(size84?.price)}`;
  }

  return `${apartment.areaName || apartment.size} ${formatPrice(apartment.currentPrice)}`;
}

function getMarkerColor(apartment: MarkerApartment, activeTier: TierKey) {
  if (apartment.statusBadges?.some((badge) => badge.includes('매매 0건'))) {
    return '#a1a8b8';
  }
  if (apartment.ownerVerified === false) {
    return '#f59e0b';
  }
  return TIER_MARKER_COLORS[activeTier] ?? '#0f9d7a';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createNaverMarkerHtml(apartment: MarkerApartment, activeTier: TierKey, selected: boolean) {
  const color = getMarkerColor(apartment, activeTier);
  const size = selected ? 26 : 20;
  const border = selected ? '#111827' : '#ffffff';
  return `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${color};
      border:3px solid ${border};
      box-shadow:0 10px 24px rgba(15,23,42,0.18);
    "></div>
  `;
}

function createNaverTooltipHtml(apartment: MarkerApartment) {
  return `
    <div style="padding:10px 12px;min-width:190px;font-family:'Noto Sans KR',sans-serif;">
      <div style="font-size:12px;color:#5b6f61;">${escapeHtml(apartment.district)}</div>
      <div style="margin-top:4px;font-size:15px;font-weight:700;color:#132b1e;">${escapeHtml(apartment.name)}</div>
      <div style="margin-top:6px;font-size:13px;color:#355847;">${escapeHtml(formatPriceSummary(apartment))}</div>
    </div>
  `;
}

function loadNaverMapsScript(clientId: string) {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window unavailable'));
      return;
    }

    if (window.naver?.maps) {
      resolve(window.naver);
      return;
    }

    const existing = document.getElementById(NAVER_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.naver));
      existing.addEventListener('error', () => reject(new Error('NAVER Maps load failed')));
      return;
    }

    const script = document.createElement('script');
    script.id = NAVER_SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) {
        resolve(window.naver);
        return;
      }
      reject(new Error('NAVER Maps unavailable after load'));
    };
    script.onerror = () => reject(new Error('NAVER Maps load failed'));
    document.head.appendChild(script);
  });
}

export default function AdminMapView({
  apartments,
  memos,
  title,
  subtitle,
  activeTier,
}: AdminMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<MapRuntime | null>(null);
  const didFitBoundsRef = useRef(false);

  const [provider, setProvider] = useState<MapProvider>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showOnlyWithPrice, setShowOnlyWithPrice] = useState(false);

  const mappedApartments = useMemo<MarkerApartment[]>(() => {
    return apartments
      .map((apartment) => {
        const coordinate = getComplexCoordinate(apartment.naverComplexId);
        if (!coordinate) return null;

        return {
          ...apartment,
          lat: coordinate.lat,
          lng: coordinate.lng,
          effectivePrice: apartment.currentPrice ?? Number.POSITIVE_INFINITY,
          memo: memos[apartment.id] ?? '',
        };
      })
      .filter((apartment): apartment is MarkerApartment => apartment !== null);
  }, [apartments, memos]);

  const filteredApartments = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return mappedApartments
      .filter((apartment) => {
        if (showOnlyWithPrice && apartment.currentPrice == null) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return (
          apartment.district.toLowerCase().includes(keyword) ||
          apartment.name.toLowerCase().includes(keyword) ||
          apartment.memo.toLowerCase().includes(keyword) ||
          apartment.statusBadges?.some((badge) => badge.toLowerCase().includes(keyword))
        );
      })
      .sort((a, b) => a.effectivePrice - b.effectivePrice);
  }, [mappedApartments, query, showOnlyWithPrice]);

  const selectedApartment =
    filteredApartments.find((apartment) => apartment.id === selectedId) ?? filteredApartments[0] ?? null;

  const missingCoordinateCount = apartments.length - mappedApartments.length;

  useEffect(() => {
    didFitBoundsRef.current = false;
  }, [activeTier, query, showOnlyWithPrice]);

  useEffect(() => {
    if (!filteredApartments.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredApartments.some((apartment) => apartment.id === selectedId)) {
      setSelectedId(filteredApartments[0].id);
    }
  }, [filteredApartments, selectedId]);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      if (!containerRef.current) {
        return;
      }

      if (NAVER_CLIENT_ID) {
        try {
          const naver = await loadNaverMapsScript(NAVER_CLIENT_ID);
          if (!mounted || !containerRef.current) {
            return;
          }

          const map = new naver.maps.Map(containerRef.current, {
            center: new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            zoom: 11,
            mapDataControl: false,
            scaleControl: false,
            logoControl: true,
            zoomControl: true,
            zoomControlOptions: {
              position: naver.maps.Position.TOP_LEFT,
            },
          });

          runtimeRef.current = {
            provider: 'naver',
            map,
            naver,
            overlays: [],
            infoWindow: null,
          };
          setProvider('naver');
          return;
        } catch {
          // Fallback below.
        }
      }

      const leaflet = await import('leaflet');
      if (!mounted || !containerRef.current) {
        return;
      }

      const map = leaflet.map(containerRef.current, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        })
        .addTo(map);

      const layer = leaflet.layerGroup().addTo(map);

      runtimeRef.current = {
        provider: 'leaflet',
        map,
        leaflet,
        layer,
      };
      setProvider('leaflet');
    }

    initMap();

    return () => {
      mounted = false;
      if (runtimeRef.current?.provider === 'leaflet') {
        runtimeRef.current.layer?.clearLayers?.();
        runtimeRef.current.map?.remove?.();
      }
      if (runtimeRef.current?.provider === 'naver') {
        runtimeRef.current.overlays.forEach((overlay) => overlay.setMap?.(null));
        runtimeRef.current.infoWindow?.close?.();
      }
      runtimeRef.current = null;
      didFitBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    if (!filteredApartments.length) {
      if (runtime.provider === 'leaflet') {
        runtime.layer.clearLayers();
      } else {
        runtime.overlays.forEach((overlay) => overlay.setMap(null));
        runtime.overlays = [];
        runtime.infoWindow?.close();
      }
      return;
    }

    if (runtime.provider === 'leaflet') {
      runtime.layer.clearLayers();
      const bounds = runtime.leaflet.latLngBounds([]);

      filteredApartments.forEach((apartment) => {
        const marker = runtime.leaflet.circleMarker([apartment.lat, apartment.lng], {
          radius: apartment.id === selectedApartment?.id ? 9 : 7,
          weight: apartment.id === selectedApartment?.id ? 3 : 2,
          color: apartment.id === selectedApartment?.id ? '#1d1d1f' : '#ffffff',
          fillColor: getMarkerColor(apartment, activeTier),
          fillOpacity: 0.92,
        });

        marker.on('click', () => setSelectedId(apartment.id));
        marker.bindTooltip(
          `${apartment.district} · ${apartment.name}<br/>${formatPriceSummary(apartment)}`,
          { direction: 'top' }
        );
        marker.addTo(runtime.layer);
        bounds.extend([apartment.lat, apartment.lng]);
      });

      if (!didFitBoundsRef.current) {
        if (filteredApartments.length === 1) {
          runtime.map.setView([filteredApartments[0].lat, filteredApartments[0].lng], 14);
        } else {
          runtime.map.fitBounds(bounds.pad(0.12));
        }
        didFitBoundsRef.current = true;
      }
      return;
    }

    runtime.overlays.forEach((overlay) => overlay.setMap(null));
    runtime.overlays = [];
    runtime.infoWindow?.close();

    const bounds = new runtime.naver.maps.LatLngBounds();
    const infoWindow = new runtime.naver.maps.InfoWindow({
      backgroundColor: '#ffffff',
      borderColor: '#dce6dd',
      borderWidth: 1,
      disableAnchor: false,
      pixelOffset: new runtime.naver.maps.Point(0, -10),
    });

    filteredApartments.forEach((apartment) => {
      const marker = new runtime.naver.maps.Marker({
        position: new runtime.naver.maps.LatLng(apartment.lat, apartment.lng),
        map: runtime.map,
        icon: {
          content: createNaverMarkerHtml(apartment, activeTier, apartment.id === selectedApartment?.id),
          anchor: new runtime.naver.maps.Point(
            apartment.id === selectedApartment?.id ? 13 : 10,
            apartment.id === selectedApartment?.id ? 13 : 10
          ),
        },
      });

      runtime.naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedId(apartment.id);
      });

      runtime.naver.maps.Event.addListener(marker, 'mouseover', () => {
        infoWindow.setContent(createNaverTooltipHtml(apartment));
        infoWindow.open(runtime.map, marker);
      });

      runtime.naver.maps.Event.addListener(marker, 'mouseout', () => {
        infoWindow.close();
      });

      runtime.overlays.push(marker);
      bounds.extend(marker.getPosition());
    });

    runtime.infoWindow = infoWindow;

    if (!didFitBoundsRef.current) {
      if (filteredApartments.length === 1) {
        runtime.map.setCenter(new runtime.naver.maps.LatLng(filteredApartments[0].lat, filteredApartments[0].lng));
        runtime.map.setZoom(14);
      } else {
        runtime.map.fitBounds(bounds, {
          top: 48,
          right: 48,
          bottom: 48,
          left: 48,
        });
      }
      didFitBoundsRef.current = true;
    }
  }, [filteredApartments, selectedApartment]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || !selectedApartment) {
      return;
    }

    if (runtime.provider === 'leaflet') {
      runtime.map.panTo([selectedApartment.lat, selectedApartment.lng], {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    runtime.map.panTo(new runtime.naver.maps.LatLng(selectedApartment.lat, selectedApartment.lng), {
      duration: 300,
    });
  }, [selectedApartment]);

  function resetViewport() {
    const runtime = runtimeRef.current;
    if (!runtime || !filteredApartments.length) {
      return;
    }

    if (runtime.provider === 'leaflet') {
      const bounds = runtime.leaflet.latLngBounds(filteredApartments.map((apartment) => [apartment.lat, apartment.lng]));
      if (filteredApartments.length === 1) {
        runtime.map.setView([filteredApartments[0].lat, filteredApartments[0].lng], 14);
      } else {
        runtime.map.fitBounds(bounds.pad(0.12));
      }
      return;
    }

    const bounds = new runtime.naver.maps.LatLngBounds();
    filteredApartments.forEach((apartment) => {
      bounds.extend(new runtime.naver.maps.LatLng(apartment.lat, apartment.lng));
    });

    if (filteredApartments.length === 1) {
      runtime.map.setCenter(new runtime.naver.maps.LatLng(filteredApartments[0].lat, filteredApartments[0].lng));
      runtime.map.setZoom(14);
      return;
    }

    runtime.map.fitBounds(bounds, {
      top: 48,
      right: 48,
      bottom: 48,
      left: 48,
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[#d8e4d9] bg-[linear-gradient(180deg,#f4fbf4_0%,#eef7f0_100%)] p-4 shadow-[0_20px_45px_rgba(74,124,89,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-[#1f8f5f] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(31,143,95,0.2)]">
              관리자 지도
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#163325]">{title}</h2>
              <p className="mt-1 text-sm text-[#557260]">
                {subtitle || '네이버 단지 좌표와 현재 가격 데이터를 지도 위에서 함께 검수합니다.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#4f6857] sm:grid-cols-4">
            <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2">
              <div className="text-[11px] text-[#7b8e80]">현재 티어</div>
              <div className="mt-1 font-semibold text-[#183726]">{getTierLabel(activeTier)}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2">
              <div className="text-[11px] text-[#7b8e80]">표시 단지</div>
              <div className="mt-1 font-semibold text-[#183726]">{filteredApartments.length}개</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2">
              <div className="text-[11px] text-[#7b8e80]">좌표 보유</div>
              <div className="mt-1 font-semibold text-[#183726]">{mappedApartments.length}개</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2">
              <div className="text-[11px] text-[#7b8e80]">좌표 누락</div>
              <div className="mt-1 font-semibold text-[#183726]">{missingCoordinateCount}개</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/72 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="구, 아파트명, 메모, 상태 배지 검색"
                className="w-full rounded-2xl border border-[#d9e6db] bg-white px-4 py-3 text-sm text-[#173325] outline-none transition focus:border-[#1f8f5f] focus:ring-2 focus:ring-[#d4efde] sm:max-w-md"
              />
              <label className="inline-flex items-center gap-2 rounded-2xl border border-[#d9e6db] bg-white px-4 py-3 text-sm text-[#355847]">
                <input
                  type="checkbox"
                  checked={showOnlyWithPrice}
                  onChange={(event) => setShowOnlyWithPrice(event.target.checked)}
                  className="h-4 w-4 rounded border-[#c6d8cb] text-[#1f8f5f]"
                />
                가격 있는 단지만
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowOnlyWithPrice(false);
                }}
                className="rounded-2xl border border-[#d9e6db] bg-white px-4 py-3 text-sm text-[#355847] transition hover:bg-[#f4fbf4]"
              >
                필터 초기화
              </button>
              <button
                type="button"
                onClick={resetViewport}
                className="rounded-2xl bg-[#173f2a] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_28px_rgba(23,63,42,0.16)] transition hover:-translate-y-0.5"
              >
                지도 맞춤 보기
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#4f6857]">
            <span
              data-testid="admin-map-provider"
              className="rounded-full bg-white px-3 py-1.5"
            >
              지도 베이스: {provider === 'naver' ? '네이버 지도' : provider === 'leaflet' ? 'OpenStreetMap' : '불러오는 중'}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5">좌표 기준: 네이버 단지 좌표</span>
            <span className="rounded-full bg-white px-3 py-1.5">클릭 시 우측 상세 + 네이버 링크</span>
            {provider !== 'naver' ? (
              <span className="rounded-full bg-[#fff4d9] px-3 py-1.5 text-[#8d6a12]">
                네이버 지도 키가 없어서 기본 지도로 표시 중
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[28px] border border-[#e4ece5] bg-white shadow-[0_18px_45px_rgba(54,84,63,0.08)]">
          <div className="flex items-center justify-between border-b border-[#edf2ee] px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-[#163325]">단지 지도</h3>
              <p className="mt-1 text-xs text-[#708576]">
                핀을 클릭하면 우측 카드가 바뀌고, 지도는 해당 단지로 이동합니다.
              </p>
            </div>
            <div className="text-xs text-[#708576]">
              {filteredApartments.length ? `${filteredApartments.length}개 단지 표시 중` : '표시할 단지가 없습니다'}
            </div>
          </div>
          <div ref={containerRef} className="h-[62vh] min-h-[520px] w-full bg-[#eef5ef]" />
        </section>

        <aside className="flex flex-col overflow-hidden rounded-[28px] border border-[#e4ece5] bg-white shadow-[0_18px_45px_rgba(54,84,63,0.08)]">
          <div className="border-b border-[#edf2ee] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#163325]">선택 단지</h3>
            <p className="mt-1 text-xs text-[#708576]">지도와 목록을 함께 보면서 검수할 수 있습니다.</p>
          </div>

          {selectedApartment ? (
            <div className="space-y-4 px-4 py-4">
              <div className="rounded-[24px] border border-[#e8efe9] bg-[linear-gradient(180deg,#f7fbf8_0%,#eef6f0_100%)] p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#567260]">
                  <span className="rounded-full bg-white px-3 py-1.5">{selectedApartment.district}</span>
                  <span className="rounded-full bg-white px-3 py-1.5">
                    {selectedApartment.articleCount ? `매물 ${selectedApartment.articleCount}개` : '매물 정보 확인'}
                  </span>
                </div>
                <div className="mt-3 text-xl font-semibold text-[#143021]">{selectedApartment.name}</div>
                <div className="mt-2 text-sm text-[#406050]">{formatPriceSummary(selectedApartment)}</div>
                <div className="mt-2 text-xs text-[#567260]">
                  기준가 {formatPrice(selectedApartment.basePrice)}
                  {selectedApartment.currentPrice != null ? ` · 현재 ${formatPrice(selectedApartment.currentPrice)}` : ''}
                </div>
                {selectedApartment.statusBadges && selectedApartment.statusBadges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedApartment.statusBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-[#d8e4d9] bg-white px-2.5 py-1 text-[11px] text-[#5b6f61]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`https://new.land.naver.com/complexes/${selectedApartment.naverComplexId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-[#1f8f5f] px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5"
                  >
                    네이버 단지 열기
                  </a>
                  <button
                    type="button"
                    onClick={resetViewport}
                    className="rounded-2xl border border-[#d8e4d9] bg-white px-4 py-2 text-sm text-[#355847] transition hover:bg-[#f4fbf4]"
                  >
                    지도 다시 맞춤
                  </button>
                </div>
              </div>

              {selectedApartment.memo ? (
                <div className="rounded-[24px] border border-[#efe7bf] bg-[#fff8d9] p-4">
                  <div className="text-xs font-semibold text-[#8b6d18]">메모</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-[#6f5614]">{selectedApartment.memo}</div>
                </div>
              ) : null}

              <div className="max-h-[42vh] overflow-y-auto rounded-[24px] border border-[#edf2ee] bg-[#fbfcfb] p-2">
                <div className="mb-2 px-2 text-xs font-semibold text-[#6d8373]">현재 필터 결과</div>
                <div className="space-y-2">
                  {filteredApartments.map((apartment) => (
                    <button
                      key={apartment.id}
                      type="button"
                      onClick={() => setSelectedId(apartment.id)}
                      className={`w-full rounded-[20px] border px-3 py-3 text-left transition ${
                        apartment.id === selectedApartment.id
                          ? 'border-[#1f8f5f] bg-[#eef8f0] shadow-[0_10px_24px_rgba(31,143,95,0.12)]'
                          : 'border-[#e5ece6] bg-white hover:bg-[#f6fbf7]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-[#6d8373]">{apartment.district}</div>
                          <div className="mt-1 text-sm font-semibold text-[#173325]">{apartment.name}</div>
                          <div className="mt-1 text-xs text-[#587060]">{formatPriceSummary(apartment)}</div>
                        </div>
                        <span
                          className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: getMarkerColor(apartment, activeTier) }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-[#708576]">
              {provider === 'loading' ? '지도를 불러오는 중입니다.' : '검색 조건에 맞는 단지가 없습니다.'}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
