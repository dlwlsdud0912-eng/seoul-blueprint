'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface MemoEditorProps {
  apartmentId: string;
  initialMemo?: string;
  onSave: (apartmentId: string, content: string) => void;
  onDelete: (apartmentId: string) => void;
}

export default function MemoEditor({
  apartmentId,
  initialMemo,
  onSave,
  onDelete,
}: MemoEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialMemo ?? '');
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDeleting = useRef(false);

  // Sync when initialMemo changes externally
  useEffect(() => {
    if (!isEditing) {
      setDraft(initialMemo ?? '');
    }
  }, [initialMemo, isEditing]);

  // Auto-focus and auto-resize when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.selectionEnd = ta.value.length;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [isEditing]);

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) {
      onSave(apartmentId, trimmed);
    } else if (initialMemo) {
      // Draft is empty but there was a memo before -> delete it
      onDelete(apartmentId);
    }
    setIsEditing(false);
  }, [apartmentId, draft, initialMemo, onSave, onDelete]);

  const handleCancel = useCallback(() => {
    setDraft(initialMemo ?? '');
    setIsEditing(false);
  }, [initialMemo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDeleting.current = true;
      onDelete(apartmentId);
      setDraft('');
      setIsEditing(false);
    },
    [apartmentId, onDelete]
  );

  // Editing mode
  if (isEditing) {
    return (
      <div className="mt-1.5">
        <div className="bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2">
          <div className="flex gap-2">
            <span className="shrink-0 text-[11px]">✏️</span>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (isDeleting.current) {
                  isDeleting.current = false;
                  return;
                }
                handleSave();
              }}
              placeholder="메모를 입력하세요..."
              rows={1}
              className="w-full resize-none border-none bg-transparent text-[11px] text-[#8b6914] leading-relaxed outline-none placeholder:text-[#c4a03a]"
            />
          </div>
          <div className="flex items-center gap-2 mt-1 ml-6 text-[10px] text-[#c4a03a]">
            <span>Enter 저장</span>
            <span>·</span>
            <span>Esc 취소</span>
            <span>·</span>
            <span>Shift+Enter 줄바꿈</span>
          </div>
        </div>
      </div>
    );
  }

  // Has memo - display mode (NoteCard style)
  if (initialMemo) {
    return (
      <div
        className="mt-1.5 group/memo cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed transition-shadow hover:shadow-sm"
          onClick={() => setIsEditing(true)}
        >
          <span className="shrink-0">✏️</span>
          <span className="whitespace-pre-line flex-1 min-w-0">{initialMemo}</span>
          {isHovered && (
            <button
              onClick={handleDelete}
              className="shrink-0 self-start text-[#c4a03a] hover:text-[#eb5757] transition-colors"
              title="메모 삭제"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3L9 9M9 3L3 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // No memo - show placeholder on hover
  return (
    <div
      className="mt-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-[11px] text-[#c4a03a] hover:text-[#8b6914] transition-colors px-2.5 py-1.5 rounded-md border border-dashed border-[#f1e5bc] hover:bg-[#fbf3db]/50 w-full"
        >
          <span>✏️</span>
          <span>메모 추가...</span>
        </button>
      ) : (
        <div className="h-[8px]" />
      )}
    </div>
  );
}
