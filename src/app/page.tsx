'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TierKey, PriceMap, MemoMap } from '@/types';
import { getMemos, saveMemo, deleteMemo } from '@/lib/memo-storage';
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

  // Load memos from localStorage on mount
  useEffect(() => {
    setMemos(getMemos());
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
    setPrices((prev) => ({ ...prev, ...newPrices }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
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
