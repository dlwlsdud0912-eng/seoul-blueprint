import { Apartment } from '@/types';

export interface SearchResult {
  apartment: Apartment;
  score: number;
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy' | 'chosung';
}

// 한글 초성 테이블
const CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
];

/** 한글 문자에서 초성 추출 */
function getChosung(ch: string): string | null {
  const code = ch.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const index = Math.floor((code - 0xAC00) / (21 * 28));
  return CHOSUNG[index];
}

/** 문자열에서 초성만 추출 */
function extractChosung(str: string): string {
  return str
    .split('')
    .map((ch) => getChosung(ch) || ch)
    .join('');
}

/** 문자가 초성(자음)인지 확인 */
function isChosung(ch: string): boolean {
  return CHOSUNG.includes(ch);
}

/** 쿼리가 모두 초성으로만 구성되어 있는지 확인 */
function isAllChosung(query: string): boolean {
  return query.length > 0 && query.split('').every((ch) => isChosung(ch));
}

/** 정규화: 공백 제거, 소문자 변환 */
function normalize(str: string): string {
  return str.replace(/\s+/g, '').toLowerCase();
}

/**
 * 퍼지 검색: 아파트 이름으로 검색
 * - 완전 일치 → score 1.0
 * - 이름이 query로 시작 → score 0.9
 * - 이름에 query 포함 → score 0.7
 * - 자소 분리 후 부분 매칭 → score 0.5
 * - 한글 초성 매칭 → score 0.4
 */
export function fuzzySearchApartments(
  query: string,
  apartments: Apartment[],
  district?: string,
): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  let candidates = apartments;
  if (district) {
    candidates = candidates.filter((a) => a.district === district);
  }

  const qIsAllChosung = isAllChosung(q);

  const results: SearchResult[] = [];

  for (const apt of candidates) {
    const name = normalize(apt.name);
    let score = 0;
    let matchType: SearchResult['matchType'] = 'fuzzy';

    if (name === q) {
      score = 1.0;
      matchType = 'exact';
    } else if (name.startsWith(q)) {
      score = 0.9;
      matchType = 'startsWith';
    } else if (name.includes(q)) {
      score = 0.7;
      matchType = 'contains';
    } else if (qIsAllChosung) {
      // 초성 매칭: 쿼리가 모두 초성이면 이름의 초성과 비교
      const nameChosung = extractChosung(name);
      if (nameChosung.includes(q)) {
        score = 0.4;
        matchType = 'chosung';
      }
    } else {
      // 부분 자소 매칭: 쿼리의 초성 시퀀스가 이름의 초성에 포함
      const nameChosung = extractChosung(name);
      const queryChosung = extractChosung(q);
      if (queryChosung.length >= 2 && nameChosung.includes(queryChosung)) {
        score = 0.5;
        matchType = 'fuzzy';
      }
    }

    if (score >= 0.3) {
      results.push({ apartment: apt, score, matchType });
    }
  }

  // score 내림차순, 같으면 이름순
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.apartment.name.localeCompare(b.apartment.name);
  });

  return results.slice(0, 8);
}
