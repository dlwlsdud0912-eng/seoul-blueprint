// DSR 계산기 - 풀스펙 구현
// 금액 단위: 만원 (내부), 표시시 억 단위 변환

export type RepaymentType = 'equal-principal-interest' | 'equal-principal' | 'bullet';
export type RateType = 'variable' | 'mixed' | 'cycle';  // 변동형/혼합형/주기형
export type Region = 'metro' | 'non-metro';              // 수도권/비수도권
export type StressLevel = 'basic' | 'enhanced';          // 기본 1.5%p / 강화 3.0%p

export interface DsrInput {
  annualIncome: number;       // 연소득 (만원)
  mortgageAmount?: number;    // 주담대 금액 (만원) - 정방향 계산용
  mortgageTerm: number;       // 주담대 기간 (년)
  mortgageRate: number;       // 주담대 금리 (%)
  repaymentType: RepaymentType;
  creditBalance: number;      // 신용대출 잔액 (만원)
  creditRate: number;         // 신용대출 금리 (%)
  equity: number;             // 자기자본 (만원)
  ltvPercent: number;         // LTV (40/50/60/70/80)
  targetDsr: number;          // 목표 DSR (40/50)
  // 스트레스 DSR
  stressEnabled: boolean;
  rateType?: RateType;
  region?: Region;
  stressLevel?: StressLevel;
  // 서울생초아
  firstHomeBuyer?: boolean;
}

export interface DsrResult {
  // 기본 DSR
  basicDsr: number;            // 기본 DSR %
  stressDsr: number | null;    // 스트레스 DSR %
  monthlyPayment: number;      // 월 상환액 (만원)
  // 역산 결과
  maxMortgage: number;         // DSR 기준 최대 대출가능액 (만원)
  effectiveMaxMortgage: number;// 실제 최대 대출가능액 - 서울규제+LTV 반영 (만원)
  maxPurchasePrice: number;    // 최대 매매가 (만원)
  kbPrice: number;             // KB시세 추정 (만원)
  seoulCap: number;            // 서울 규제 한도 (만원)
  // 월 원금/이자 분리
  monthlyPrincipal: number;    // 월 원금 (만원)
  monthlyInterest: number;     // 월 이자 (만원)
  // 상세
  homeAnnualPayment: number;   // 주담대 연간 상환액
  creditAnnualPayment: number; // 신용대출 연간 상환액
  stressHomeAnnualPayment: number | null;
  stressCreditAnnualPayment: number | null;
  // 스트레스 기준 역산 (스트레스 활성화 시)
  stressMaxMortgage: number | null;           // 스트레스 금리 기준 최대 대출가능액 (만원)
  stressEffectiveMaxMortgage: number | null;  // 스트레스 기준 실제 대출가능액 (서울규제+LTV)
  stressMaxPurchasePrice: number | null;      // 스트레스 기준 최대 매매가
  stressKbPrice: number | null;               // 스트레스 기준 KB시세 추정
}

// ────────────────────────────────────────────────────────────────────────────
// 내부 헬퍼: 월 상환액 계산
// ────────────────────────────────────────────────────────────────────────────

function monthlyPaymentCalc(
  principal: number,   // 만원
  annualRate: number,  // %
  years: number,       // 년
  type: RepaymentType
): number {
  const m = years * 12;
  if (m <= 0 || principal <= 0) return 0;

  if (type === 'equal-principal-interest') {
    const r = annualRate / 100 / 12;
    if (r === 0) return principal / m;
    return (principal * r * Math.pow(1 + r, m)) / (Math.pow(1 + r, m) - 1);
  }

  if (type === 'equal-principal') {
    // 1개월차 상환액 (원금균등은 월마다 다름 - 여기서는 첫 달 반환)
    const r = annualRate / 100 / 12;
    const monthlyPrincipal = principal / m;
    return monthlyPrincipal + principal * r;
  }

  if (type === 'bullet') {
    // 이자만 납부
    const r = annualRate / 100 / 12;
    return principal * r;
  }

  return 0;
}

// ────────────────────────────────────────────────────────────────────────────
// 내부 헬퍼: 1년차 연간 상환액 합산
// ────────────────────────────────────────────────────────────────────────────

