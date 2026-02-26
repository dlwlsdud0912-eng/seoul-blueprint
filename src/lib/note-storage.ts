const STORAGE_KEY = 'seoul-blueprint-note-overrides';

interface NoteOverlayData {
  overrides: Record<string, string>;
  deleted: string[];
}

function getNoteOverlayData(): NoteOverlayData {
  if (typeof window === 'undefined') return { overrides: {}, deleted: [] };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { overrides: {}, deleted: [] };
  } catch {
    return { overrides: {}, deleted: [] };
  }
}

function setNoteOverlayData(data: NoteOverlayData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getNoteOverrides(): NoteOverlayData {
  return getNoteOverlayData();
}

export function saveNoteOverride(noteId: string, content: string): void {
  const data = getNoteOverlayData();
  data.overrides[noteId] = content;
  setNoteOverlayData(data);
}

export function deleteNoteOverride(noteId: string): void {
  const data = getNoteOverlayData();
  if (!data.deleted.includes(noteId)) {
    data.deleted.push(noteId);
  }
  // Remove any override for this note since it's being deleted
  delete data.overrides[noteId];
  setNoteOverlayData(data);
}

export function revertNoteOverride(noteId: string): void {
  const data = getNoteOverlayData();
  delete data.overrides[noteId];
  data.deleted = data.deleted.filter((id) => id !== noteId);
  setNoteOverlayData(data);
}
