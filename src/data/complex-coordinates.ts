import coordinateMap from './complex-coordinates.json';

export interface ComplexCoordinate {
  lat: number;
  lng: number;
}

export const COMPLEX_COORDINATES = coordinateMap as Record<string, ComplexCoordinate>;

export function getComplexCoordinate(complexId?: string | null): ComplexCoordinate | null {
  if (!complexId) return null;
  return COMPLEX_COORDINATES[String(complexId)] ?? null;
}
