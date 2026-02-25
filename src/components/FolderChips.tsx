'use client';

import { useState, useRef, useEffect } from 'react';
import { FolderMap } from '@/types';

interface FolderChipsProps {
  folders: FolderMap;
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
}

export default function FolderChips({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
}: FolderChipsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedFolders = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);
  const folderCount = sortedFolders.length;

  useEffect(() => {
    if (isCreating && inputRef.current) inputRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  // Hide if no folders and not creating
  if (folderCount === 0 && !isCreating) return null;

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

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* "전체 (티어별)" chip */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
          activeFolderId === null
            ? 'bg-[#2383e2] text-white'
            : 'bg-[#f1f1ef] text-[#37352f] hover:bg-[#e8e5e0]'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        전체 (티어별)
      </button>

      {/* Folder chips */}
      {sortedFolders.map((folder) => {
        const isActive = activeFolderId === folder.id;

        if (editingId === folder.id) {
          return (
            <div key={folder.id} className="shrink-0 flex items-center gap-1">
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(folder.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => handleRename(folder.id)}
                className="w-24 px-2.5 py-1 rounded-full text-[12px] border-2 border-[#2383e2] outline-none bg-white"
              />
            </div>
          );
        }

        return (
          <div key={folder.id} className="group/chip relative shrink-0 flex items-center">
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#2383e2] text-white'
                  : 'bg-[#f1f1ef] text-[#37352f] hover:bg-[#e8e5e0]'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill={isActive ? 'currentColor' : 'none'} className="shrink-0">
                <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span className="whitespace-nowrap">{folder.name}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-px ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[#e8e5e0] text-[#787774]'
              }`}>
                {folder.apartmentIds.length}
              </span>
            </button>

            {/* Hover menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
              }}
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-opacity ${
                isActive
                  ? 'bg-white/30 text-white opacity-0 group-hover/chip:opacity-100'
                  : 'bg-[#e8e5e0] text-[#787774] opacity-0 group-hover/chip:opacity-100'
              }`}
              title="폴더 관리"
            >
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Dropdown menu */}
            {menuOpenId === folder.id && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#e8e5e0] rounded-lg shadow-lg py-1 min-w-[120px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(folder.id);
                    setEditName(folder.name);
                    setMenuOpenId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#37352f] hover:bg-[#f7f7f5] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2M1.5 14.5l.7-2.8L12 1.5l2 2L4.3 13.8l-2.8.7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  이름 변경
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(null);
                    if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) {
                      onDeleteFolder(folder.id);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#eb5757] hover:bg-[#fbe9e9] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  삭제
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* "+ 새 폴더" chip or inline input */}
      {isCreating ? (
        <div className="shrink-0 flex items-center gap-1">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
            }}
            placeholder="폴더 이름"
            className="w-24 px-2.5 py-1 rounded-full text-[12px] border-2 border-[#2383e2] outline-none bg-white placeholder:text-[#b4b4b0]"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#2383e2] text-white hover:bg-[#1a6bc4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            추가
          </button>
          <button
            onClick={() => { setIsCreating(false); setNewName(''); }}
            className="shrink-0 px-2 py-1 rounded-full text-[11px] text-[#787774] hover:bg-[#f1f1ef] transition-colors"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] text-[#787774] bg-[#f1f1ef] hover:bg-[#e8e5e0] hover:text-[#37352f] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          새 폴더
        </button>
      )}
    </div>
  );
}
