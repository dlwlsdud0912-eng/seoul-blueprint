'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface NoteCardProps {
  content: string;
  noteId?: string;
  onSave?: (noteId: string, content: string) => void;
  onDelete?: (noteId: string) => void;
}

export default function NoteCard({ content, noteId, onSave, onDelete }: NoteCardProps) {
  const isEditable = !!(noteId && onSave && onDelete);
  const [isEditing, setIsEditing] = useState(false);
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
    if (trimmed && trimmed !== content) {
      onSave!(noteId!, trimmed);
    }
    setIsEditing(false);
  }, [isEditable, draft, content, noteId, onSave]);

  const handleCancel = useCallback(() => {
    setDraft(content);
    setIsEditing(false);
  }, [content]);

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
          className="w-full resize-none border-none bg-transparent text-[11px] text-[#8b6914] leading-relaxed outline-none"
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
        title="노트 숨기기"
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
