// 관리자 인증 모듈
// 비밀번호: 12251225 → SHA-256 해시로 검증
// localStorage 기반, 24시간 만료

const ADMIN_HASH = 'd4c2ac430f6f610955f7b4712664bb7ed229f7f2b7639a2177e6b48c7feb63ac';
const STORAGE_KEY = 'seoul-blueprint-admin-auth';
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24시간

interface AdminAuthData {
  authenticated: boolean;
  timestamp: number;
}

// 문자열을 SHA-256 해시(hex)로 변환
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 입력한 비밀번호가 올바른지 SHA-256 비교 */
export async function verifyPassword(input: string): Promise<boolean> {
  const hash = await sha256Hex(input);
  return hash === ADMIN_HASH;
}

/** localStorage에 유효한 인증 토큰이 있는지 확인 (24시간 이내) */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data: AdminAuthData = JSON.parse(raw);
    if (!data.authenticated) return false;
    if (Date.now() - data.timestamp > EXPIRE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** 인증 성공 후 localStorage에 저장 */
export function setAdminAuthenticated(): void {
  if (typeof window === 'undefined') return;
  try {
    const data: AdminAuthData = { authenticated: true, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded 등 무시 */ }
}

/** 로그아웃: localStorage 삭제 */
export function adminLogout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* 무시 */ }
}

/** 현재 해시 반환 (비밀번호 변경 시 참고용) */
export function getAdminPasswordHash(): string {
  return ADMIN_HASH;
}