function firstYearAnnualPayment(
  principal: number,   // 만원
  annualRate: number,  // %
  years: number,       // 년
  type: RepaymentType
): number {
  const m = years * 12;
  if (m <= 0 || principal <= 0) return 0;
  const months = Math.min(12, m);

  if (type === 'equal-principal-interest') {
    const r = annualRate / 100 / 12;
    const monthly = r === 0 ? principal / m : (principal * r * Math.pow(1 + r, m)) / (Math.pow(1 + r, m) - 1);
    return monthly * months;
  }

  if (type === 'equal-principal') {
    // 원금균등: 매월 원금균등 + 잔액이자 합산
    const r = annualRate / 100 / 12;
    const monthlyPrincipal = principal / m;
    let sum = 0;
    for (let i = 0; i < months; i++) {
      const remaining = principal - monthlyPrincipal * i;
      sum += monthlyPrincipal + remaining * r;
    }
    return sum;
  }

  if (type === 'bullet') {
    // 만기일시: 이자만 납부
    const r = annualRate / 100 / 12;
    return principal * r * months;
  }

  return 0;
}

// ────────────────────────────────────────────────────────────────────────────
// 스트레스 가산금리 계산
// ────────────────────────────────────────────────────────────────────────────

function getMortgageStressAddon(
  rateType: RateType,
  region: Region,
  years: number,
  stressBase: number
): number {
  if (rateType === 'variable') {
    return region === 'metro' ? stressBase : stressBase * 0.5;
  }

  if (rateType === 'mixed') {
    // 혼합형: 고정기간 비율 = 5/대출기간
    const fixedRatio = Math.min(5 / years, 1);
    const metroTable = [0.8, 0.6, 0.4, 0];
    const nonMetroTable = [0.6, 0.4, 0.2, 0];
    const table = region === 'metro' ? metroTable : nonMetroTable;
    let idx: number;
    if (fixedRatio <= 0.25) idx = 0;
    else if (fixedRatio <= 0.5) idx = 1;
    else if (fixedRatio <= 0.75) idx = 2;
    else idx = 3;
    return table[idx] * stressBase;
  }

  if (rateType === 'cycle') {
    // 주기형: 주기비율 = 5/대출기간
    const cycleRatio = Math.min(5 / years, 1);
    const metroTable = [0.4, 0.3, 0.2, 0];
    const nonMetroTable = [0.3, 0.2, 0.1, 0];
    const table = region === 'metro' ? metroTable : nonMetroTable;
    let idx: number;
    if (cycleRatio <= 0.25) idx = 0;
    else if (cycleRatio <= 0.5) idx = 1;
    else if (cycleRatio <= 0.75) idx = 2;
    else idx = 3;
    return table[idx] * stressBase;
  }

  return 0;
}

function getCreditStressAddon(creditBalance: number, stressBase: number): number {
  // 신용대출 잔액 > 1억원(10000만원)이면 stressBase%p 가산
  return creditBalance > 10000 ? stressBase : 0;
}

// ────────────────────────────────────────────────────────────────────────────
// 최대 매매가 이진탐색
// ────────────────────────────────────────────────────────────────────────────

