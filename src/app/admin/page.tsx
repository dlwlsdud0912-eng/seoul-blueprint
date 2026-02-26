'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import ApartmentCard from '@/components/ApartmentCard';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  adminLogout,
  verifyPassword,
} from '@/lib/admin-auth';
import {
  calculateDsr,
  type DsrInput,
  type DsrResult,
  type RepaymentType,
  type RateType,
  type Region,
  type StressLevel,
  formatWon,
  formatEok,
} from '@/lib/dsr-calculator';
import { APARTMENTS } from '@/data/apartments';
import type { PriceMap } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

const FAIL_COUNT_KEY = 'seoul-blueprint-admin-fail-count';
const LOCKOUT_KEY = 'seoul-blueprint-admin-lockout-until';
const CUSTOM_HASH_KEY = 'seoul-blueprint-admin-custom-hash';
const DSR_INPUTS_KEY = 'seoul-blueprint-admin-dsr-inputs';

// ─────────────────────────────────────────────────────────────────────────────
// 인증 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function getFailCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(FAIL_COUNT_KEY) ?? '0', 10);
}

function incrementFailCount(): number {
  const count = getFailCount() + 1;
  localStorage.setItem(FAIL_COUNT_KEY, String(count));
  if (count >= 5) {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now() + 30_000));
  }
  return count;
}

