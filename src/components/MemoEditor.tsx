'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface MemoEditorProps {
  apartmentId: string;
  initialMemo?: string;
  onSave: (apartmentId: string, content: string) => void;
  onDelete: (apartmentId: string) => void;
  inline?: boolean;
}

export default function MemoEditor({
  apartmentId,
  initialMemo,
  onSave,
  onDelete,
  inline,
}: MemoEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialMemo ?? '');
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
      <div className={inline ? '' : 'mt-1.5'}>
        <div className={inline
          ? 'bg-[#faf8f5] px-2.5 py-2'
          : 'bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2'
        }>
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
              placeholder="메모"
              rows={1}
              className="w-full resize-none border-none bg-transparent text-[11px] text-[#787774] leading-relaxed outline-none placeholder:text-[#b4b4b0]"
            />
          </div>
        </div>
      </div>
    );
  }

  // Has memo - display mode (NoteCard style)
  if (initialMemo) {
    return (
      <div className={`${inline ? '' : 'mt-1.5'} group/memo cursor-pointer`}>
        <div
          className={inline
            ? 'flex gap-2 px-2.5 py-1.5 text-[11px] text-[#787774] leading-relaxed transition-colors hover:bg-[#f7f7f5]'
            : 'flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed transition-shadow hover:shadow-sm'
          }
          onClick={() => setIsEditing(true)}
        >
          <span className="shrink-0">✏️</span>
          <span className="whitespace-pre-line flex-1 min-w-0">{initialMemo}</span>
          <button
            onClick={handleDelete}
            className={`shrink-0 self-start transition-colors opacity-40 group-hover/memo:opacity-100 ${
              inline
                ? 'text-[#b4b4b0] hover:text-[#eb5757]'
                : 'text-[#c4a03a] hover:text-[#eb5757]'
            }`}
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
        </div>
      </div>
    );
  }

  // No memo - always show add button (hover-only was invisible on mobile)
  return (
    <div className="mt-1">
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 text-[11px] text-[#c4a03a] hover:text-[#8b6914] transition-colors px-2.5 py-1.5 rounded-md border border-dashed border-[#f1e5bc] hover:bg-[#fbf3db]/50 w-full opacity-50 hover:opacity-100"
      >
        <span>✏️</span>
        <span>메모</span>
      </button>
    </div>
  );
}
