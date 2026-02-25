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
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

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

  const sortedFolders = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">
          즐겨찾기 폴더
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="text-[11px] text-[#2383e2] hover:text-[#1a6bc4] transition-colors"
        >
          + 새 폴더
        </button>
      </div>

      {/* 전체보기 (폴더 해제) */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors text-left ${
          activeFolderId === null
            ? 'bg-[#2383e2]/10 text-[#2383e2] font-medium'
            : 'text-[#787774] hover:bg-[#f1f1ef]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        전체 (티어별 보기)
      </button>

      {/* 폴더 목록 */}
      {sortedFolders.map((folder) => (
        <div key={folder.id} className="group flex items-center gap-1">
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
              className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border border-[#2383e2] outline-none bg-white"
            />
          ) : (
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors text-left min-w-0 ${
                activeFolderId === folder.id
                  ? 'bg-[#2383e2]/10 text-[#2383e2] font-medium'
                  : 'text-[#787774] hover:bg-[#f1f1ef]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span className="truncate">{folder.name}</span>
              <span className="shrink-0 text-[10px] text-[#b4b4b0]">
                {folder.apartmentIds.length}
              </span>
            </button>
          )}
          {editingId !== folder.id && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(folder.id);
                  setEditName(folder.name);
                }}
                className="p-1 text-[#b4b4b0] hover:text-[#787774] transition-colors"
                title="이름 변경"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5l2 2M1 11l.5-2L9 1.5l2 2L3.5 11 1 11z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) {
                    onDeleteFolder(folder.id);
                  }
                }}
                className="p-1 text-[#b4b4b0] hover:text-[#eb5757] transition-colors"
                title="폴더 삭제"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}

      {/* 새 폴더 입력 */}
      {isCreating && (
        <div className="flex gap-1">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
            }}
            onBlur={() => {
              if (newName.trim()) handleCreate();
              else { setIsCreating(false); setNewName(''); }
            }}
            placeholder="폴더 이름 (예: 김OO 고객님)"
            className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] border border-[#2383e2] outline-none bg-white placeholder:text-[#b4b4b0]"
          />
        </div>
      )}
    </div>
  );
}
