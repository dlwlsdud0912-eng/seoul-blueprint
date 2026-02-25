'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Apartment, TierKey, PriceMap, MemoMap, FolderMap } from '@/types';
import { getMemos, saveMemo, deleteMemo } from '@/lib/memo-storage';
import { savePriceCache, loadPriceCache } from '@/lib/price-cache';
import {
  getFolders,
  createFolder,
  deleteFolder as deleteFolderStorage,
  renameFolder as renameFolderStorage,
  addToFolder as addToFolderStorage,
  removeFromFolder as removeFromFolderStorage,
} from '@/lib/folder-storage';
import { getOverlay, ApartmentOverlay } from '@/lib/apartment-overlay';
import { APARTMENTS } from '@/data/apartments';
import { NOTES } from '@/data/notes';
import Header from '@/components/Header';
import TierTabs from '@/components/TierTabs';
import SearchBar from '@/components/SearchBar';
import StatsBar from '@/components/StatsBar';
import DistrictGrid from '@/components/DistrictGrid';
import FolderManager from '@/components/FolderManager';
import ApartmentManager from '@/components/ApartmentManager';

export default function Home() {
  const [activeTier, setActiveTier] = useState<TierKey>('12');
  const [prices, setPrices] = useState<PriceMap>({});
  const [memos, setMemos] = useState<MemoMap>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderMap>({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [overlay, setOverlay] = useState<ApartmentOverlay>({ tierChanges: {}, additions: [] });

  // Load memos, folders, overlay, and cached prices on mount
  useEffect(() => {
    setMemos(getMemos());
    setFolders(getFolders());
    setOverlay(getOverlay());

    // 1순위: prices.json (크롤링 데이터)
    fetch('/prices.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.prices) {
          const priceMap: PriceMap = {};
          for (const [id, info] of Object.entries(data.prices)) {
            const p = info as { price: number; articleCount: number; areaName?: string; sizes?: Record<string, { price: number; count: number }> };
            priceMap[id] = { price: p.price, articleCount: p.articleCount, areaName: p.areaName, sizes: p.sizes };
          }
          setPrices(priceMap);
          setLastUpdated(data.updatedAtKR || null);
          savePriceCache(priceMap);
        }
      })
      .catch(() => {
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

  // Memo handlers
  const handleSaveMemo = useCallback((apartmentId: string, content: string) => {
    saveMemo(apartmentId, content);
    setMemos(getMemos());
  }, []);

  const handleDeleteMemo = useCallback((apartmentId: string) => {
    deleteMemo(apartmentId);
    setMemos(getMemos());
  }, []);

  // Folder handlers
  const handleCreateFolder = useCallback((name: string) => {
    createFolder(name);
    setFolders(getFolders());
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    if (activeFolderId === folderId) setActiveFolderId(null);
    deleteFolderStorage(folderId);
    setFolders(getFolders());
  }, [activeFolderId]);

  const handleRenameFolder = useCallback((folderId: string, newName: string) => {
    renameFolderStorage(folderId, newName);
    setFolders(getFolders());
  }, []);

  const handleAddToFolder = useCallback((folderId: string, apartmentId: string) => {
    addToFolderStorage(folderId, apartmentId);
    setFolders(getFolders());
  }, []);

  const handleRemoveFromFolder = useCallback((folderId: string, apartmentId: string) => {
    removeFromFolderStorage(folderId, apartmentId);
    setFolders(getFolders());
  }, []);

  // 오버레이 변경 핸들러
  const handleOverlayChange = useCallback(() => {
    setOverlay(getOverlay());
  }, []);

  // 기본 데이터 + 오버레이 병합
  const mergedApartments = useMemo((): Apartment[] => {
    // 1. 기존 아파트에 티어 변경 적용
    const base = APARTMENTS.map((apt) => {
      const newTier = overlay.tierChanges[apt.id];
      if (newTier) {
        return { ...apt, tier: newTier };
      }
      return apt;
    });
    // 2. 추가 아파트 병합 (tier 변경도 적용)
    const additions: Apartment[] = overlay.additions.map((add) => {
      const newTier = overlay.tierChanges[add.id];
      return {
        id: add.id,
        name: add.name,
        district: add.district,
        size: add.size,
        basePrice: add.basePrice,
        tier: newTier || add.tier,
        naverComplexId: add.naverComplexId,
      };
    });
    return [...base, ...additions];
  }, [overlay]);

  // 오버레이 변경/추가 ID 세트 (DistrictGrid에 전달)
  const overlayChangedIds = useMemo(
    () => new Set(Object.keys(overlay.tierChanges)),
    [overlay]
  );
  const customAddedIds = useMemo(
    () => new Set(overlay.additions.map(a => a.id)),
    [overlay]
  );

  // 폴더 뷰 모드: 특정 폴더 선택 시 해당 폴더의 아파트만 표시
  const isFolderView = activeFolderId !== null;
  const activeFolder = activeFolderId ? folders[activeFolderId] : null;

  // 아파트 필터링: 티어 또는 폴더 (merged 사용)
  const filteredApartments = useMemo(() => {
    if (isFolderView && activeFolder) {
      return mergedApartments.filter(a => activeFolder.apartmentIds.includes(a.id));
    }
    return mergedApartments.filter(a => a.tier === activeTier);
  }, [isFolderView, activeFolder, activeTier, mergedApartments]);

  const filteredNotes = useMemo(() => {
    if (isFolderView) return []; // 폴더 뷰에서는 노트 미표시
    return NOTES.filter(n => n.tier === activeTier);
  }, [isFolderView, activeTier]);

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
          sizes: livePrice.sizes,
        };
      }),
    [filteredApartments, prices]
  );

  // 검색용: 전체 아파트(merged)에 실시간 가격 반영
  const allApartmentsWithPrices = useMemo(
    () =>
      mergedApartments.map((apt) => {
        const livePrice = prices[apt.id];
        if (!livePrice) return apt;
        return {
          ...apt,
          currentPrice: livePrice.price,
          priceChange:
            Math.round((livePrice.price - apt.basePrice) * 10) / 10,
        };
      }),
    [mergedApartments, prices]
  );

  // 검색 결과 선택 시 해당 티어로 이동
  const handleSelectApartment = useCallback((apartment: { tier: TierKey }) => {
    setActiveFolderId(null); // 폴더 뷰 해제
    setActiveTier(apartment.tier);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header lastUpdated={lastUpdated} />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4">
          {/* 폴더 매니저 */}
          <FolderManager
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={(folderId) => setActiveFolderId(folderId)}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
          />

          {/* 관리 패널 */}
          <ApartmentManager
            isManageMode={isManageMode}
            onToggleManageMode={() => setIsManageMode(m => !m)}
            onOverlayChange={handleOverlayChange}
          />

          {/* 아파트 검색 */}
          <SearchBar
            apartments={allApartmentsWithPrices}
            onSelectApartment={handleSelectApartment}
          />

          {/* 티어 탭: 폴더 뷰가 아닐 때만 표시 */}
          {!isFolderView && (
            <TierTabs activeTier={activeTier} onTierChange={setActiveTier} />
          )}

          {/* 폴더 뷰 헤더 */}
          {isFolderView && activeFolder && (
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2383e2" strokeWidth="1.3" className="shrink-0">
                <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"/>
              </svg>
              <span className="text-sm font-semibold text-[#2383e2]">{activeFolder.name}</span>
              <span className="text-[11px] text-[#b4b4b0]">{activeFolder.apartmentIds.length}개 단지</span>
            </div>
          )}

          <StatsBar apartments={apartmentsWithPrices} />
          <DistrictGrid
            apartments={apartmentsWithPrices}
            notes={filteredNotes}
            memos={memos}
            folders={folders}
            onSaveMemo={handleSaveMemo}
            onDeleteMemo={handleDeleteMemo}
            onAddToFolder={handleAddToFolder}
            onRemoveFromFolder={handleRemoveFromFolder}
            isManageMode={isManageMode}
            overlayChangedIds={overlayChangedIds}
            customAddedIds={customAddedIds}
            onOverlayChange={handleOverlayChange}
          />
        </div>
      </main>
    </div>
  );
}
