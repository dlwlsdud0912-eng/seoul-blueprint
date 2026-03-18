'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import ApartmentCard from '@/components/ApartmentCard';
import AdminMapView from '@/components/AdminMapView';
import MindMapView from '@/components/MindMapView';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  adminLogout,
  verifyPassword,
} from '@/lib/admin-auth';
import { getMemos } from '@/lib/memo-storage';
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
  formatFullWon,
} from '@/lib/dsr-calculator';
import {
  type FundingInput,
  type FundingItemInput,
  type DistMethod,
  splitFunding,
  formatAmount,
} from '@/lib/funding-plan';
import { APARTMENTS } from '@/data/apartments';
import { isRegionAllowedApartment } from '@/data/region-exclusions';
import { getListingStatusBadges } from '@/data/listing-status';
import { TIERS } from '@/data/tiers';
import type { PriceMap, MemoMap, TierKey } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

const FAIL_COUNT_KEY = 'seoul-blueprint-admin-fail-count';
const LOCKOUT_KEY = 'seoul-blueprint-admin-lockout-until';
const CUSTOM_HASH_KEY = 'seoul-blueprint-admin-custom-hash';
const DSR_INPUTS_KEY = 'seoul-blueprint-admin-dsr-inputs';
const FUNDING_INPUTS_KEY = 'seoul-blueprint-admin-funding-inputs';

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

type AdminTab = 'dsr' | 'funding' | 'guide' | 'mindmap' | 'map';