function findMaxPurchasePrice(
  maxMortgage: number,  // 만원
  equity: number,       // 만원
  ltvPercent: number,   // %
  firstHomeBuyer: boolean
): { price: number; kbPrice: number } {
  const MAX_PRICE = 1_000_000; // 100억 (만원)
  const PRECISION = 10;        // 10만원 정밀도

  let lo = 0;
  let hi = MAX_PRICE;
  let best = 0;

  while (hi - lo > PRECISION) {
    const mid = Math.floor((lo + hi) / 2);
    const kbPrice = Math.max(0, mid - 7000);

    let ltvCap = kbPrice * (ltvPercent / 100);

    let seoulCap: number;
    if (firstHomeBuyer) {
      ltvCap = kbPrice * 0.7;
      seoulCap = 60000;
    } else {
      if (kbPrice <= 150000) seoulCap = 60000;
      else if (kbPrice <= 250000) seoulCap = 40000;
      else seoulCap = 20000;
    }

    const allowedLoan = Math.min(maxMortgage, ltvCap, seoulCap);
    const needLoan = mid - equity;

    if (allowedLoan >= needLoan && needLoan >= 0) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const kbPrice = Math.max(0, best - 7000);
  return { price: best, kbPrice };
}

// ────────────────────────────────────────────────────────────────────────────
// 메인 계산 함수
// ────────────────────────────────────────────────────────────────────────────

export function calculateDsr(input: DsrInput): DsrResult {
  const {
    annualIncome,
    mortgageAmount,
    mortgageTerm,
    mortgageRate,
    repaymentType,
    creditBalance,
    creditRate,
    equity,
    ltvPercent,
    targetDsr,
    stressEnabled,
    rateType = 'variable',
    region = 'metro',
    stressLevel = 'basic',
    firstHomeBuyer = false,
  } = input;

  // 신용대출: 원리금균등, 60개월(5년) 고정
  const creditAnnualPayment = firstYearAnnualPayment(
    creditBalance,
    creditRate,
    5,
    'equal-principal-interest'
  );

  // ── 역산: 최대 대출가능액 ──
  // 가용상환액 = 연소득 × (targetDsr/100) - 신용대출연간상환액
  const availableForMortgage = annualIncome * (targetDsr / 100) - creditAnnualPayment;

  let maxMortgage = 0;
  if (availableForMortgage > 0) {
    const unitPayment = firstYearAnnualPayment(1, mortgageRate, mortgageTerm, repaymentType);
    maxMortgage = unitPayment > 0 ? availableForMortgage / unitPayment : 0;
  }

  // 최대 매매가 이진탐색
  const { price: maxPurchasePrice, kbPrice } = findMaxPurchasePrice(
    maxMortgage,
    equity,
    ltvPercent,
    firstHomeBuyer
  );

  // ── 서울 규제 한도 반영한 실제 최대 대출가능액 ──
  let seoulCap: number;
  if (firstHomeBuyer) {
    seoulCap = 60000; // 생애최초 6억
  } else {
    if (kbPrice <= 150000) seoulCap = 60000;       // KB시세 15억 이하 → 6억
    else if (kbPrice <= 250000) seoulCap = 40000;   // 15~25억 → 4억
    else seoulCap = 20000;                          // 25억 초과 → 2억
  }
  const ltvCap = firstHomeBuyer ? kbPrice * 0.7 : kbPrice * (ltvPercent / 100);
  const effectiveMaxMortgage = Math.min(maxMortgage, ltvCap, seoulCap);

  // ── 정방향: 실제 대출금 기준 DSR/월상환액 ──
  // 실제 필요 대출금 = 최대매매가 - 자기자본 (음수면 0)
  const actualMortgage = mortgageAmount ?? Math.max(0, maxPurchasePrice - equity);

  const homeAnnualPayment = firstYearAnnualPayment(
    actualMortgage,
    mortgageRate,
    mortgageTerm,
    repaymentType
  );

  const basicDsr =
    annualIncome > 0
      ? ((homeAnnualPayment + creditAnnualPayment) / annualIncome) * 100
      : 0;

  const monthlyPayment = monthlyPaymentCalc(
    actualMortgage,
    mortgageRate,
    mortgageTerm,
    repaymentType
  );

  // 스트레스 DSR
  let stressDsr: number | null = null;
  let stressHomeAnnualPayment: number | null = null;
  let stressCreditAnnualPayment: number | null = null;
  let stressMaxMortgageVal = 0;
  let stressEffectiveMaxMortgageVal = 0;
  let stressMaxPurchasePriceVal = 0;
  let stressKbPriceVal = 0;

  if (stressEnabled) {
    const stressBase = stressLevel === 'basic' ? 1.5 : 3.0;
    const mortgageAddon = getMortgageStressAddon(rateType, region, mortgageTerm, stressBase);
    const creditAddon = getCreditStressAddon(creditBalance, stressBase);

    stressHomeAnnualPayment = firstYearAnnualPayment(
      actualMortgage,
      mortgageRate + mortgageAddon,
      mortgageTerm,
      repaymentType
    );
    stressCreditAnnualPayment = firstYearAnnualPayment(
      creditBalance,
      creditRate + creditAddon,
      5,
      'equal-principal-interest'
    );

    stressDsr =
      annualIncome > 0
        ? ((stressHomeAnnualPayment + stressCreditAnnualPayment) / annualIncome) * 100
        : 0;

    // 스트레스 금리 기준 역산: targetDsr 이내 최대 대출가능액
    const stressCreditAnnualPmt = firstYearAnnualPayment(
      creditBalance, creditRate + creditAddon, 5, 'equal-principal-interest'
    );
    const stressAvailable = annualIncome * (targetDsr / 100) - stressCreditAnnualPmt;

    if (stressAvailable > 0) {
      const stressUnitPayment = firstYearAnnualPayment(
        1, mortgageRate + mortgageAddon, mortgageTerm, repaymentType
      );
      stressMaxMortgageVal = stressUnitPayment > 0 ? stressAvailable / stressUnitPayment : 0;
    }

    // 스트레스 기준 최대 매매가 이진탐색
    const stressFindResult = findMaxPurchasePrice(
      stressMaxMortgageVal, equity, ltvPercent, firstHomeBuyer
    );
    stressMaxPurchasePriceVal = stressFindResult.price;
    stressKbPriceVal = stressFindResult.kbPrice;

    // 스트레스 기준 서울 규제 + LTV 적용
    const stressKb = stressKbPriceVal;
    let stressSeoulCap: number;
    if (firstHomeBuyer) {
      stressSeoulCap = 60000;
    } else {
      if (stressKb <= 150000) stressSeoulCap = 60000;
      else if (stressKb <= 250000) stressSeoulCap = 40000;
      else stressSeoulCap = 20000;
    }
    const stressLtvCap = firstHomeBuyer ? stressKb * 0.7 : stressKb * (ltvPercent / 100);
    stressEffectiveMaxMortgageVal = Math.min(stressMaxMortgageVal, stressLtvCap, stressSeoulCap);
  }

  // 월 원금/이자 분리 (1개월차 기준)
  const monthlyRate = mortgageRate / 100 / 12;
  const monthlyInterest = actualMortgage * monthlyRate;
  const monthlyPrincipal = repaymentType === 'bullet' ? 0 : monthlyPayment - monthlyInterest;

  return {
    basicDsr,
    stressDsr,
    monthlyPayment,
    monthlyPrincipal,
    monthlyInterest,
    maxMortgage,
    effectiveMaxMortgage,
    maxPurchasePrice,
    kbPrice,
    seoulCap,
    homeAnnualPayment,
    creditAnnualPayment,
    stressHomeAnnualPayment,
    stressCreditAnnualPayment,
    stressMaxMortgage: stressEnabled ? stressMaxMortgageVal : null,
    stressEffectiveMaxMortgage: stressEnabled ? stressEffectiveMaxMortgageVal : null,
    stressMaxPurchasePrice: stressEnabled ? stressMaxPurchasePriceVal : null,
    stressKbPrice: stressEnabled ? stressKbPriceVal : null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 포맷 헬퍼
// ────────────────────────────────────────────────────────────────────────────

/** 만원 → "X억 Y만원" 형식 */
export function formatWon(manwon: number): string {
  if (manwon <= 0) return '0원';
  const eok = Math.floor(manwon / 10000);
  const man = Math.round(manwon % 10000);
  if (eok === 0) return `${man.toLocaleString()}만원`;
  if (man === 0) return `${eok.toLocaleString()}억`;
  return `${eok.toLocaleString()}억 ${man.toLocaleString()}만원`;
}

/** 만원 → "X.X억" 형식 */
export function formatEok(manwon: number): string {
  if (manwon <= 0) return '0억';
  const eok = manwon / 10000;
  return `${eok.toFixed(1)}억`;
}

/** 만원 → 원 단위 콤마 포맷 (예: 79,000만원 → "790,000,000원") */
export function formatFullWon(manwon: number): string {
  if (manwon <= 0) return '0원';
  const won = Math.round(manwon * 10000);
  return `${won.toLocaleString('ko-KR')}원`;
}
