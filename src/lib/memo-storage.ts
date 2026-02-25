const STORAGE_KEY = 'seoul-apt-memos';

export function getMemos(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveMemo(apartmentId: string, content: string) {
  if (typeof window === 'undefined') return;
  const memos = getMemos();
  if (content.trim()) {
    memos[apartmentId] = content.trim();
  } else {
    delete memos[apartmentId];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

export function deleteMemo(apartmentId: string) {
  if (typeof window === 'undefined') return;
  const memos = getMemos();
  delete memos[apartmentId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}