function resetFailCount(): void {
  localStorage.removeItem(FAIL_COUNT_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}

function getLockoutRemaining(): number {
  const until = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? '0', 10);
  const remaining = until - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function changePasswordInStorage(currentPw: string, newPw: string): Promise<boolean> {
  const ok = await verifyPassword(currentPw);
  if (!ok) return false;
  const newHash = await sha256Hex(newPw);
  localStorage.setItem(CUSTOM_HASH_KEY, newHash);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 기본 입력값
// ─────────────────────────────────────────────────────────────────────────────

interface StoredInputs {
  annualIncome: string;
  equity: string;
  mortgageRate: string;
  mortgageTerm: string;
  repaymentType: RepaymentType;
  creditBalance: string;
  creditRate: string;
  ltvPercent: number;
  targetDsr: number;
  stressEnabled: boolean;
  rateType: RateType;
  region: Region;
  stressLevel: StressLevel;
  firstHomeBuyer: boolean;
}

const DEFAULT_INPUTS: StoredInputs = {
  annualIncome: '',
  equity: '',
  mortgageRate: '3.5',
  mortgageTerm: '30',
  repaymentType: 'equal-principal-interest',
  creditBalance: '0',
  creditRate: '5.0',
  ltvPercent: 50,
  targetDsr: 40,
  stressEnabled: false,
  rateType: 'variable',
  region: 'metro',
  stressLevel: 'basic',
  firstHomeBuyer: false,
};

function loadInputs(): StoredInputs {
  if (typeof window === 'undefined') return DEFAULT_INPUTS;
  try {
    const raw = localStorage.getItem(DSR_INPUTS_KEY);
    if (!raw) return DEFAULT_INPUTS;
    return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INPUTS;
  }
}

function saveInputs(inputs: StoredInputs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DSR_INPUTS_KEY, JSON.stringify(inputs));
}

/** 숫자 문자열에서 콤마 제거 → 순수 숫자 */
function stripComma(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

/** 숫자 문자열 → 콤마 포맷 (타이핑 중 실시간) */
function toComma(v: string): string {
  const num = stripComma(v);
  if (!num) return '';
  return Number(num).toLocaleString('ko-KR');
}

/** 원 → 만원 변환 */
function wonToManwon(v: string): number {
  const num = parseInt(stripComma(v), 10);
  if (isNaN(num) || num <= 0) return 0;
  return num / 10000;
}

// ─────────────────────────────────────────────────────────────────────────────
// PasswordGate 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockout, setLockout] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 잠금 타이머
  useEffect(() => {
    const remaining = getLockoutRemaining();
    if (remaining > 0) {
      setLockout(remaining);
      const interval = setInterval(() => {
        const r = getLockoutRemaining();
        setLockout(r);
        if (r <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (lockout > 0) return;
    if (!password) {
      setError('비밀번호를 입력하세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await verifyPassword(password);
      if (ok) {
        resetFailCount();
        setAdminAuthenticated();
        onSuccess();
      } else {
        const count = incrementFailCount();
        if (count >= 5) {
          const remaining = getLockoutRemaining();
          setLockout(remaining);
          setError(`5회 실패. ${remaining}초 잠금`);
          const interval = setInterval(() => {
            const r = getLockoutRemaining();
            setLockout(r);
            if (r <= 0) {
              clearInterval(interval);
              setError('');
            } else {
              setError(`5회 실패. ${r}초 잠금`);
            }
          }, 1000);
        } else {
          setError(`비밀번호가 틀렸습니다 (${count}/5)`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#e8e5e0] rounded-xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-[#37352f] mb-1">관리자</div>
          <div className="text-sm text-[#787774]">비밀번호를 입력하세요</div>
        </div>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || lockout > 0}
            placeholder="비밀번호 (8자리)"
            maxLength={20}
            className="w-full border border-[#e8e5e0] rounded-md px-3 py-2.5 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] disabled:bg-[#f7f7f5] disabled:text-[#b4b4b0]"
          />

          {error && (
            <p className="text-xs text-[#eb5757]">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || lockout > 0}
            className="w-full bg-[#2383e2] hover:bg-[#1a6bc4] disabled:bg-[#d3d1cb] text-white rounded-md py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? '확인 중...' : lockout > 0 ? `${lockout}초 후 재시도` : '진입'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-[#787774] hover:text-[#37352f]">
            ← 메인으로
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 비밀번호 변경 모달
// ─────────────────────────────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (newPw.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (newPw !== confirmPw) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }
    setLoading(true);
    try {
      const ok = await changePasswordInStorage(currentPw, newPw);
      if (ok) {
        setSuccess(true);
      } else {
        setError('현재 비밀번호가 틀렸습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-sm bg-white border border-[#e8e5e0] rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[#37352f]">비밀번호 변경</h3>
          <button onClick={onClose} className="text-[#787774] hover:text-[#37352f] text-lg leading-none">×</button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-sm text-[#0f7b6c] font-medium mb-4">비밀번호가 변경되었습니다</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2383e2] text-white rounded-md text-sm"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#787774] mb-1 block">현재 비밀번호</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full border border-[#e8e5e0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#2383e2]"
              />
            </div>
            <div>
              <label className="text-xs text-[#787774] mb-1 block">새 비밀번호</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full border border-[#e8e5e0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#2383e2]"
              />
            </div>
            <div>
              <label className="text-xs text-[#787774] mb-1 block">새 비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full border border-[#e8e5e0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#2383e2]"
              />
            </div>
            {error && <p className="text-xs text-[#eb5757]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 border border-[#e8e5e0] rounded-md text-sm text-[#787774] hover:bg-[#f7f7f5]"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-[#2383e2] text-white rounded-md text-sm disabled:bg-[#d3d1cb]"
              >
                {loading ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DSR 계산기 (인증 후 메인)
// ─────────────────────────────────────────────────────────────────────────────

type AdminTab = 'dsr' | 'guide';

function DsrCalculator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dsr');
  const [inputs, setInputs] = useState<StoredInputs>(DEFAULT_INPUTS);
  const [dsrResult, setDsrResult] = useState<DsrResult | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStress, setShowStress] = useState(false);
  const [prices, setPrices] = useState<PriceMap>({});

  // 로드
  useEffect(() => {
    setInputs(loadInputs());
  }, []);

  // prices.json 로드
  useEffect(() => {
    fetch('/prices.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prices) setPrices(data.prices);
      })
      .catch(() => {});
  }, []);

  const updateField = useCallback(<K extends keyof StoredInputs>(key: K, value: StoredInputs[K]) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      saveInputs(next);
      return next;
    });
  }, []);

  const handleCalculate = () => {
    const income = wonToManwon(inputs.annualIncome);
    const eq = wonToManwon(inputs.equity);
    if (income <= 0) return;

    const dsrInput: DsrInput = {
      annualIncome: income,
      mortgageTerm: parseInt(inputs.mortgageTerm, 10),
      mortgageRate: parseFloat(inputs.mortgageRate),
      repaymentType: inputs.repaymentType,
      creditBalance: wonToManwon(inputs.creditBalance),
      creditRate: parseFloat(inputs.creditRate) || 5.0,
      equity: eq,
      ltvPercent: inputs.ltvPercent,
      targetDsr: inputs.targetDsr,
      stressEnabled: inputs.stressEnabled,
      rateType: inputs.rateType,
      region: inputs.region,
      stressLevel: inputs.stressLevel,
      firstHomeBuyer: inputs.firstHomeBuyer,
    };
    const result = calculateDsr(dsrInput);
    setDsrResult(result);
  };

  const handleLogout = () => {
    adminLogout();
    onLogout();
  };

  // 살 수 있는 아파트
  const affordableApartments = useMemo(() => {
    if (!dsrResult) return [];
    const maxPriceEok = dsrResult.maxPurchasePrice / 10000;
    return APARTMENTS.map((apt) => {
      const livePrice = prices[apt.id];
      const price = livePrice?.price ?? apt.basePrice;
      return { ...apt, currentPrice: livePrice?.price, effectivePrice: price, sizes: livePrice?.sizes };
    }).filter((apt) => apt.effectivePrice <= maxPriceEok);
  }, [dsrResult, prices]);

  // 구별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, typeof affordableApartments>();
    for (const apt of affordableApartments) {
      const list = map.get(apt.district) ?? [];
      list.push(apt);
      map.set(apt.district, list);
    }
    return map;
  }, [affordableApartments]);

  const dsrColor = (dsr: number) => {
    if (dsr <= 40) return 'text-[#0f7b6c]';
    if (dsr <= 50) return 'text-[#c77c14]';
    return 'text-[#eb5757]';
  };

  const dsrBg = (dsr: number) => {
    if (dsr <= 40) return 'bg-[#edfaf6]';
    if (dsr <= 50) return 'bg-[#fff8ee]';
    return 'bg-[#fbe4e4]';
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* 헤더 */}
      <header className="bg-white border-b border-[#e8e5e0] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[#787774] hover:text-[#37352f]">
              ← 메인
            </Link>
            <span className="text-[#e8e5e0]">|</span>
            <span className="text-base font-semibold text-[#37352f]">관리자</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-1.5 text-sm border border-[#e8e5e0] rounded-md text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm border border-[#e8e5e0] rounded-md text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
        {/* 탭 */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0">
          {([
            { key: 'dsr' as AdminTab, label: 'DSR 계산기' },
            { key: 'guide' as AdminTab, label: '가이드' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#2383e2] text-[#2383e2]'
                  : 'border-transparent text-[#787774] hover:text-[#37352f]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
      {activeTab === 'guide' ? (
        <GuideContent />
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* ── 왼쪽: 입력 폼 ── */}
          <div className="space-y-4">
            <div className="bg-white border border-[#e8e5e0] rounded-lg p-5">
              <h2 className="text-sm font-semibold text-[#37352f] mb-4">DSR 계산기</h2>

              <div className="space-y-3">
                {/* 연봉 */}
                <div>
                  <label className="text-xs text-[#787774] mb-1 block">연봉</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toComma(inputs.annualIncome)}
                      onChange={(e) => updateField('annualIncome', stripComma(e.target.value))}
                      placeholder="70,000,000"
                      className="flex-1 border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]"
                    />
                    <span className="text-xs text-[#787774] shrink-0">원</span>
                  </div>
                </div>

                {/* 자기자본 */}
                <div>
                  <label className="text-xs text-[#787774] mb-1 block">자기자본</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={toComma(inputs.equity)}
                      onChange={(e) => updateField('equity', stripComma(e.target.value))}
                      placeholder="500,000,000"
                      className="flex-1 border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]"
                    />
                    <span className="text-xs text-[#787774] shrink-0">원</span>
                  </div>
                </div>

                {/* 주담대 금리 / 기간 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#787774] mb-1 block">주담대 금리</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={inputs.mortgageRate}
                        onChange={(e) => updateField('mortgageRate', e.target.value)}
                        className="flex-1 border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]"
                      />
                      <span className="text-xs text-[#787774]">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#787774] mb-1 block">대출기간</label>
                    <select
                      value={inputs.mortgageTerm}
                      onChange={(e) => updateField('mortgageTerm', e.target.value)}
                      className="w-full border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2] bg-white"
                    >
                      {[10, 15, 20, 25, 30, 35, 40].map((y) => (
                        <option key={y} value={y}>{y}년</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 상환방식 */}
                <div>
                  <label className="text-xs text-[#787774] mb-1 block">상환방식</label>
                  <div className="flex rounded-md border border-[#e8e5e0] overflow-hidden">
                    {(
                      [
                        { value: 'equal-principal-interest', label: '원리금균등' },
                        { value: 'equal-principal', label: '원금균등' },
                        { value: 'bullet', label: '만기일시' },
                      ] as { value: RepaymentType; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateField('repaymentType', opt.value)}
                        className={`flex-1 py-2 text-xs transition-colors ${
                          inputs.repaymentType === opt.value
                            ? 'bg-[#2383e2] text-white'
                            : 'bg-white text-[#787774] hover:bg-[#f7f7f5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 신용대출 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#787774] mb-1 block">신용대출 잔액</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toComma(inputs.creditBalance)}
                        onChange={(e) => updateField('creditBalance', stripComma(e.target.value))}
                        placeholder="0"
                        className="flex-1 border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]"
                      />
                      <span className="text-xs text-[#787774]">원</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#787774] mb-1 block">신용 금리</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={inputs.creditRate}
                        onChange={(e) => updateField('creditRate', e.target.value)}
                        className="flex-1 border border-[#e8e5e0] rounded-md px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]"
                      />
                      <span className="text-xs text-[#787774]">%</span>
                    </div>
                  </div>
                </div>

                {/* LTV */}
                <div>
                  <label className="text-xs text-[#787774] mb-1 block">LTV</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[40, 50, 60, 70, 80].map((v) => (
                      <button
                        key={v}
                        onClick={() => updateField('ltvPercent', v)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                          inputs.ltvPercent === v
                            ? 'bg-[#2383e2] text-white border-[#2383e2]'
                            : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 목표 DSR */}
                <div>
                  <label className="text-xs text-[#787774] mb-1 block">목표 DSR</label>
                  <div className="flex gap-1.5">
                    {[40, 50].map((v) => (
                      <button
                        key={v}
                        onClick={() => updateField('targetDsr', v)}
                        className={`px-4 py-1.5 rounded-md text-xs border transition-colors ${
                          inputs.targetDsr === v
                            ? 'bg-[#2383e2] text-white border-[#2383e2]'
                            : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 스트레스 DSR 섹션 */}
            <div className="bg-white border border-[#e8e5e0] rounded-lg overflow-hidden">
              <button
                onClick={() => setShowStress(!showStress)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[#37352f] hover:bg-[#f7f7f5] transition-colors"
              >
                <span>스트레스 DSR</span>
                <span className="text-[#787774] text-xs">{showStress ? '▲ 접기' : '▼ 펼치기'}</span>
              </button>

              {showStress && (
                <div className="px-5 pb-5 space-y-3 border-t border-[#e8e5e0] pt-4">
                  {/* 스트레스 적용 토글 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#787774]">스트레스 적용</span>
                    <button
                      onClick={() => updateField('stressEnabled', !inputs.stressEnabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        inputs.stressEnabled ? 'bg-[#2383e2]' : 'bg-[#e8e5e0]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          inputs.stressEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {inputs.stressEnabled && (
                    <>
                      {/* 금리유형 */}
                      <div>
                        <label className="text-xs text-[#787774] mb-1 block">금리유형</label>
                        <div className="flex rounded-md border border-[#e8e5e0] overflow-hidden">
                          {(
                            [
                              { value: 'variable', label: '변동형' },
                              { value: 'mixed', label: '혼합형' },
                              { value: 'cycle', label: '주기형' },
                            ] as { value: RateType; label: string }[]
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateField('rateType', opt.value)}
                              className={`flex-1 py-1.5 text-xs transition-colors ${
                                inputs.rateType === opt.value
                                  ? 'bg-[#2383e2] text-white'
                                  : 'bg-white text-[#787774] hover:bg-[#f7f7f5]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 지역 */}
                      <div>
                        <label className="text-xs text-[#787774] mb-1 block">지역</label>
                        <div className="flex gap-2">
                          {(
                            [
                              { value: 'metro', label: '수도권' },
                              { value: 'non-metro', label: '비수도권' },
                            ] as { value: Region; label: string }[]
                          ).map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={inputs.region === opt.value}
                                onChange={() => updateField('region', opt.value)}
                                className="accent-[#2383e2]"
                              />
                              <span className="text-xs text-[#37352f]">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 스트레스 수준 */}
                      <div>
                        <label className="text-xs text-[#787774] mb-1 block">스트레스 수준</label>
                        <div className="flex gap-1.5">
                          {(
                            [
                              { value: 'basic', label: '기본 1.5%p' },
                              { value: 'enhanced', label: '강화 3.0%p' },
                            ] as { value: StressLevel; label: string }[]
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateField('stressLevel', opt.value)}
                              className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                                inputs.stressLevel === opt.value
                                  ? 'bg-[#2383e2] text-white border-[#2383e2]'
                                  : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 서울생초아 */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inputs.firstHomeBuyer}
                          onChange={(e) => updateField('firstHomeBuyer', e.target.checked)}
                          className="accent-[#2383e2]"
                        />
                        <span className="text-xs text-[#37352f]">서울생초아 (LTV 70%, 한도 6억)</span>
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 계산 버튼 */}
            <button
              onClick={handleCalculate}
              className="w-full bg-[#37352f] hover:bg-[#2f2d28] text-white rounded-lg py-3 text-sm font-semibold transition-colors"
            >
              계산하기
            </button>
          </div>

          {/* ── 오른쪽: 결과 + 아파트 ── */}
          <div className="mt-4 lg:mt-0 space-y-4">
            {/* 결과 패널 */}
            {!dsrResult ? (
              <div className="bg-white border border-[#e8e5e0] rounded-lg p-8 text-center">
                <p className="text-sm text-[#787774]">연봉과 자기자본을 입력하고</p>
                <p className="text-sm text-[#787774]">계산하기를 누르세요</p>
              </div>
            ) : (
              <div className="bg-white border border-[#e8e5e0] rounded-lg p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#37352f]">계산 결과</h2>

                {/* DSR 수치 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-lg p-3 ${dsrBg(dsrResult.basicDsr)}`}>
                    <div className="text-xs text-[#787774] mb-1">기본 DSR</div>
                    <div className={`text-2xl font-bold ${dsrColor(dsrResult.basicDsr)}`}>
                      {dsrResult.basicDsr.toFixed(1)}%
                    </div>
                  </div>
                  {dsrResult.stressDsr !== null && (
                    <div className={`rounded-lg p-3 ${dsrBg(dsrResult.stressDsr)}`}>
                      <div className="text-xs text-[#787774] mb-1">스트레스 DSR</div>
                      <div className={`text-2xl font-bold ${dsrColor(dsrResult.stressDsr)}`}>
                        {dsrResult.stressDsr.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* 월 상환액 */}
                <div className="flex justify-between items-center py-2 border-b border-[#f0ede8]">
                  <span className="text-sm text-[#787774]">월 상환액</span>
                  <span className="text-sm font-medium text-[#37352f]">{formatWon(dsrResult.monthlyPayment)}/월</span>
                </div>

                {/* 최대 대출가능액 */}
                <div className="flex justify-between items-center py-2 border-b border-[#f0ede8]">
                  <span className="text-sm text-[#787774]">최대 대출가능액</span>
                  <span className="text-base font-semibold text-[#37352f]">{formatWon(dsrResult.maxMortgage)}</span>
                </div>

                {/* 최대 매매가 (강조) */}
                <div className="bg-[#f0f7ff] rounded-lg p-4">
                  <div className="text-xs text-[#787774] mb-1">최대 매매가</div>
                  <div className="text-3xl font-bold text-[#2383e2]">
                    {formatEok(dsrResult.maxPurchasePrice)}
                  </div>
                  <div className="text-xs text-[#787774] mt-1">
                    KB시세 추정 {formatEok(dsrResult.kbPrice)}
                  </div>
                </div>
              </div>
            )}

            {/* 살 수 있는 아파트 */}
            {dsrResult && (
              <div className="bg-white border border-[#e8e5e0] rounded-lg p-5">
                <h2 className="text-sm font-semibold text-[#37352f] mb-3">
                  내가 살 수 있는 아파트
                  <span className="ml-2 text-xs text-[#787774] font-normal">
                    ({affordableApartments.length}개)
                  </span>
                </h2>

                {affordableApartments.length === 0 ? (
                  <p className="text-sm text-[#787774] text-center py-4">해당하는 아파트가 없습니다</p>
                ) : (
                  <div className="space-y-4">
                    {Array.from(grouped.entries()).map(([district, apts]) => (
                      <div key={district}>
                        <div className="text-xs font-medium text-[#787774] mb-1.5 px-1">{district}</div>
                        <div className="space-y-1">
                          {apts.map((apt) => (
                            <ApartmentCard
                              key={apt.id}
                              apartment={apt}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 가이드 콘텐츠
// ─────────────────────────────────────────────────────────────────────────────

function GuideContent() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col gap-8">
        {/* 1. 아파트 추가 방법 */}
        <section>
          <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">1</span>
            아파트 추가하기
          </h2>
          <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
            <p>
              <strong>파일 위치:</strong>{' '}
              <code className="bg-[#f1f1ef] px-1.5 py-0.5 rounded text-[12px]">src/data/apartments.ts</code>
            </p>
            <p>아래 형식으로 배열에 새 항목을 추가합니다:</p>
            <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`{
  id: 'district-name-unique',      // 고유 ID (영문, 하이픈)
  name: '아파트이름',               // 표시 이름
  district: '강남구',               // 구 이름 (types/index.ts의 District 타입 참조)
  size: '34평',                     // 평형 (24평, 34평, 43평 등)
  basePrice: 15.5,                  // 기준가 (억 단위)
  tier: '16',                       // 티어 ('12','14','16','20','24','28','32','50')
  naverComplexId: '12345',          // 네이버 부동산 단지 ID (필수!)
}`}</pre>
            <div className="bg-[#fbf3db] border border-[#f1e5bc] rounded-md px-3 py-2 text-[11px] text-[#8b6914]">
              <strong>naverComplexId 찾는 법:</strong> 네이버 부동산에서 아파트 검색 → URL에서 complexes/ 뒤의 숫자가 ID입니다.
              <br/>
              예: <code className="bg-[#f1e5bc]/50 px-1 rounded">new.land.naver.com/complexes/<strong>113059</strong></code> → ID는 113059
            </div>
          </div>
        </section>

        {/* 2. 크롤링 실행 */}
        <section>
          <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">2</span>
            가격 크롤링 실행
          </h2>
          <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
            <p>터미널에서 아래 명령어를 실행합니다:</p>
            <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`npm run crawl:browser`}</pre>
            <ul className="list-disc ml-5 flex flex-col gap-1.5 text-[12px] text-[#787774]">
              <li>Chrome 창이 자동으로 열리며 각 아파트 페이지를 순회합니다</li>
              <li>약 277개 단지 × 4초 = 약 18분 소요</li>
              <li>결과는 <code className="bg-[#f1f1ef] px-1 rounded">public/prices.json</code>에 저장됩니다</li>
              <li>크롤링 중 Chrome 창을 닫지 마세요!</li>
            </ul>
            <div className="bg-[#dbeddb] border border-[#b8d8b8] rounded-md px-3 py-2 text-[11px] text-[#0f7b6c]">
              <strong>참고:</strong> headless 모드가 아닌 실제 Chrome 창을 사용합니다 (네이버 봇 감지 우회).
              Stealth 플러그인이 자동 적용됩니다.
            </div>
          </div>
        </section>

        {/* 3. 배포 */}
        <section>
          <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">3</span>
            배포하기
          </h2>
          <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
            <p>크롤링 완료 후 Git push만 하면 Vercel이 자동 배포합니다:</p>
            <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`git add public/prices.json
git commit -m "chore: 가격 데이터 갱신"
git push`}</pre>
            <p className="text-[12px] text-[#787774]">
              아파트를 새로 추가한 경우에는 <code className="bg-[#f1f1ef] px-1 rounded">src/data/apartments.ts</code>도 함께 커밋합니다.
            </p>
          </div>
        </section>

        {/* 4. 노트 추가 */}
        <section>
          <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">4</span>
            노트 추가 (선택)
          </h2>
          <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
            <p>
              <strong>파일 위치:</strong>{' '}
              <code className="bg-[#f1f1ef] px-1.5 py-0.5 rounded text-[12px]">src/data/notes.ts</code>
            </p>
            <p>구 단위 노트 또는 개별 아파트 노트를 추가할 수 있습니다:</p>
            <pre className="bg-[#37352f] text-[#e8e5e0] rounded-md p-3 text-[11px] overflow-x-auto">{`// 구 단위 노트
{ tier: '14', content: '길음이 요즘 핫함', district: '성북구' },

// 개별 아파트 노트
{ tier: '14', content: '세대수 461, 흐름 좋음', apartmentId: 'some-apt-id' },`}</pre>
          </div>
        </section>

        {/* 5. 즐겨찾기 폴더 */}
        <section>
          <h2 className="text-base font-semibold text-[#37352f] mb-3 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2383e2]/10 text-[#2383e2] text-[12px] font-bold">5</span>
            즐겨찾기 폴더 사용법
          </h2>
          <div className="bg-[#f7f7f5] rounded-lg border border-[#e8e5e0] p-4 text-[13px] text-[#37352f] leading-relaxed flex flex-col gap-3">
            <ul className="list-disc ml-5 flex flex-col gap-1.5 text-[12px] text-[#787774]">
              <li>메인 페이지 상단의 <strong>&quot;+ 새 폴더&quot;</strong>로 폴더 생성 (예: 고객명)</li>
              <li>각 아파트 카드 왼쪽의 폴더 아이콘을 클릭하여 폴더에 추가/제거</li>
              <li>폴더를 선택하면 해당 폴더의 아파트만 모아 볼 수 있습니다</li>
              <li>하나의 아파트를 여러 폴더에 동시 추가 가능</li>
              <li>데이터는 브라우저 localStorage에 저장됩니다 (기기별 독립)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated());
  }, []);

  // SSR hydration 전
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2383e2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <PasswordGate
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <DsrCalculator
      onLogout={() => setAuthenticated(false)}
    />
  );
}
