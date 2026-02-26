const STORAGE_KEY = 'seoul-blueprint-note-overrides';

export interface CustomNote {
  id: string;       // 'custom-note-{timestamp}' 형태
  tier: string;     // 소속 티어
  district: string; // 소속 구
  content: string;
}

interface NoteOverlayData {
  overrides: Record<string, string>;
  deleted: string[];
  additions: CustomNote[];
}

function getNoteOverlayData(): NoteOverlayData {
  if (typeof window === 'undefined') return { overrides: {}, deleted: [], additions: [] };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { overrides: {}, deleted: [], additions: [] };
    const parsed = JSON.parse(data) as Partial<NoteOverlayData>;
    return {
      overrides: parsed.overrides ?? {},
      deleted: parsed.deleted ?? [],
      additions: parsed.additions ?? [],
    };
  } catch {
    return { overrides: {}, deleted: [], additions: [] };
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

export function addCustomNote(tier: string, district: string, content: string): string {
  const data = getNoteOverlayData();
  const id = `custom-note-${Date.now()}`;
  data.additions.push({ id, tier, district, content });
  setNoteOverlayData(data);
  return id;
}

export function updateCustomNote(noteId: string, content: string): void {
  const data = getNoteOverlayData();
  const note = data.additions.find((n) => n.id === noteId);
  if (note) note.content = content;
  setNoteOverlayData(data);
}

export function deleteCustomNote(noteId: string): void {
  const data = getNoteOverlayData();
  data.additions = data.additions.filter((n) => n.id !== noteId);
  setNoteOverlayData(data);
}
