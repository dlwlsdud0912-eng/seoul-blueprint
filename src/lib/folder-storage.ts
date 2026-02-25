import { Folder, FolderMap } from '@/types';

const STORAGE_KEY = 'seoul-apt-folders';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getFolders(): FolderMap {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveFolders(folders: FolderMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export function createFolder(name: string): Folder {
  const folders = getFolders();
  const folder: Folder = {
    id: generateId(),
    name: name.trim(),
    apartmentIds: [],
    createdAt: Date.now(),
  };
  folders[folder.id] = folder;
  saveFolders(folders);
  return folder;
}

export function deleteFolder(folderId: string): void {
  const folders = getFolders();
  delete folders[folderId];
  saveFolders(folders);
}

export function renameFolder(folderId: string, newName: string): void {
  const folders = getFolders();
  if (folders[folderId]) {
    folders[folderId].name = newName.trim();
    saveFolders(folders);
  }
}

export function addToFolder(folderId: string, apartmentId: string): void {
  const folders = getFolders();
  const folder = folders[folderId];
  if (folder && !folder.apartmentIds.includes(apartmentId)) {
    folder.apartmentIds.push(apartmentId);
    saveFolders(folders);
  }
}

export function removeFromFolder(folderId: string, apartmentId: string): void {
  const folders = getFolders();
  const folder = folders[folderId];
  if (folder) {
    folder.apartmentIds = folder.apartmentIds.filter(id => id !== apartmentId);
    saveFolders(folders);
  }
}

export function getFoldersForApartment(apartmentId: string): Folder[] {
  const folders = getFolders();
  return Object.values(folders).filter(f => f.apartmentIds.includes(apartmentId));
}
