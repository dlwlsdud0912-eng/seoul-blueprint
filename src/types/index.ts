export type District =
  | '성북구'
  | '동대문구'
  | '성동구'
  | '강서구'
  | '영등포구'
  | '강동구'
  | '양천구'
  | '관악구'
  | '마포구'
  | '동작구'
  | '용산구'
  | '송파구'
  | '비잠실송파'
  | '강남구'
  | '서초구'
  | '서대문구'
  | '강북구'
  | '구로구'
  | '은평구'
  | '노원구'
  | '종로구'
  | '중구';

export type TierKey = '12' | '14' | '16' | '20' | '24' | '28' | '32' | '50';

export interface Tier {
  key: TierKey;
  label: string;
  maxPrice: string;
  cashNeeded: string;
  loanAmount: string;
}

export interface Apartment {
  id: string;
  name: string;
  district: District;
  size: string;
  basePrice: number;
  note?: string;
  tier: TierKey;
  naverComplexId?: string;
  currentPrice?: number;
  priceChange?: number;
}

export interface DistrictNote {
  tier: TierKey;
  district?: District;
  apartmentId?: string;
  content: string;
}

export interface SizePrice {
  price: number;
  count: number;
}

export interface PriceResult {
  price: number;
  articleCount: number;
  areaName?: string;
  sizes?: Record<string, SizePrice>;
}

export interface PriceMap {
  [apartmentId: string]: PriceResult;
}

export type MemoMap = Record<string, string>;

// 즐겨찾기 폴더
export interface Folder {
  id: string;
  name: string;
  apartmentIds: string[];
  createdAt: number;
}

export type FolderMap = Record<string, Folder>;
