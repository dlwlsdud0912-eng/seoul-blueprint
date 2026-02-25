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
      onDelete(apartmentId);
      setDraft('');
      setIsEditing(false);
    },
    [apartmentId, onDelete]
  );

  // Editing mode
  if (isEditing) {
    return (
      <div className="ml-2 mt-0.5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="메모를 입력하세요..."
          rows={1}
          className="w-full resize-none border-none bg-transparent text-[12px] text-[#37352f] leading-relaxed outline-none ring-1 ring-[#a8d4f5] rounded px-1.5 py-1 placeholder:text-[#b4b4b0] placeholder:text-[11px]"
        />
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#b4b4b0]">
          <span>Enter 저장</span>
          <span>·</span>
          <span>Esc 취소</span>
          <span>·</span>
          <span>Shift+Enter 줄바꿈</span>
        </div>
      </div>
    );
  }

  // Has memo - display mode
  if (initialMemo) {
    return (
      <div
        className="ml-2 mt-0.5 group/memo flex items-start gap-1 cursor-pointer rounded px-1.5 py-0.5 hover:bg-[#f7f7f5] transition-colors"
        onClick={() => setIsEditing(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-[11px] text-[#787774] italic leading-relaxed whitespace-pre-wrap flex-1 min-w-0">
          {initialMemo}
        </span>
        {isHovered && (
          <button
            onClick={handleDelete}
            className="shrink-0 mt-0.5 text-[#b4b4b0] hover:text-[#eb5757] transition-colors"
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
    );
  }

  // No memo - show placeholder on hover
  return (
    <div
      className="ml-2 mt-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 text-[11px] text-[#b4b4b0] hover:text-[#787774] transition-colors px-1.5 py-0.5 rounded hover:bg-[#f7f7f5]"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 2.5V9.5M2.5 6H9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>메모 추가...</span>
        </button>
      ) : (
        <div className="h-[20px]" />
      )}
    </div>
  );
}
