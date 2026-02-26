import { District, TierKey } from '@/types';

const OVERLAY_KEY = 'seoul-apt-overlay';

export interface AddedApartment {
  id: string;
  name: string;
  district: District;
  size: string;
  basePrice: number;
  tier: TierKey;
  naverComplexId?: string;
}

export interface ApartmentOverlay {
  tierChanges: Record<string, TierKey>;  // { apartmentId: newTier }
  additions: AddedApartment[];
}

function getDefaultOverlay(): ApartmentOverlay {
  return { tierChanges: {}, additions: [] };
}

export function getOverlay(): ApartmentOverlay {
  if (typeof window === 'undefined') return getDefaultOverlay();
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return getDefaultOverlay();
    const parsed = JSON.parse(raw) as ApartmentOverlay;
    // Ensure shape is correct
    if (!parsed.tierChanges) parsed.tierChanges = {};
    if (!parsed.additions) parsed.additions = [];
    return parsed;
  } catch {
    return getDefaultOverlay();
  }
}

function saveOverlay(overlay: ApartmentOverlay): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
}

export function saveTierChange(apartmentId: string, newTier: TierKey): void {
  const overlay = getOverlay();
  overlay.tierChanges[apartmentId] = newTier;
  saveOverlay(overlay);
}

export function removeTierChange(apartmentId: string): void {
  const overlay = getOverlay();
  delete overlay.tierChanges[apartmentId];
  saveOverlay(overlay);
}

export function addApartment(apt: AddedApartment): void {
  const overlay = getOverlay();
  // Prevent duplicate IDs
  if (overlay.additions.some(a => a.id === apt.id)) return;
  overlay.additions.push(apt);
  saveOverlay(overlay);
}

export function updateAddition(aptId: string, updates: Partial<AddedApartment>): void {
  const overlay = getOverlay();
  const idx = overlay.additions.findIndex(a => a.id === aptId);
  if (idx === -1) return;
  overlay.additions[idx] = { ...overlay.additions[idx], ...updates };
  saveOverlay(overlay);
}

export function removeAddition(aptId: string): void {
  const overlay = getOverlay();
  overlay.additions = overlay.additions.filter(a => a.id !== aptId);
  // Also clean up any tier change for removed addition
  delete overlay.tierChanges[aptId];
  saveOverlay(overlay);
}

export function clearOverlay(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OVERLAY_KEY);
}
