'use client';

import { useState, useRef, useEffect } from 'react';
import { Folder, FolderMap } from '@/types';

interface FolderDropdownProps {
  apartmentId: string;
  folders: FolderMap;
  onAddToFolder: (folderId: string, apartmentId: string) => void;
  onRemoveFromFolder: (folderId: string, apartmentId: string) => void;
}

export default function FolderDropdown({
  apartmentId,
  folders,
  onAddToFolder,
  onRemoveFromFolder,
}: FolderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const folderList = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);
  const inFolders = folderList.filter(f => f.apartmentIds.includes(apartmentId));
  const isInAnyFolder = inFolders.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (folderList.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
          isInAnyFolder
            ? 'text-[#2383e2] bg-[#2383e2]/10'
            : 'text-[#b4b4b0] hover:text-[#787774] hover:bg-[#f1f1ef]'
        }`}
        title={isInAnyFolder ? `${inFolders.map(f => f.name).join(', ')}에 저장됨` : '폴더에 추가'}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill={isInAnyFolder ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3">
          <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-6 z-50 bg-white border border-[#e8e5e0] rounded-lg shadow-lg py-1 min-w-[160px]">
          <div className="px-2.5 py-1.5 text-[10px] font-medium text-[#b4b4b0] uppercase tracking-wider">
            폴더에 추가/제거
          </div>
          {folderList.map((folder) => {
            const isIn = folder.apartmentIds.includes(apartmentId);
            return (
              <button
                key={folder.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isIn) {
                    onRemoveFromFolder(folder.id, apartmentId);
                  } else {
                    onAddToFolder(folder.id, apartmentId);
                  }
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-left hover:bg-[#f1f1ef] transition-colors"
              >
                <span className={`flex items-center justify-center w-3.5 h-3.5 rounded border ${
                  isIn
                    ? 'bg-[#2383e2] border-[#2383e2]'
                    : 'border-[#d3d1cb]'
                }`}>
                  {isIn && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l3 3 5-5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className={isIn ? 'text-[#2383e2] font-medium' : 'text-[#787774]'}>
                  {folder.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
