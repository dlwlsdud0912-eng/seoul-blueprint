'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface NoteCardProps {
  content: string;
  noteId?: string;
  onSave?: (noteId: string, content: string) => void;
  onDelete?: (noteId: string) => void;
  isNew?: boolean;    // 새로 추가된 노트 — 자동 편집모드 진입
  isCustom?: boolean; // 커스텀 노트 여부 (삭제 툴팁 다름)
}

export default function NoteCard({ content, noteId, onSave, onDelete, isNew, isCustom }: NoteCardProps) {
  const isEditable = !!(noteId && onSave && onDelete);
  const [isEditing, setIsEditing] = useState(!!isNew);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDeleting = useRef(false);

  // Sync when content changes externally
  useEffect(() => {
    if (!isEditing) {
      setDraft(content);
    }
  }, [content, isEditing]);

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
    if (!isEditable) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      // 빈 내용이면 삭제 (새 노트에서 아무것도 안 쓴 경우)
      onDelete!(noteId!);
      setIsEditing(false);
      return;
    }
    if (trimmed !== content) {
      onSave!(noteId!, trimmed);
    }
    setIsEditing(false);
  }, [isEditable, draft, content, noteId, onSave, onDelete]);

  const handleCancel = useCallback(() => {
    if (isNew && !content) {
      // 새 노트에서 취소하면 삭제
      onDelete!(noteId!);
      return;
    }
    setDraft(content);
    setIsEditing(false);
  }, [content, isNew, noteId, onDelete]);

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
      if (!isEditable) return;
      isDeleting.current = true;
      onDelete!(noteId!);
      setIsEditing(false);
    },
    [isEditable, noteId, onDelete]
  );

  // Editing mode
  if (isEditing) {
    return (
      <div className="flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed">
        <span className="shrink-0">✏️</span>
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
          rows={1}
          placeholder="노트 내용 입력..."
          className="w-full resize-none border-none bg-transparent text-[11px] text-[#8b6914] leading-relaxed outline-none placeholder:text-[#c4a03a]/50"
        />
      </div>
    );
  }

  // Read-only (no handlers) or display mode
  if (!isEditable) {
    return (
      <div className="flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed">
        <span className="shrink-0">💡</span>
        <span className="whitespace-pre-line">{content}</span>
      </div>
    );
  }

  // Editable display mode
  return (
    <div
      className="group/note flex gap-2 bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-2.5 py-2 text-[11px] text-[#8b6914] leading-relaxed cursor-pointer transition-shadow hover:shadow-sm"
      onClick={() => setIsEditing(true)}
    >
      <span className="shrink-0">💡</span>
      <span className="whitespace-pre-line flex-1 min-w-0">{content}</span>
      <button
        onClick={handleDelete}
        className="shrink-0 self-start text-[#c4a03a] hover:text-[#eb5757] opacity-0 group-hover/note:opacity-100 transition-opacity"
        title={isCustom ? '노트 삭제' : '노트 숨기기'}
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
  );
}
