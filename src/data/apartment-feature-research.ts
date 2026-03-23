import rawResearch from './apartment-feature-research.json';

export interface ApartmentFeatureSource {
  title: string;
  url: string;
}

export interface ApartmentFeatureSchools {
  elementary?: string;
  middle?: string;
  high?: string;
}

export interface ApartmentFeatureResearch {
  apartmentId: string;
  apartmentName: string;
  district: string;
  headline: string;
  comparedWith: string[];
  noteLines: string[];
  schools?: ApartmentFeatureSchools;
  leaderContext?: string;
  sources: ApartmentFeatureSource[];
}

const APARTMENT_FEATURE_RESEARCH = rawResearch as ApartmentFeatureResearch[];

export const APARTMENT_FEATURE_RESEARCH_LIST = APARTMENT_FEATURE_RESEARCH;

export const APARTMENT_FEATURE_RESEARCH_MAP = Object.fromEntries(
  APARTMENT_FEATURE_RESEARCH.map((item) => [item.apartmentId, item])
) as Record<string, ApartmentFeatureResearch>;
