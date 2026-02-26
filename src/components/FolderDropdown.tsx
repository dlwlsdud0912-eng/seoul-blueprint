'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const folderList = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);
  const inFolders = folderList.filter(f => f.apartmentIds.includes(apartmentId));
  const isInAnyFolder = inFolders.length > 0;

  // Position adjustment to prevent dropdown from going off-screen
  const adjustPosition = useCallback(() => {
    if (!menuRef.current || !dropdownRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal adjustment
    if (rect.right > viewportWidth - 8) {
      menu.style.right = '0';
      menu.style.left = 'auto';
    }
    if (rect.left < 8) {
      menu.style.left = '0';
      menu.style.right = 'auto';
    }

    // Vertical: if overflows bottom, open upward
    if (rect.bottom > viewportHeight - 8) {
      menu.style.bottom = '100%';
      menu.style.top = 'auto';
      menu.style.marginBottom = '4px';
      menu.style.marginTop = '0';
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // Adjust position after render
    requestAnimationFrame(adjustPosition);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, adjustPosition]);

  // Empty folders: show nothing (no button at all)
  // But if already in folders, still show tags
  const hasNoFolders = folderList.length === 0;

  return (
    <div
      ref={dropdownRef}
      className="relative inline-flex items-center gap-1.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Trigger button - icon only, text on hover */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-0.5 rounded transition-colors ${
          isInAnyFolder
            ? 'px-1 py-0.5 text-[#5b9bd5] hover:bg-[#2383e2]/10'
            : 'px-1 py-0.5 text-[#c8c6c1] hover:text-[#787774] hover:bg-[#f1f1ef]'
        }`}
        title={isInAnyFolder ? `${inFolders.map(f => f.name).join(', ')}에 저장됨` : '폴더에 추가'}
        aria-label="폴더에 추가"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill={isInAnyFolder ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" className="shrink-0">
          <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"/>
        </svg>
        {isHovered && (
          <span className="text-[10px] whitespace-nowrap">
            {isInAnyFolder ? '편집' : '+'}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#e8e5e0] rounded-xl shadow-lg py-1.5 min-w-[200px]"
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          <div className="px-3 py-2 text-[11px] font-medium text-[#b4b4b0] uppercase tracking-wider border-b border-[#f1f1ef]">
            폴더에 추가/제거
          </div>

          {hasNoFolders ? (
            /* Empty state */
            <div className="px-3 py-4 text-center">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-[#b4b4b0] mx-auto mb-2">
                <path d="M4 9a3 3 0 013-3h5l3 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V9z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <p className="text-[12px] text-[#787774] mb-1">폴더가 없습니다</p>
              <p className="text-[11px] text-[#b4b4b0]">
                먼저 상단에서 폴더를 만들어주세요
              </p>
            </div>
          ) : (
            /* Folder list */
            <div className="py-1">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left transition-colors min-h-[44px] ${
                      isIn
                        ? 'bg-[#2383e2]/5 hover:bg-[#2383e2]/10'
                        : 'hover:bg-[#f7f7f5]'
                    }`}
                  >
                    {/* Checkbox */}
                    <span className={`flex items-center justify-center w-[18px] h-[18px] rounded border-2 shrink-0 transition-colors ${
                      isIn
                        ? 'bg-[#2383e2] border-[#2383e2]'
                        : 'border-[#d3d1cb] bg-white'
                    }`}>
                      {isIn && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6l3 3 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>

                    {/* Folder icon + name */}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={isIn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" className={`shrink-0 ${isIn ? 'text-[#2383e2]' : 'text-[#b4b4b0]'}`}>
                      <path d="M2 4.5A1.5 1.5 0 013.5 3H6l1.5 2h5A1.5 1.5 0 0114 6.5v5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"/>
                    </svg>
                    <span className={`truncate ${isIn ? 'text-[#2383e2] font-medium' : 'text-[#37352f]'}`}>
                      {folder.name}
                    </span>

                    {/* Count badge */}
                    <span className={`ml-auto shrink-0 text-[10px] rounded-full px-1.5 py-0.5 ${
                      isIn ? 'bg-[#2383e2]/15 text-[#2383e2]' : 'bg-[#f1f1ef] text-[#b4b4b0]'
                    }`}>
                      {folder.apartmentIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
