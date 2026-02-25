'use client';

import { useState, useRef, useEffect } from 'react';
import { Folder, FolderMap } from '@/types';

interface FolderManagerProps {
  folders: FolderMap;
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

export default function FolderManager({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const sortedFolders = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);
  const totalFavorites = sortedFolders.reduce((sum, f) => sum + f.apartmentIds.length, 0);
  const folderCount = sortedFolders.length;

  // Auto-expand when a folder is actively selected
  useEffect(() => {
    if (activeFolderId) setIsExpanded(true);
  }, [activeFolderId]);

  useEffect(() => {
    if (isCreating && inputRef.current) inputRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onCreateFolder(trimmed);
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleRename = (folderId: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onRenameFolder(folderId, trimmed);
    }
    setEditingId(null);
  };

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="border border-[#e8e5e0] rounded-lg bg-white overflow-hidden">
      {/* Collapsed toggle bar */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#f7f7f5] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#787774] shrink-0">
            <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <span className="text-[12px] font-medium text-[#37352f]">
            즐겨찾기
          </span>
          {folderCount > 0 && (
            <span className="text-[10px] text-[#787774]">
              {folderCount}개 폴더 &middot; {totalFavorites}개
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-[#b4b4b0] transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#e8e5e0]">
          {/* Active folder: back to all button */}
          {activeFolderId !== null && (
            <button
              onClick={() => onSelectFolder(null)}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 mb-2 rounded-md bg-[#2383e2]/8 text-[#2383e2] text-[12px] font-medium hover:bg-[#2383e2]/15 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              전체보기
            </button>
          )}

          {/* Empty state */}
          {folderCount === 0 && !isCreating && (
            <div className="flex items-center gap-3 py-3 px-2">
              <p className="text-[12px] text-[#787774]">
                폴더를 만들어 아파트를 관리하세요
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#2383e2] text-white text-[12px] font-medium hover:bg-[#1a6bc4] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                만들기
              </button>
            </div>
          )}

          {/* Folder list */}
          {folderCount > 0 && (
            <div className="flex flex-col gap-1">
              {/* All view button (when no folder is selected) */}
              {activeFolderId === null && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#2383e2]/8 text-[#2383e2] text-[12px] font-medium">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  전체 (티어별)
                </div>
              )}

              {sortedFolders.map((folder) => {
                const isActive = activeFolderId === folder.id;
                return (
                  <div key={folder.id} className="flex items-center gap-0.5">
                    {editingId === folder.id ? (
                      <input
                        ref={editInputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(folder.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => handleRename(folder.id)}
                        className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border-2 border-[#2383e2] outline-none bg-white"
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectFolder(folder.id)}
                          className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors text-left min-w-0 ${
                            isActive
                              ? 'bg-[#2383e2]/8 text-[#2383e2] font-medium'
                              : 'text-[#37352f] hover:bg-[#f7f7f5]'
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill={isActive ? 'currentColor' : 'none'} className="shrink-0">
                            <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2"/>
                          </svg>
                          <span className="truncate">{folder.name}</span>
                          <span className={`shrink-0 text-[10px] rounded-full px-1.5 py-px ${
                            isActive ? 'bg-[#2383e2]/15 text-[#2383e2]' : 'bg-[#f1f1ef] text-[#787774]'
                          }`}>
                            {folder.apartmentIds.length}
                          </span>
                        </button>

                        {/* Edit/delete buttons */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(folder.id);
                            setEditName(folder.name);
                          }}
                          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[#b4b4b0] hover:text-[#787774] hover:bg-[#f1f1ef] active:bg-[#e8e5e0] transition-colors"
                          title="이름 변경"
                          aria-label={`${folder.name} 이름 변경`}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5l2 2M1.5 14.5l.7-2.8L12 1.5l2 2L4.3 13.8l-2.8.7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) {
                              onDeleteFolder(folder.id);
                            }
                          }}
                          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[#b4b4b0] hover:text-[#eb5757] hover:bg-[#fbe9e9] active:bg-[#f5d0d0] transition-colors"
                          title="폴더 삭제"
                          aria-label={`${folder.name} 삭제`}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* New folder button (when folders exist) */}
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f] transition-colors mt-0.5"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  새 폴더
                </button>
              )}
            </div>
          )}

          {/* New folder input */}
          {isCreating && (
            <div className="flex gap-1.5 mt-1.5">
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                }}
                placeholder="폴더 이름"
                className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border-2 border-[#2383e2] outline-none bg-white placeholder:text-[#b4b4b0]"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="shrink-0 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#2383e2] text-white hover:bg-[#1a6bc4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                추가
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewName(''); }}
                className="shrink-0 px-2 py-1.5 rounded-md text-[12px] text-[#787774] hover:bg-[#f1f1ef] transition-colors"
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