function TierStickyBar({
  title,
  description,
  activeTier,
  totalCount,
  accent,
  onSelect,
}: {
  title: string;
  description: string;
  activeTier: TierKey;
  totalCount: number;
  accent: 'green' | 'purple';
  onSelect: (tier: TierKey) => void;
}) {
  const activeClass =
    accent === 'green'
      ? 'border-[#1f8f5f] bg-[#eef8f0] text-[#1f8f5f] shadow-[0_10px_24px_rgba(31,143,95,0.10)]'
      : 'border-[#6d4dff] bg-[#efe9ff] text-[#6d4dff] shadow-[0_10px_24px_rgba(109,77,255,0.10)]';

  return (
    <div
      data-testid="tier-sticky-bar"
      className="sticky top-[106px] z-[9] -mx-1 rounded-[24px] border border-white/80 bg-[rgba(255,255,255,0.88)] px-3 py-3 shadow-[0_18px_40px_rgba(55,64,76,0.08)] backdrop-blur md:top-[114px] md:px-4"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#37352f]">{title}</h2>
          <p className="mt-1 text-xs text-[#787774]">{description}</p>
        </div>
        <div className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs text-[#787774] shadow-[0_8px_20px_rgba(39,43,54,0.05)]">
          총 {totalCount}개 단지
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {TIERS.map((tier) => (
            <button
              key={tier.key}
              type="button"
              onClick={() => onSelect(tier.key)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:px-4 ${
                activeTier === tier.key
                  ? activeClass
                  : 'border-[#e8e5e0] bg-white text-[#787774] hover:bg-[#f7f7f5]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DsrCalculator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dsr');
  const [mindMapTier, setMindMapTier] = useState<TierKey>('12');
  const [inputs, setInputs] = useState<StoredInputs>(DEFAULT_INPUTS);
  const [dsrResult, setDsrResult] = useState<DsrResult | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [prices, setPrices] = useState<PriceMap>({});
  const [memos, setMemos] = useState<MemoMap>({});
  const hasCalculated = useRef(false);
  const prevLtv = useRef(inputs.ltvPercent);

  // 로드
  useEffect(() => {
    setInputs(loadInputs());
    setMemos(getMemos());
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
    hasCalculated.current = true;
  };

  // 입력값 변경 시 자동 재계산 (최초 계산 이후)
  useEffect(() => {
    if (hasCalculated.current && wonToManwon(inputs.annualIncome) > 0) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const handleLogout = () => {
    adminLogout();
    onLogout();
  };

  // 살 수 있는 아파트
  const affordableApartments = useMemo(() => {
    if (!dsrResult) return [];
    // 스트레스 기준이 있으면 그 값 사용, 없으면 기본값
    const maxPriceEok = (dsrResult.stressMaxPurchasePrice ?? dsrResult.maxPurchasePrice) / 10000;
    return APARTMENTS.filter((apt) => isRegionAllowedApartment(apt.id)).map((apt) => {
      const livePrice = prices[apt.id];
      const price = livePrice?.price ?? apt.basePrice;
      return {
        ...apt,
        currentPrice: livePrice?.price,
        effectivePrice: price,
        sizes: livePrice?.sizes,
        ownerVerified: livePrice?.ownerVerified,
        statusBadges: getListingStatusBadges(apt.id, livePrice),
      };
    }).filter((apt) => apt.effectivePrice <= maxPriceEok)
      .sort((a, b) => b.effectivePrice - a.effectivePrice);
  }, [dsrResult, prices]);

  const mindMapTierMeta = useMemo(
    () => TIERS.find((tier) => tier.key === mindMapTier),
    [mindMapTier]
  );

  const mindMapApartments = useMemo(
    () =>
      APARTMENTS.filter((apt) => isRegionAllowedApartment(apt.id) && apt.tier === mindMapTier)
        .map((apt) => {
          const livePrice = prices[apt.id];
          if (!livePrice) {
            return {
              ...apt,
              statusBadges: getListingStatusBadges(apt.id),
            };
          }
          return {
            ...apt,
            currentPrice: livePrice.price,
            priceChange: Math.round((livePrice.price - apt.basePrice) * 10) / 10,
            articleCount: livePrice.articleCount,
            areaName: livePrice.areaName,
            sizes: livePrice.sizes,
            ownerVerified: livePrice.ownerVerified,
            statusBadges: getListingStatusBadges(apt.id, livePrice),
          };
        }),
    [mindMapTier, prices]
  );

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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="text-xs sm:text-sm text-[#787774] hover:text-[#37352f] shrink-0">
              ← 메인
            </Link>
            <span className="text-[#e8e5e0]">|</span>
            <span className="text-sm sm:text-base font-semibold text-[#37352f] truncate">관리자</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('map')}
              className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm border border-[#cfe4d7] rounded-md text-[#1f8f5f] bg-[#eef8f0] hover:bg-[#e4f3e8] transition-colors"
            >
              지도
            </button>
            <button
              onClick={() => setActiveTab('mindmap')}
              className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm border border-[#d9cff8] rounded-md text-[#6d4dff] bg-[#f5f1ff] hover:bg-[#efe9ff] transition-colors"
            >
              마인드맵
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm border border-[#e8e5e0] rounded-md text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              비번변경
            </button>
            <button
              onClick={handleLogout}
              className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm border border-[#e8e5e0] rounded-md text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
        {/* 탭 */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {([
            { key: 'dsr' as AdminTab, label: 'DSR 계산기' },
            { key: 'funding' as AdminTab, label: '자금조달' },
            { key: 'guide' as AdminTab, label: '가이드' },
            { key: 'map' as AdminTab, label: '지도' },
            { key: 'mindmap' as AdminTab, label: '마인드맵' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
      ) : activeTab === 'map' ? (
        <div className="space-y-4">
          <TierStickyBar
            title="관리자 지도"
            description="네이버 단지 좌표를 기반으로, 현재 티어 아파트를 지도에서 검수하는 전용 뷰입니다."
            activeTier={mindMapTier}
            totalCount={mindMapApartments.length}
            accent="green"
            onSelect={setMindMapTier}
          />
          <AdminMapView
            apartments={mindMapApartments}
            memos={memos}
            activeTier={mindMapTier}
            title={`${mindMapTierMeta?.label ?? mindMapTier} 관리자 지도`}
            subtitle={`${mindMapTierMeta?.maxPrice ?? mindMapTier} 기준 단지를 지도 위에서 검수하고 비교합니다.`}
          />
        </div>
      ) : activeTab === 'mindmap' ? (
        <div className="space-y-4">
          <TierStickyBar
            title="관리자 마인드맵"
            description="홈에서는 숨기고, 관리자 안에서만 보는 전용 뷰입니다."
            activeTier={mindMapTier}
            totalCount={mindMapApartments.length}
            accent="purple"
            onSelect={setMindMapTier}
          />
          <MindMapView
            apartments={mindMapApartments}
            memos={memos}
            activeTier={mindMapTier}
            title={`${mindMapTierMeta?.label ?? mindMapTier} 관리자 마인드맵`}
            subtitle={`${mindMapTierMeta?.maxPrice ?? mindMapTier} 기준 단지를 관리자 전용 탐색 뷰로 정리`}
          />
        </div>
      ) : activeTab === 'funding' ? (
        <FundingPlanTab />
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
                  <label className="text-xs text-[#787774] mb-1 block">
                    LTV{inputs.firstHomeBuyer && <span className="text-[#2383e2] ml-1">(생초아 70% 고정)</span>}
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[40, 50, 60, 70, 80].map((v) => (
                      <button
                        key={v}
                        onClick={() => updateField('ltvPercent', v)}
                        disabled={inputs.firstHomeBuyer}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                          inputs.ltvPercent === v
                            ? 'bg-[#2383e2] text-white border-[#2383e2]'
                            : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                        } ${inputs.firstHomeBuyer ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    {([
                      { value: 40, label: '40% (1금융)' },
                      { value: 50, label: '50% (2금융)' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateField('targetDsr', opt.value)}
                        className={`px-4 py-1.5 rounded-md text-xs border transition-colors ${
                          inputs.targetDsr === opt.value
                            ? 'bg-[#2383e2] text-white border-[#2383e2]'
                            : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 스트레스 DSR */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={inputs.stressEnabled}
                      onChange={(e) => updateField('stressEnabled', e.target.checked)}
                      className="accent-[#2383e2]"
                    />
                    <span className="text-xs font-medium text-[#37352f]">스트레스 DSR 적용</span>
                  </label>

                  {inputs.stressEnabled && (
                    <div className="space-y-2.5 pl-5 border-l-2 border-[#2383e2]/20">
                      {/* 금리유형 + 지역 한 줄 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex rounded-md border border-[#e8e5e0] overflow-hidden">
                          {([
                            { value: 'variable' as RateType, label: '변동' },
                            { value: 'mixed' as RateType, label: '혼합' },
                            { value: 'cycle' as RateType, label: '주기' },
                          ]).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateField('rateType', opt.value)}
                              className={`px-2.5 py-1 text-[11px] transition-colors ${
                                inputs.rateType === opt.value
                                  ? 'bg-[#2383e2] text-white'
                                  : 'bg-white text-[#787774] hover:bg-[#f7f7f5]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {([
                            { value: 'metro' as Region, label: '수도권' },
                            { value: 'non-metro' as Region, label: '비수도권' },
                          ]).map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                checked={inputs.region === opt.value}
                                onChange={() => updateField('region', opt.value)}
                                className="accent-[#2383e2] w-3 h-3"
                              />
                              <span className="text-[11px] text-[#37352f]">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 스트레스 수준 + 서울생초아 한 줄 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex gap-1">
                          {([
                            { value: 'basic' as StressLevel, label: '1.5%p' },
                            { value: 'enhanced' as StressLevel, label: '3.0%p' },
                          ]).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateField('stressLevel', opt.value)}
                              className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                                inputs.stressLevel === opt.value
                                  ? 'bg-[#2383e2] text-white border-[#2383e2]'
                                  : 'bg-white text-[#787774] border-[#e8e5e0] hover:bg-[#f7f7f5]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inputs.firstHomeBuyer}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setInputs((prev) => {
                                const next = { ...prev, firstHomeBuyer: checked };
                                if (checked) {
                                  prevLtv.current = prev.ltvPercent;
                                  next.ltvPercent = 70;
                                } else {
                                  next.ltvPercent = prevLtv.current;
                                }
                                saveInputs(next);
                                return next;
                              });
                            }}
                            className="accent-[#2383e2]"
                          />
                          <span className="text-[11px] text-[#37352f]">서울생초아</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

                {/* DSR 수치 + 대출한도 + 최대 매매가 */}
                {(() => {
                  const displayDsr = dsrResult.stressDsr !== null ? dsrResult.stressDsr : dsrResult.basicDsr;
                  const displayLabel = dsrResult.stressDsr !== null ? 'DSR (스트레스 적용)' : 'DSR';
                  const isOverLimit = displayDsr > inputs.targetDsr;

                  const displayMaxMortgage = dsrResult.stressMaxMortgage ?? dsrResult.maxMortgage;
                  const displayEffective = dsrResult.stressEffectiveMaxMortgage ?? dsrResult.effectiveMaxMortgage;
                  const displayMaxPrice = dsrResult.stressMaxPurchasePrice ?? dsrResult.maxPurchasePrice;
                  const displayKbPrice = dsrResult.stressKbPrice ?? dsrResult.kbPrice;

                  return (
                    <>
                      {/* 실제 대출가능액 (메인) */}
                      <div className="rounded-lg p-4 bg-[#eb5757]/5 border border-[#eb5757]/20">
                        <div className="text-xs text-[#eb5757] font-medium mb-1">
                          DSR {inputs.targetDsr}% 이내 실제 대출가능액
                        </div>
                        <div className="text-2xl font-bold text-[#eb5757]">
                          {formatFullWon(displayEffective)}
                        </div>
                        <div className="text-sm text-[#eb5757]/60 mt-0.5">
                          {formatEok(displayEffective)}
                        </div>
                        {displayEffective < displayMaxMortgage && (
                          <div className="text-[11px] text-[#8b6914] bg-[#fbf3db] rounded px-2.5 py-1.5 mt-2">
                            서울 규제 한도 {formatWon(dsrResult.seoulCap)} 적용
                          </div>
                        )}
                      </div>

                      {/* 월 상환액 */}
                      <div className="py-2 border-b border-[#f0ede8]">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#787774]">월 상환액</span>
                          <span className="text-sm font-medium text-[#37352f]">{formatFullWon(dsrResult.monthlyPayment)}/월</span>
                        </div>
                        <div className="flex justify-end gap-3 mt-1">
                          <span className="text-[11px] text-[#787774]">원금 {formatFullWon(dsrResult.monthlyPrincipal)}</span>
                          <span className="text-[11px] text-[#787774]">이자 {formatFullWon(dsrResult.monthlyInterest)}</span>
                        </div>
                      </div>

                      {/* 최대 매매가 */}
                      <div className="bg-[#f0f7ff] rounded-lg p-4">
                        <div className="text-xs text-[#787774] mb-1">최대 매매가</div>
                        <div className="text-3xl font-bold text-[#2383e2]">
                          {formatFullWon(displayMaxPrice)}
                        </div>
                        <div className="text-sm text-[#2383e2]/70 font-medium mt-0.5">
                          {formatEok(displayMaxPrice)}
                        </div>
                        <div className="text-xs text-[#787774] mt-1">
                          KB시세 추정 {formatFullWon(displayKbPrice)} ({formatEok(displayKbPrice)})
                        </div>
                      </div>
                    </>
                  );
                })()}
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
// 자금조달 탭
// ─────────────────────────────────────────────────────────────────────────────

function emptyItem(distMethod: DistMethod = 'ratio'): FundingItemInput {
  return { amount: 0, distMethod };
}

const DEFAULT_FUNDING: FundingInput = {
  person1Name: '',
  person2Name: '',
  ownershipType: 'joint',
  ratio: [5, 5],
  apartmentName: '',
  totalPrice: 0,
  deposit: emptyItem(),
  stockBond: emptyItem(),
  gift: emptyItem(),
  cashEtc: emptyItem(),
  realEstateSale: emptyItem(),
  mortgageLoan: emptyItem(),
  creditLoan: emptyItem(),
  otherLoan: emptyItem(),
  otherLoanType: '',
  person1OtherLoanType: '',
  person2OtherLoanType: '',
  rentalDeposit: emptyItem(),
  companySupport: emptyItem(),
  otherBorrow: emptyItem(),
  // 부가정보 - per person
  person1GiftRelation: '해당없음',
  person2GiftRelation: '해당없음',
  person1CashType: '해당없음',
  person2CashType: '해당없음',
  person1HousingOwnership: 'none',
  person2HousingOwnership: 'none',
  person1HousingCount: 0,
  person2HousingCount: 0,
  person1OtherBorrowRelation: '해당없음',
  person2OtherBorrowRelation: '해당없음',
  // 지급방식 - FundingItemInput
  paymentTransfer: emptyItem(),
  paymentDeposit: emptyItem(),
  paymentCash: emptyItem(),
  paymentCashReason: '',
  // 입주계획 - per person
  person1MoveInType: 'self',
  person2MoveInType: 'self',
  person1MoveInYear: new Date().getFullYear(),
  person2MoveInYear: new Date().getFullYear(),
  person1MoveInMonth: 1,
  person2MoveInMonth: 1,
};

function loadFundingInputs(): FundingInput {
  if (typeof window === 'undefined') return DEFAULT_FUNDING;
  try {
    const raw = localStorage.getItem(FUNDING_INPUTS_KEY);
    if (!raw) return DEFAULT_FUNDING;
    const parsed = JSON.parse(raw);
    // 기존 공유 필드 → per-person 마이그레이션
    if (parsed.giftRelation && !parsed.person1GiftRelation) {
      parsed.person1GiftRelation = parsed.giftRelation;
      parsed.person2GiftRelation = parsed.giftRelation;
    }
    if (parsed.cashType && !parsed.person1CashType) {
      parsed.person1CashType = parsed.cashType;
      parsed.person2CashType = parsed.cashType;
    }
    if (parsed.housingOwnership && !parsed.person1HousingOwnership) {
      parsed.person1HousingOwnership = parsed.housingOwnership;
      parsed.person2HousingOwnership = parsed.housingOwnership;
    }
    if (parsed.housingCount != null && parsed.person1HousingCount == null) {
      parsed.person1HousingCount = parsed.housingCount;
      parsed.person2HousingCount = parsed.housingCount;
    }
    if (parsed.otherBorrowRelation && !parsed.person1OtherBorrowRelation) {
      parsed.person1OtherBorrowRelation = parsed.otherBorrowRelation;
      parsed.person2OtherBorrowRelation = parsed.otherBorrowRelation;
    }
    if (parsed.otherLoanType && !parsed.person1OtherLoanType) {
      parsed.person1OtherLoanType = parsed.otherLoanType;
      parsed.person2OtherLoanType = parsed.otherLoanType;
    }
    if (parsed.moveInType && !parsed.person1MoveInType) {
      parsed.person1MoveInType = parsed.moveInType;
      parsed.person2MoveInType = parsed.moveInType;
    }
    if (parsed.moveInYear && !parsed.person1MoveInYear) {
      parsed.person1MoveInYear = parsed.moveInYear;
      parsed.person2MoveInYear = parsed.moveInYear;
    }
    if (parsed.moveInMonth && !parsed.person1MoveInMonth) {
      parsed.person1MoveInMonth = parsed.moveInMonth;
      parsed.person2MoveInMonth = parsed.moveInMonth;
    }
    // 지급방식: number → FundingItemInput 마이그레이션
    if (typeof parsed.paymentTransfer === 'number') {
      parsed.paymentTransfer = { amount: parsed.paymentTransfer, distMethod: 'ratio' };
    }
    if (typeof parsed.paymentDeposit === 'number') {
      parsed.paymentDeposit = { amount: parsed.paymentDeposit, distMethod: 'ratio' };
    }
    if (typeof parsed.paymentCash === 'number') {
      parsed.paymentCash = { amount: parsed.paymentCash, distMethod: 'ratio' };
    }
    return { ...DEFAULT_FUNDING, ...parsed };
  } catch {
    return DEFAULT_FUNDING;
  }
}

function saveFundingInputs(inputs: FundingInput): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FUNDING_INPUTS_KEY, JSON.stringify(inputs));
}

function FundingPlanTab() {
  const [fi, setFi] = useState<FundingInput>(DEFAULT_FUNDING);
  const [ratioPreset, setRatioPreset] = useState<'5:5' | '6:4' | '7:3' | 'custom'>('5:5');
  // 부동산 처분대금 총액 입력 (ratio 모드용 별도 state)
  const [realEstateTotalInput, setRealEstateTotalInput] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);


  function update(partial: Partial<FundingInput>) {
    setFi((prev) => {
      const next = { ...prev, ...partial };
      return next;
    });
  }

  // person1/person2 금액 직접 입력 → custom 모드
  function updateItemDirect(key: keyof FundingInput, p1: number, p2: number) {
    const item: FundingItemInput = {
      amount: p1 + p2,
      distMethod: 'custom',
      person1Amount: p1,
      person2Amount: p2,
    };
    update({ [key]: item });
  }

  // 현재 item에서 person1/person2 금액 계산 (splitFunding 로직 인라인)
  function resolveAmounts(item: FundingItemInput): [number, number] {
    const { amount, distMethod, person1Amount, person2Amount } = item;
    const rSum = fi.ratio[0] + fi.ratio[1];
    switch (distMethod) {
      case 'ratio': {
        if (rSum === 0) return [0, 0];
        const p1 = Math.round((amount * fi.ratio[0]) / rSum);
        return [p1, amount - p1];
      }
      case 'person1': return [amount, 0];
      case 'person2': return [0, amount];
      case 'custom': return [person1Amount ?? 0, person2Amount ?? 0];
      default: return [0, 0];
    }
  }

  const ratioPresets = [
    { label: '5:5', r: [5, 5] as [number, number] },
    { label: '6:4', r: [6, 4] as [number, number] },
    { label: '7:3', r: [7, 3] as [number, number] },
  ];

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded border ${
      active
        ? 'bg-[#2383e2] text-white border-[#2383e2]'
        : 'bg-[#f7f7f5] text-[#787774] border-[#e8e5e0] hover:bg-[#eee]'
    }`;

  const isSingle = fi.ownershipType === 'single';
  const totalPrice = fi.totalPrice;
  const rSum = fi.ratio[0] + fi.ratio[1];
  const share1 = isSingle ? totalPrice : (rSum > 0 ? Math.round((totalPrice * fi.ratio[0]) / rSum) : 0);
  const share2 = isSingle ? 0 : totalPrice - share1;

  // 자동계산: splitFunding 사용
  const [forms1, forms2] = (() => {
    try { return splitFunding(fi); } catch { return [null, null]; }
  })();

  const ownSubtotal1 = forms1 ? forms1.ownFundsSubtotal : 0;
  const ownSubtotal2 = forms2 ? forms2.ownFundsSubtotal : 0;
  const borrowSubtotal1 = forms1 ? forms1.borrowSubtotal : 0;
  const borrowSubtotal2 = forms2 ? forms2.borrowSubtotal : 0;
  const grandTotal1 = forms1 ? forms1.grandTotal : 0;
  const grandTotal2 = forms2 ? forms2.grandTotal : 0;

  async function handlePrint() {
    setPdfLoading(true);
    try {
      const resp = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fi),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        throw new Error(errBody?.detail || 'HTTP ' + resp.status);
      }

      const arrayBuffer = await resp.arrayBuffer();

      // pdfjs-dist 동적 import (클라이언트에서만)
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 3; // 고해상도 (3x for retina, 텍스트 선명)
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        images.push(canvas.toDataURL('image/png'));
      }

      setPreviewImages(images);
      setShowPreview(true);
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert('PDF 생성에 실패했습니다.\n\n원인: ' + msg);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleReset() {
    if (!confirm('모든 입력을 초기화하시겠습니까?')) return;
    setFi(DEFAULT_FUNDING);
    setRealEstateTotalInput('');
    setRatioPreset('5:5');
  }

  function downloadImage(dataUrl: string, pageNum: number) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `자금조달계획서_${pageNum}.png`;
    link.click();
  }

  const inputClass = 'w-full border border-[#e8e5e0] rounded px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]';
  const labelClass = 'text-xs text-[#787774] mb-1 block';
  const sectionClass = 'pt-4 border-t border-[#e8e5e0]';

  // 테이블 셀 스타일
  const tdLabel = 'border border-[#e8e5e0] px-2 py-1.5 text-xs text-[#37352f] bg-[#f7f7f5] whitespace-nowrap';
  const tdInput = 'border border-[#e8e5e0] px-1 py-0.5';
  const tdAuto = 'border border-[#e8e5e0] px-2 py-1.5 text-xs text-right text-[#37352f] bg-[#f7f7f5]';
  const tdSubtotal = 'border border-[#e8e5e0] px-2 py-1.5 text-xs text-right font-semibold text-[#37352f] bg-[#eee]';
  const cellInput = (val: number, onChange: (v: number) => void) => (
    <input
      type="text"
      inputMode="numeric"
      value={val ? toComma(String(val)) : ''}
      onChange={(e) => onChange(parseInt(stripComma(e.target.value) || '0', 10))}
      placeholder="0"
      className="w-full text-right text-xs px-1 py-1 focus:outline-none focus:border-[#2383e2] border border-transparent focus:border rounded"
    />
  );

  // 항목별 person1/person2 현재값
  const [dep1, dep2] = resolveAmounts(fi.deposit);
  const [sb1, sb2] = resolveAmounts(fi.stockBond);
  const [gi1, gi2] = resolveAmounts(fi.gift);
  const [ce1, ce2] = resolveAmounts(fi.cashEtc);
  const [rs1, rs2] = resolveAmounts(fi.realEstateSale);
  const [ml1, ml2] = resolveAmounts(fi.mortgageLoan);
  const [cl1, cl2] = resolveAmounts(fi.creditLoan);
  const [ol1, ol2] = resolveAmounts(fi.otherLoan);
  const [rd1, rd2] = resolveAmounts(fi.rentalDeposit);
  const [cs1, cs2] = resolveAmounts(fi.companySupport);
  const [ob1, ob2] = resolveAmounts(fi.otherBorrow);

  const p1Label = fi.person1Name || '인1';
  const p2Label = fi.person2Name || '인2';

  // 검증
  const ok1 = Math.abs(grandTotal1 - share1) < 1;
  const ok2 = Math.abs(grandTotal2 - share2) < 1;

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white border border-[#e8e5e0] rounded-lg p-5 space-y-5">

        {/* Zone A: 기본정보 */}
        <div>
          <h2 className="text-sm font-semibold text-[#37352f] mb-3">기본정보</h2>
          <div className="space-y-3">
            {/* 명의유형 */}
            <div>
              <label className={labelClass}>명의유형</label>
              <div className="flex rounded-md border border-[#e8e5e0] overflow-hidden">
                <button type="button" onClick={() => update({ ownershipType: 'joint' })}
                  className={`flex-1 py-2 text-xs transition-colors ${fi.ownershipType !== 'single' ? 'bg-[#2383e2] text-white' : 'bg-white text-[#787774] hover:bg-[#f7f7f5]'}`}>
                  공동명의
                </button>
                <button type="button" onClick={() => update({ ownershipType: 'single' })}
                  className={`flex-1 py-2 text-xs transition-colors ${fi.ownershipType === 'single' ? 'bg-[#2383e2] text-white' : 'bg-white text-[#787774] hover:bg-[#f7f7f5]'}`}>
                  단독명의
                </button>
              </div>
            </div>
            <div className={`grid ${isSingle ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              <div>
                <label className={labelClass}>{isSingle ? '매수인 이름' : '매수인1 이름'}</label>
                <input type="text" value={fi.person1Name} onChange={(e) => update({ person1Name: e.target.value })} placeholder="홍길동" className={inputClass} />
              </div>
              {!isSingle && (
              <div>
                <label className={labelClass}>매수인2 이름</label>
                <input type="text" value={fi.person2Name} onChange={(e) => update({ person2Name: e.target.value })} placeholder="김영희" className={inputClass} />
              </div>
              )}
            </div>
            <div>
              <label className={labelClass}>취득 물건 (아파트명)</label>
              <input type="text" value={fi.apartmentName} onChange={(e) => update({ apartmentName: e.target.value })} placeholder="○○아파트 ○○동 ○○호" className={inputClass} />
            </div>
            {!isSingle && (
            <div>
              <label className={labelClass}>지분비율</label>
              <div className="flex gap-1 flex-wrap">
                {ratioPresets.map((p) => (
                  <button key={p.label} type="button" onClick={() => { setRatioPreset(p.label as typeof ratioPreset); update({ ratio: p.r }); }} className={btnClass(ratioPreset === p.label)}>{p.label}</button>
                ))}
                <button type="button" onClick={() => setRatioPreset('custom')} className={btnClass(ratioPreset === 'custom')}>직접입력</button>
              </div>
              {ratioPreset === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <div className="flex-1">
                    <label className={labelClass}>{p1Label} 지분</label>
                    <input type="number" value={fi.ratio[0]} onChange={(e) => update({ ratio: [parseInt(e.target.value) || 0, fi.ratio[1]] })} className={inputClass} />
                  </div>
                  <div className="flex items-end pb-2 text-[#787774]">:</div>
                  <div className="flex-1">
                    <label className={labelClass}>{p2Label} 지분</label>
                    <input type="number" value={fi.ratio[1]} onChange={(e) => update({ ratio: [fi.ratio[0], parseInt(e.target.value) || 0] })} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
            )}
            <div>
              <label className={labelClass}>매수 총액</label>
              <div className="flex items-center gap-2">
                <input
                  type="text" inputMode="numeric"
                  value={fi.totalPrice ? toComma(String(fi.totalPrice)) : ''}
                  onChange={(e) => update({ totalPrice: parseInt(stripComma(e.target.value) || '0', 10) })}
                  placeholder="0"
                  className="flex-1 border border-[#e8e5e0] rounded px-3 py-2 text-sm text-right focus:outline-none focus:border-[#2383e2]"
                />
                <span className="text-xs text-[#787774] shrink-0">원</span>
              </div>
              {fi.totalPrice > 0 && !isSingle && (
                <div className="mt-1 text-xs text-[#787774]">
                  {p1Label}: {formatAmount(share1)}원 &nbsp;/&nbsp; {p2Label}: {formatAmount(share2)}원
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone B: 자금 테이블 */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-[#37352f] mb-3">자금조달계획</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#e8e5e0] px-2 py-2 bg-[#f0ede8] text-left text-[#37352f] font-semibold">항목</th>
                  <th className="border border-[#e8e5e0] px-2 py-2 bg-[#f0ede8] text-center text-[#37352f] font-semibold min-w-[110px]">{isSingle ? '금액' : p1Label}</th>
                  {!isSingle && <th className="border border-[#e8e5e0] px-2 py-2 bg-[#f0ede8] text-center text-[#37352f] font-semibold min-w-[110px]">{p2Label}</th>}
                </tr>
              </thead>
              <tbody>
                {/* 자기자금 */}
                <tr>
                  <td className={tdLabel}>② 금융기관 예금</td>
                  <td className={tdInput}>{cellInput(dep1, (v) => updateItemDirect('deposit', v, dep2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(dep2, (v) => updateItemDirect('deposit', dep1, v))}</td>}
                </tr>
                <tr>
                  <td className={tdLabel}>③ 주식·채권</td>
                  <td className={tdInput}>{cellInput(sb1, (v) => updateItemDirect('stockBond', v, sb2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(sb2, (v) => updateItemDirect('stockBond', sb1, v))}</td>}
                </tr>
                <tr>
                  <td className={tdLabel}>④ 증여·상속</td>
                  <td className={tdInput}>{cellInput(gi1, (v) => updateItemDirect('gift', v, gi2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(gi2, (v) => updateItemDirect('gift', gi1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1 text-[11px] text-[#787774] bg-[#fafaf8]">└ 증여 관계</td>
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 flex-wrap justify-center">
                      {(['해당없음', '부부', '직계존비속'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => update({ person1GiftRelation: r })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person1GiftRelation === r ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{r}</button>
                      ))}
                      <button type="button" onClick={() => update({ person1GiftRelation: '' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person1GiftRelation !== '해당없음' && fi.person1GiftRelation !== '부부' && fi.person1GiftRelation !== '직계존비속' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>기타</button>
                    </div>
                    {fi.person1GiftRelation !== '해당없음' && fi.person1GiftRelation !== '부부' && fi.person1GiftRelation !== '직계존비속' && (
                      <input type="text" value={fi.person1GiftRelation} onChange={(e) => update({ person1GiftRelation: e.target.value })}
                        placeholder="예: 삼촌" className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                    )}
                  </td>
                  {!isSingle && (
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 flex-wrap justify-center">
                      {(['해당없음', '부부', '직계존비속'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => update({ person2GiftRelation: r })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person2GiftRelation === r ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{r}</button>
                      ))}
                      <button type="button" onClick={() => update({ person2GiftRelation: '' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person2GiftRelation !== '해당없음' && fi.person2GiftRelation !== '부부' && fi.person2GiftRelation !== '직계존비속' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>기타</button>
                    </div>
                    {fi.person2GiftRelation !== '해당없음' && fi.person2GiftRelation !== '부부' && fi.person2GiftRelation !== '직계존비속' && (
                      <input type="text" value={fi.person2GiftRelation} onChange={(e) => update({ person2GiftRelation: e.target.value })}
                        placeholder="예: 삼촌" className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                    )}
                  </td>
                  )}
                </tr>
                <tr>
                  <td className={tdLabel}>⑤ 현금 등</td>
                  <td className={tdInput}>{cellInput(ce1, (v) => updateItemDirect('cashEtc', v, ce2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(ce2, (v) => updateItemDirect('cashEtc', ce1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1 text-[11px] text-[#787774] bg-[#fafaf8]">└ 현금 유형</td>
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {(['해당없음', '보유현금', '기타자산'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => update({ person1CashType: t })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person1CashType === t ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{t}</button>
                      ))}
                    </div>
                  </td>
                  {!isSingle && (
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {(['해당없음', '보유현금', '기타자산'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => update({ person2CashType: t })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person2CashType === t ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{t}</button>
                      ))}
                    </div>
                  </td>
                  )}
                </tr>
                <tr>
                  <td className={tdLabel}>
                    <div>⑥ 부동산 처분대금</div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[11px] text-[#787774]">총액</span>
                      <input
                        type="text" inputMode="numeric"
                        value={realEstateTotalInput}
                        onChange={(e) => {
                          const raw = stripComma(e.target.value);
                          setRealEstateTotalInput(raw ? toComma(raw) : '');
                          const amt = parseInt(raw || '0', 10);
                          update({ realEstateSale: { amount: amt, distMethod: 'ratio' } });
                        }}
                        placeholder="0"
                        className="w-20 border border-[#e8e5e0] rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:border-[#2383e2]"
                      />
                    </div>
                  </td>
                  <td className={tdInput}>{cellInput(rs1, (v) => updateItemDirect('realEstateSale', v, rs2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(rs2, (v) => updateItemDirect('realEstateSale', rs1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold text-[#37352f] bg-[#eee]">자기자금 소계</td>
                  <td className={tdSubtotal}>{ownSubtotal1 ? formatAmount(ownSubtotal1) : ''}</td>
                  {!isSingle && <td className={tdSubtotal}>{ownSubtotal2 ? formatAmount(ownSubtotal2) : ''}</td>}
                </tr>
                {/* 차입금 */}
                <tr>
                  <td className={tdLabel}>주택담보대출</td>
                  <td className={tdInput}>{cellInput(ml1, (v) => updateItemDirect('mortgageLoan', v, ml2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(ml2, (v) => updateItemDirect('mortgageLoan', ml1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1 text-[11px] text-[#787774] bg-[#fafaf8]">└ 기존주택 보유</td>
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 justify-center">
                      <button type="button" onClick={() => update({ person1HousingOwnership: 'none' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person1HousingOwnership === 'none' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>미보유</button>
                      <button type="button" onClick={() => update({ person1HousingOwnership: 'own' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person1HousingOwnership === 'own' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>보유</button>
                    </div>
                    {fi.person1HousingOwnership === 'own' && (
                      <input type="number" min={1} value={fi.person1HousingCount ?? 1}
                        onChange={(e) => update({ person1HousingCount: parseInt(e.target.value) || 1 })}
                        className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px] text-center" placeholder="건수" />
                    )}
                  </td>
                  {!isSingle && (
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 justify-center">
                      <button type="button" onClick={() => update({ person2HousingOwnership: 'none' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person2HousingOwnership === 'none' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>미보유</button>
                      <button type="button" onClick={() => update({ person2HousingOwnership: 'own' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person2HousingOwnership === 'own' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>보유</button>
                    </div>
                    {fi.person2HousingOwnership === 'own' && (
                      <input type="number" min={1} value={fi.person2HousingCount ?? 1}
                        onChange={(e) => update({ person2HousingCount: parseInt(e.target.value) || 1 })}
                        className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px] text-center" placeholder="건수" />
                    )}
                  </td>
                  )}
                </tr>
                <tr>
                  <td className={tdLabel}>신용대출</td>
                  <td className={tdInput}>{cellInput(cl1, (v) => updateItemDirect('creditLoan', v, cl2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(cl2, (v) => updateItemDirect('creditLoan', cl1, v))}</td>}
                </tr>
                <tr>
                  <td className={tdLabel}>그 밖의 대출</td>
                  <td className={tdInput}>{cellInput(ol1, (v) => updateItemDirect('otherLoan', v, ol2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(ol2, (v) => updateItemDirect('otherLoan', ol1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1 text-[11px] text-[#787774] bg-[#fafaf8]">└ 대출 종류</td>
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <input type="text" value={fi.person1OtherLoanType ?? ''} onChange={(e) => update({ person1OtherLoanType: e.target.value })}
                      placeholder="예: 전세자금대출" className="w-full border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                  </td>
                  {!isSingle && (
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <input type="text" value={fi.person2OtherLoanType ?? ''} onChange={(e) => update({ person2OtherLoanType: e.target.value })}
                      placeholder="예: 전세자금대출" className="w-full border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                  </td>
                  )}
                </tr>
                <tr>
                  <td className={tdLabel}>⑨ 임대보증금</td>
                  <td className={tdInput}>{cellInput(rd1, (v) => updateItemDirect('rentalDeposit', v, rd2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(rd2, (v) => updateItemDirect('rentalDeposit', rd1, v))}</td>}
                </tr>
                <tr>
                  <td className={tdLabel}>⑩ 회사지원금·사채</td>
                  <td className={tdInput}>{cellInput(cs1, (v) => updateItemDirect('companySupport', v, cs2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(cs2, (v) => updateItemDirect('companySupport', cs1, v))}</td>}
                </tr>
                <tr>
                  <td className={tdLabel}>⑪ 그 밖의 차입금</td>
                  <td className={tdInput}>{cellInput(ob1, (v) => updateItemDirect('otherBorrow', v, ob2))}</td>
                  {!isSingle && <td className={tdInput}>{cellInput(ob2, (v) => updateItemDirect('otherBorrow', ob1, v))}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1 text-[11px] text-[#787774] bg-[#fafaf8]">└ 차용 관계</td>
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 flex-wrap justify-center">
                      {(['해당없음', '부부', '직계존비속'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => update({ person1OtherBorrowRelation: r })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person1OtherBorrowRelation === r ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{r}</button>
                      ))}
                      <button type="button" onClick={() => update({ person1OtherBorrowRelation: '' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person1OtherBorrowRelation !== '해당없음' && fi.person1OtherBorrowRelation !== '부부' && fi.person1OtherBorrowRelation !== '직계존비속' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>기타</button>
                    </div>
                    {fi.person1OtherBorrowRelation !== '해당없음' && fi.person1OtherBorrowRelation !== '부부' && fi.person1OtherBorrowRelation !== '직계존비속' && (
                      <input type="text" value={fi.person1OtherBorrowRelation ?? ''} onChange={(e) => update({ person1OtherBorrowRelation: e.target.value })}
                        placeholder="예: 부모님" className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                    )}
                  </td>
                  {!isSingle && (
                  <td className="border border-[#e8e5e0] px-1 py-1 bg-[#fafaf8]">
                    <div className="flex gap-1 flex-wrap justify-center">
                      {(['해당없음', '부부', '직계존비속'] as const).map((r) => (
                        <button key={r} type="button" onClick={() => update({ person2OtherBorrowRelation: r })}
                          className={`px-2 py-1 text-[11px] rounded ${fi.person2OtherBorrowRelation === r ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{r}</button>
                      ))}
                      <button type="button" onClick={() => update({ person2OtherBorrowRelation: '' })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person2OtherBorrowRelation !== '해당없음' && fi.person2OtherBorrowRelation !== '부부' && fi.person2OtherBorrowRelation !== '직계존비속' ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>기타</button>
                    </div>
                    {fi.person2OtherBorrowRelation !== '해당없음' && fi.person2OtherBorrowRelation !== '부부' && fi.person2OtherBorrowRelation !== '직계존비속' && (
                      <input type="text" value={fi.person2OtherBorrowRelation ?? ''} onChange={(e) => update({ person2OtherBorrowRelation: e.target.value })}
                        placeholder="예: 부모님" className="w-full mt-1 border border-[#e8e5e0] rounded px-2 py-0.5 text-[10px]" />
                    )}
                  </td>
                  )}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold text-[#37352f] bg-[#eee]">차입금 소계</td>
                  <td className={tdSubtotal}>{borrowSubtotal1 ? formatAmount(borrowSubtotal1) : ''}</td>
                  {!isSingle && <td className={tdSubtotal}>{borrowSubtotal2 ? formatAmount(borrowSubtotal2) : ''}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold text-[#37352f] bg-[#eee]">합계</td>
                  <td className={tdSubtotal}>{grandTotal1 ? formatAmount(grandTotal1) : ''}</td>
                  {!isSingle && <td className={tdSubtotal}>{grandTotal2 ? formatAmount(grandTotal2) : ''}</td>}
                </tr>
                <tr>
                  <td className="border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold text-[#37352f] bg-[#eee]">검증</td>
                  <td className={`border border-[#e8e5e0] px-2 py-1.5 text-xs text-center ${grandTotal1 > 0 ? (ok1 ? 'text-[#0f7b6c] bg-[#edfaf6]' : 'text-[#eb5757] bg-[#fbe4e4]') : 'bg-[#f7f7f5]'}`}>
                    {grandTotal1 > 0 ? (ok1 ? '\u2713 일치' : `${grandTotal1 > share1 ? '+' : '-'}${formatAmount(Math.abs(grandTotal1 - share1))}`) : '-'}
                  </td>
                  {!isSingle && (
                  <td className={`border border-[#e8e5e0] px-2 py-1.5 text-xs text-center ${grandTotal2 > 0 ? (ok2 ? 'text-[#0f7b6c] bg-[#edfaf6]' : 'text-[#eb5757] bg-[#fbe4e4]') : 'bg-[#f7f7f5]'}`}>
                    {grandTotal2 > 0 ? (ok2 ? '\u2713 일치' : `${grandTotal2 > share2 ? '+' : '-'}${formatAmount(Math.abs(grandTotal2 - share2))}`) : '-'}
                  </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Zone D: 지급방식 */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-[#37352f] mb-3">지급방식</h2>
          {!isSingle && <p className="text-xs text-[#787774] mb-2">총액 입력 시 지분비율({fi.ratio[0]}:{fi.ratio[1]})로 자동 분배. 직접입력도 가능.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#f7f7f5] text-left w-[30%]">항목</th>
                  <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#f0f7ff] text-center">{isSingle ? '금액' : (fi.person1Name || '매수인1')}</th>
                  {!isSingle && <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#fff7f0] text-center">{fi.person2Name || '매수인2'}</th>}
                </tr>
              </thead>
              <tbody>
                {/* ⑮ 계좌이체 */}
                {(() => {
                  const [pt1, pt2] = resolveAmounts(fi.paymentTransfer);
                  return (
                    <tr>
                      <td className={tdLabel}>⑮ 계좌이체</td>
                      <td className={tdInput}>{cellInput(pt1, (v) => updateItemDirect('paymentTransfer', v, pt2))}</td>
                      {!isSingle && <td className={tdInput}>{cellInput(pt2, (v) => updateItemDirect('paymentTransfer', pt1, v))}</td>}
                    </tr>
                  );
                })()}
                {/* ⑯ 보증금승계 */}
                {(() => {
                  const [pd1, pd2] = resolveAmounts(fi.paymentDeposit);
                  return (
                    <tr>
                      <td className={tdLabel}>⑯ 보증금승계</td>
                      <td className={tdInput}>{cellInput(pd1, (v) => updateItemDirect('paymentDeposit', v, pd2))}</td>
                      {!isSingle && <td className={tdInput}>{cellInput(pd2, (v) => updateItemDirect('paymentDeposit', pd1, v))}</td>}
                    </tr>
                  );
                })()}
                {/* ⑰ 현금 */}
                {(() => {
                  const [pc1, pc2] = resolveAmounts(fi.paymentCash);
                  return (
                    <tr>
                      <td className={tdLabel}>⑰ 현금</td>
                      <td className={tdInput}>{cellInput(pc1, (v) => updateItemDirect('paymentCash', v, pc2))}</td>
                      {!isSingle && <td className={tdInput}>{cellInput(pc2, (v) => updateItemDirect('paymentCash', pc1, v))}</td>}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
          {/* 현금 사유 (공유) */}
          <div className="mt-2">
            <label className="block text-xs text-[#787774] mb-1">현금 지급 사유</label>
            <input type="text" value={fi.paymentCashReason ?? ''} onChange={(e) => update({ paymentCashReason: e.target.value })} placeholder="예: 현장 직접 지급" className="w-full border border-[#e8e5e0] rounded px-3 py-2 text-sm text-[#37352f] focus:outline-none focus:border-[#2383e2]" />
          </div>
        </div>

        {/* Zone E: 입주계획 */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-[#37352f] mb-3">입주계획</h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#f7f7f5] text-left w-[30%]">항목</th>
                <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#f0f7ff] text-center">{isSingle ? (fi.person1Name || '매수인') : (fi.person1Name || '매수인1')}</th>
                {!isSingle && <th className="border border-[#e8e5e0] px-2 py-1.5 bg-[#fff7f0] text-center">{fi.person2Name || '매수인2'}</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#e8e5e0] px-2 py-1.5 font-semibold bg-[#eee]">입주 형태</td>
                <td className="border border-[#e8e5e0] px-1 py-1">
                  <div className="flex gap-1 flex-wrap justify-center">
                    {(['self', 'family', 'rental', 'other'] as const).map((t) => {
                      const labels: Record<string, string> = { self: '본인', family: '가족', rental: '임대', other: '기타' };
                      return <button key={t} type="button" onClick={() => update({ person1MoveInType: t })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person1MoveInType === t ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{labels[t]}</button>;
                    })}
                  </div>
                </td>
                {!isSingle && (
                <td className="border border-[#e8e5e0] px-1 py-1">
                  <div className="flex gap-1 flex-wrap justify-center">
                    {(['self', 'family', 'rental', 'other'] as const).map((t) => {
                      const labels: Record<string, string> = { self: '본인', family: '가족', rental: '임대', other: '기타' };
                      return <button key={t} type="button" onClick={() => update({ person2MoveInType: t })}
                        className={`px-2 py-1 text-[11px] rounded ${fi.person2MoveInType === t ? 'bg-[#2383e2] text-white' : 'bg-[#f7f7f5] text-[#37352f]'}`}>{labels[t]}</button>;
                    })}
                  </div>
                </td>
                )}
              </tr>
              <tr>
                <td className="border border-[#e8e5e0] px-2 py-1.5 font-semibold bg-[#eee]">입주 예정</td>
                <td className="border border-[#e8e5e0] px-1 py-1">
                  <div className="flex gap-1 items-center justify-center">
                    <input type="number" value={fi.person1MoveInYear ?? ''} onChange={(e) => update({ person1MoveInYear: parseInt(e.target.value) || undefined })}
                      className="w-14 border border-[#e8e5e0] rounded px-1 py-0.5 text-xs text-center" placeholder="년" />
                    <span className="text-xs">년</span>
                    <input type="number" min={1} max={12} value={fi.person1MoveInMonth ?? ''} onChange={(e) => update({ person1MoveInMonth: parseInt(e.target.value) || undefined })}
                      className="w-10 border border-[#e8e5e0] rounded px-1 py-0.5 text-xs text-center" placeholder="월" />
                    <span className="text-xs">월</span>
                  </div>
                </td>
                {!isSingle && (
                <td className="border border-[#e8e5e0] px-1 py-1">
                  <div className="flex gap-1 items-center justify-center">
                    <input type="number" value={fi.person2MoveInYear ?? ''} onChange={(e) => update({ person2MoveInYear: parseInt(e.target.value) || undefined })}
                      className="w-14 border border-[#e8e5e0] rounded px-1 py-0.5 text-xs text-center" placeholder="년" />
                    <span className="text-xs">년</span>
                    <input type="number" min={1} max={12} value={fi.person2MoveInMonth ?? ''} onChange={(e) => update({ person2MoveInMonth: parseInt(e.target.value) || undefined })}
                      className="w-10 border border-[#e8e5e0] rounded px-1 py-0.5 text-xs text-center" placeholder="월" />
                    <span className="text-xs">월</span>
                  </div>
                </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Zone F: 하단 버튼 */}
        <div className={sectionClass}>
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs border border-[#eb5757] rounded text-[#eb5757] hover:bg-[#fbe4e4] transition-colors"
            >
              초기화
            </button>
            <a
              href="/funding-manual.pdf"
              download
              className="px-4 py-2 text-xs border border-[#e8e5e0] rounded text-[#787774] hover:bg-[#f7f7f5] transition-colors"
            >
              매뉴얼 다운로드
            </a>
            <button
              type="button"
              onClick={handlePrint}
              disabled={pdfLoading}
              className={`flex-1 py-2.5 text-white text-sm font-medium rounded-md transition-colors ${pdfLoading ? 'bg-[#93bce8] cursor-wait' : 'bg-[#2383e2] hover:bg-[#1a6fba]'}`}
            >
              {pdfLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  이미지 생성 중...
                </span>
              ) : '양식 미리보기'}
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* 이미지 미리보기 모달 */}
    {showPreview && previewImages.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPreview(false)}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          {/* 상단 바 */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#e8e5e0] px-4 py-3 flex items-center justify-between rounded-t-lg shrink-0">
            <button
              onClick={() => setShowPreview(false)}
              className="text-[#37352f] text-sm font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              닫기
            </button>
            <span className="text-xs text-[#787774]">이미지를 길게 눌러 저장</span>
            <button
              onClick={() => previewImages.forEach((img, i) => downloadImage(img, i + 1))}
              className="px-3 py-1.5 text-xs bg-[#2383e2] text-white rounded hover:bg-[#1a6fba]"
            >
              전체 저장
            </button>
          </div>
          {/* 이미지 목록 */}
          <div className="px-2 py-4 space-y-4 overflow-y-auto">
            {previewImages.map((src, i) => (
              <div key={i} className="flex flex-col items-center">
                <img
                  src={src}
                  alt={`자금조달계획서 ${i + 1}페이지`}
                  className="w-full border border-[#e8e5e0] shadow-sm"
                  style={{ imageRendering: 'auto' }}
                />
                <button
                  onClick={() => downloadImage(src, i + 1)}
                  className="mt-2 px-4 py-2 text-xs border border-[#e8e5e0] rounded text-[#787774] hover:bg-[#f7f7f5]"
                >
                  {i + 1}페이지 다운로드
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
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
