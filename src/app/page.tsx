'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Apartment, TierKey, PriceMap, MemoMap, FolderMap } from '@/types';
import { getMemos, saveMemo, deleteMemo } from '@/lib/memo-storage';
import { getNoteOverrides, saveNoteOverride, deleteNoteOverride, addCustomNote, updateCustomNote, deleteCustomNote, CustomNote } from '@/lib/note-storage';
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
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { APARTMENTS } from '@/data/apartments';
import { NOTES } from '@/data/notes';
import Header from '@/components/Header';
import TierTabs from '@/components/TierTabs';
import SearchBar from '@/components/SearchBar';
import StatsBar from '@/components/StatsBar';
import DistrictGrid from '@/components/DistrictGrid';
import FolderChips from '@/components/FolderChips';
import ApartmentManager from '@/components/ApartmentManager';
import MindMapView from '@/components/MindMapView';
import { TIERS } from '@/data/tiers';

export default function Home() {
  const [activeTier, setActiveTier] = useState<TierKey>('12');
  const [viewMode, setViewMode] = useState<'grid' | 'mindmap'>('grid');
  const [mindMapEnabled, setMindMapEnabled] = useState(false);
  const [prices, setPrices] = useState<PriceMap>({});
  const [memos, setMemos] = useState<MemoMap>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderMap>({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [noteOverrides, setNoteOverrides] = useState<{ overrides: Record<string, string>; deleted: string[]; additions: CustomNote[] }>({ overrides: {}, deleted: [], additions: [] });
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [overlay, setOverlay] = useState<ApartmentOverlay>({ tierChanges: {}, additions: [] });
  const [showProximity, setShowProximity] = useState(false);
  const [highlightedApartmentId, setHighlightedApartmentId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Load memos, folders, overlay, and cached prices on mount
  useEffect(() => {
    setMemos(getMemos());
    setFolders(getFolders());
    setOverlay(getOverlay());
    setNoteOverrides(getNoteOverrides());
    const adminEnabled = isAdminAuthenticated();
    setMindMapEnabled(adminEnabled);
    if (adminEnabled) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'mindmap') {
        setViewMode('mindmap');
      }
    }

    // 1순위: prices.json (크롤링 데이터)
    fetch('/prices.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.prices) {
          const priceMap: PriceMap = {};
          for (const [id, info] of Object.entries(data.prices)) {
            const p = info as { price: number; articleCount: number; areaName?: string; sizes?: Record<string, { price: number; count: number }>; ownerVerified?: boolean };
            priceMap[id] = { price: p.price, articleCount: p.articleCount, areaName: p.areaName, sizes: p.sizes, ownerVerified: p.ownerVerified };
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

  // Note override handlers
  const handleSaveNote = useCallback((noteId: string, content: string) => {
    if (noteId.startsWith('custom-note-')) {
      updateCustomNote(noteId, content);
    } else {
      saveNoteOverride(noteId, content);
    }
    setNoteOverrides(getNoteOverrides());
  }, []);

  const handleDeleteNote = useCallback((noteId: string) => {
    if (noteId.startsWith('custom-note-')) {
      deleteCustomNote(noteId);
    } else {
      deleteNoteOverride(noteId);
    }
    setNoteOverrides(getNoteOverrides());
    setNewNoteId(null);
  }, []);

  const handleAddNote = useCallback((district: string) => {
    const id = addCustomNote(activeTier, district, '');
    setNoteOverrides(getNoteOverrides());
    setNewNoteId(id);
  }, [activeTier]);

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

  // 원클릭 북마크 토글 핸들러
  const handleQuickToggleFolder = useCallback((folderId: string, apartmentId: string, isAdding: boolean) => {
    if (isAdding) {
      handleAddToFolder(folderId, apartmentId);
    } else {
      handleRemoveFromFolder(folderId, apartmentId);
    }
  }, [handleAddToFolder, handleRemoveFromFolder]);

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
    return NOTES
      .map((n, i) => ({ ...n, noteId: `note-${i}` }))
      .filter(n => n.tier === activeTier && !noteOverrides.deleted.includes(n.noteId))
      .map(n => ({
        ...n,
        content: noteOverrides.overrides[n.noteId] ?? n.content,
      }));
  }, [isFolderView, activeTier, noteOverrides]);

  const filteredCustomNotes = useMemo((): CustomNote[] => {
    if (isFolderView) return [];
    return (noteOverrides.additions ?? []).filter(n => n.tier === activeTier);
  }, [isFolderView, activeTier, noteOverrides]);

  const activeTierMeta = useMemo(
    () => TIERS.find((tier) => tier.key === activeTier),
    [activeTier]
  );

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
          areaName: livePrice.areaName,
          ownerVerified: livePrice.ownerVerified,
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
          ownerVerified: livePrice.ownerVerified,
        };
      }),
    [mergedApartments, prices]
  );

  // 검색 결과 선택 시 해당 티어로 이동 + 하이라이트
  const handleSelectApartment = useCallback((apartment: Apartment) => {
    setActiveFolderId(null); // 폴더 뷰 해제
    setActiveTier(apartment.tier);
    setHighlightedApartmentId(apartment.id);
    // 이전 타이머 정리 후 3초 후 하이라이트 해제
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedApartmentId(null);
      highlightTimerRef.current = null;
    }, 3000);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header lastUpdated={lastUpdated} />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3">
          {/* 검색 + 관리 (한 줄) + 추가폼(펼쳐질 때) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchBar
                apartments={allApartmentsWithPrices}
                onSelectApartment={handleSelectApartment}
              />
            </div>
            <ApartmentManager
              isManageMode={isManageMode}
              onToggleManageMode={() => setIsManageMode(m => !m)}
              onOverlayChange={handleOverlayChange}
            />
          </div>

          {/* 티어 탭: 폴더 뷰가 아닐 때만 표시 */}
          {!isFolderView && (
            <TierTabs activeTier={activeTier} onTierChange={setActiveTier} />
          )}

          {/* 폴더 칩 필터 */}
          <FolderChips
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={(folderId) => setActiveFolderId(folderId)}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <StatsBar apartments={apartmentsWithPrices} />
            {mindMapEnabled ? (
              <div className="inline-flex rounded-md border border-[#e8e5e0] bg-white p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#f1f1ef] text-[#37352f]'
                      : 'text-[#787774] hover:text-[#37352f]'
                  }`}
                >
                  리스트
                </button>
                <button
                  onClick={() => setViewMode('mindmap')}
                  className={`rounded-[8px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    viewMode === 'mindmap'
                      ? 'bg-[#efe9ff] text-[#6d4dff]'
                      : 'text-[#787774] hover:text-[#37352f]'
                  }`}
                >
                  마인드맵
                </button>
              </div>
            ) : null}
            <button
              onClick={() => setShowProximity(p => !p)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${
                showProximity
                  ? 'bg-[#fbe4e4] border-[#f5c6c6] text-[#eb5757]'
                  : 'bg-white border-[#e8e5e0] text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              {showProximity ? '● 가격근접 ON' : '가격근접'}
            </button>
          </div>
          {mindMapEnabled && viewMode === 'mindmap' ? (
            <MindMapView
              apartments={apartmentsWithPrices}
              memos={memos}
              activeTier={activeTier}
              title={isFolderView && activeFolder ? `${activeFolder.name} 마인드맵` : `${activeTierMeta?.label ?? activeTier} 마인드맵`}
              subtitle={
                isFolderView && activeFolder
                  ? '선택한 폴더 안 아파트를 구별로 펼쳐본 지도'
                  : `${activeTierMeta?.maxPrice ?? activeTier} 기준 아파트를 구 → 아파트 흐름으로 정리`
              }
            />
          ) : (
            <DistrictGrid
              apartments={apartmentsWithPrices}
              notes={filteredNotes}
              memos={memos}
              folders={folders}
              onSaveMemo={handleSaveMemo}
              onDeleteMemo={handleDeleteMemo}
              onAddToFolder={handleAddToFolder}
              onRemoveFromFolder={handleRemoveFromFolder}
              onQuickToggleFolder={handleQuickToggleFolder}
              isManageMode={isManageMode}
              overlayChangedIds={overlayChangedIds}
              customAddedIds={customAddedIds}
              onOverlayChange={handleOverlayChange}
              showProximity={showProximity}
              highlightedApartmentId={highlightedApartmentId}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              customNotes={filteredCustomNotes}
              onAddNote={isFolderView ? undefined : handleAddNote}
              newNoteId={newNoteId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
