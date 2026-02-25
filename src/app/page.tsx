'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TierKey, PriceMap, MemoMap } from '@/types';
import { getMemos, saveMemo, deleteMemo } from '@/lib/memo-storage';
import { savePriceCache, loadPriceCache } from '@/lib/price-cache';
import { APARTMENTS } from '@/data/apartments';
import { NOTES } from '@/data/notes';
import Header from '@/components/Header';
import TierTabs from '@/components/TierTabs';
import StatsBar from '@/components/StatsBar';
import DistrictGrid from '@/components/DistrictGrid';
import PriceRefreshButton from '@/components/PriceRefreshButton';

export default function Home() {
  const [activeTier, setActiveTier] = useState<TierKey>('12');
  const [prices, setPrices] = useState<PriceMap>({});
  const [memos, setMemos] = useState<MemoMap>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load memos and cached prices on mount
  useEffect(() => {
    setMemos(getMemos());

    // 1순위: prices.json (크롤링 데이터)
    fetch('/prices.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.prices) {
          const priceMap: PriceMap = {};
          for (const [id, info] of Object.entries(data.prices)) {
            const p = info as { price: number; articleCount: number; areaName?: string };
            priceMap[id] = { price: p.price, articleCount: p.articleCount, areaName: p.areaName };
          }
          setPrices(priceMap);
          setLastUpdated(data.updatedAtKR || null);
          // 캐시에도 저장
          savePriceCache(priceMap);
        }
      })
      .catch(() => {
        // 2순위: localStorage 캐시
        const cached = loadPriceCache();
        if (cached) {
          setPrices(cached.prices);
          setLastUpdated(new Date(cached.updatedAt).toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }));
        }
      });
  }, []);

  const handleSaveMemo = useCallback((apartmentId: string, content: string) => {
    saveMemo(apartmentId, content);
    setMemos(getMemos());
  }, []);

  const handleDeleteMemo = useCallback((apartmentId: string) => {
    deleteMemo(apartmentId);
    setMemos(getMemos());
  }, []);

  const filteredApartments = APARTMENTS.filter((a) => a.tier === activeTier);
  const filteredNotes = NOTES.filter((n) => n.tier === activeTier);

  // 실시간 가격이 있으면 반영한 아파트 목록
  const apartmentsWithPrices = useMemo(
    () =>
      filteredApartments.map((apt) => {
        const livePrice = prices[apt.id];
        if (!livePrice) return apt;
        return {
          ...apt,
          currentPrice: livePrice.price,
          priceChange:
            Math.round((livePrice.price - apt.basePrice) * 10) / 10,
          articleCount: livePrice.articleCount,
        };
      }),
    [filteredApartments, prices]
  );

  const handlePriceUpdate = (newPrices: PriceMap) => {
    setPrices((prev) => {
      const merged = { ...prev, ...newPrices };
      savePriceCache(merged);
      return merged;
    });
    setLastUpdated(new Date().toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header lastUpdated={lastUpdated} />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TierTabs activeTier={activeTier} onTierChange={setActiveTier} />
            <PriceRefreshButton
              apartments={filteredApartments}
              onPriceUpdate={handlePriceUpdate}
            />
          </div>
          <StatsBar apartments={apartmentsWithPrices} />
          <DistrictGrid
            apartments={apartmentsWithPrices}
            notes={filteredNotes}
            memos={memos}
            onSaveMemo={handleSaveMemo}
            onDeleteMemo={handleDeleteMemo}
          />
        </div>
      </main>
    </div>
  );
}
