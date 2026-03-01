// 주택취득자금 조달 및 입주계획서 자동분배 로직

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DistMethod = 'ratio' | 'person1' | 'person2' | 'custom';

export interface FundingItemInput {
  amount: number;
  distMethod: DistMethod;
  person1Amount?: number;
  person2Amount?: number;
}

export interface FundingInput {
  // 기본정보
  person1Name: string;
  person2Name: string;
  ownershipType: 'joint' | 'single'; // 공동명의 | 단독명의
  ratio: [number, number]; // e.g. [5, 5] or [6, 4]
  apartmentName: string;
  totalPrice: number; // 원

  // 자기자금
  deposit: FundingItemInput;        // ② 금융기관 예금액
  stockBond: FundingItemInput;      // ③ 주식·채권 매각대금
  gift: FundingItemInput;           // ④ 증여·상속
  cashEtc: FundingItemInput;        // ⑤ 현금 등 그 밖의 자금
  realEstateSale: FundingItemInput; // ⑥ 부동산 처분대금

  // 차입금
  mortgageLoan: FundingItemInput;   // 주택담보대출
  creditLoan: FundingItemInput;     // 신용대출
  otherLoan: FundingItemInput;      // 그 밖의 대출
  otherLoanType?: string;           // 하위호환용 (마이그레이션)
  person1OtherLoanType?: string;    // 그밖의 대출 종류
  person2OtherLoanType?: string;
  rentalDeposit: FundingItemInput;  // ⑨ 임대보증금
  companySupport: FundingItemInput; // ⑩ 회사지원금·사채
  otherBorrow: FundingItemInput;    // ⑪ 그 밖의 차입금

  // 지급방식 (per person)
  paymentTransfer: FundingItemInput;
  paymentDeposit: FundingItemInput;
  paymentCash: FundingItemInput;
  paymentCashReason?: string;       // 공유

  // 부가정보 (per person)
  person1GiftRelation?: string;
  person2GiftRelation?: string;
  person1CashType?: string;
  person2CashType?: string;
  person1HousingOwnership: 'none' | 'own';
  person2HousingOwnership: 'none' | 'own';
  person1HousingCount?: number;
  person2HousingCount?: number;
  person1OtherBorrowRelation?: string;
  person2OtherBorrowRelation?: string;

  // 입주계획 (per person)
  person1MoveInType: 'self' | 'family' | 'rental' | 'other';
  person2MoveInType: 'self' | 'family' | 'rental' | 'other';
  person1MoveInYear?: number;
  person2MoveInYear?: number;
  person1MoveInMonth?: number;
  person2MoveInMonth?: number;
}

export interface FundingForm {
  name: string;

  // 자기자금
  deposit: number;
  stockBond: number;
  gift: number;
  cashEtc: number;
  realEstateSale: number;
  ownFundsSubtotal: number; // ⑦

  // 차입금
  mortgageLoan: number;
  creditLoan: number;
  otherLoan: number;
  totalLoan: number;        // ⑧
  rentalDeposit: number;
  companySupport: number;
  otherBorrow: number;
  borrowSubtotal: number;   // ⑫

  // 합계
  grandTotal: number;       // ⑬

  // 지급방식
  paymentTransfer: number;
  paymentDeposit: number;
  paymentCash: number;

  // 부가정보 (per person)
  giftRelation: string;
  cashType: string;
  housingOwnership: 'none' | 'own';
  housingCount: number;
  otherBorrowRelation: string;
  otherLoanType: string;

  // 입주계획 (per person)
  moveInType: 'self' | 'family' | 'rental' | 'other';
  moveInYear?: number;
  moveInMonth?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatAmount(won: number): string {
  if (won === 0) return '';
  return won.toLocaleString('ko-KR');
}

function splitItem(
  item: FundingItemInput,
  ratio: [number, number],
): [number, number] {
  const { amount, distMethod, person1Amount, person2Amount } = item;
  switch (distMethod) {
    case 'ratio': {
      const total = ratio[0] + ratio[1];
      const p1 = Math.round((amount * ratio[0]) / total);
      const p2 = amount - p1;
      return [p1, p2];
    }
    case 'person1':
      return [amount, 0];
    case 'person2':
      return [0, amount];
    case 'custom':
      return [person1Amount ?? 0, person2Amount ?? 0];
    default:
      return [0, 0];
  }
}

// ---------------------------------------------------------------------------
// splitFunding
// ---------------------------------------------------------------------------

export function splitFunding(input: FundingInput): [FundingForm, FundingForm] {
  const r = input.ratio;
  const isSingle = (input.ownershipType ?? 'joint') === 'single';

  // 단독명의: person1에게 전액, person2는 0
  const split = (item: FundingItemInput): [number, number] =>
    isSingle ? [item.amount, 0] : splitItem(item, r);

  const [dep1, dep2] = split(input.deposit);
  const [sb1, sb2] = split(input.stockBond);
  const [gi1, gi2] = split(input.gift);
  const [ce1, ce2] = split(input.cashEtc);
  const [rs1, rs2] = split(input.realEstateSale);

  const [ml1, ml2] = split(input.mortgageLoan);
  const [cl1, cl2] = split(input.creditLoan);
  const [ol1, ol2] = split(input.otherLoan);
  const [rd1, rd2] = split(input.rentalDeposit);
  const [cs1, cs2] = split(input.companySupport);
  const [ob1, ob2] = split(input.otherBorrow);

  const [pt1, pt2] = split(input.paymentTransfer);
  const [pd1, pd2] = split(input.paymentDeposit);
  const [pc1, pc2] = split(input.paymentCash);

  function buildForm(
    name: string,
    deposit: number,
    stockBond: number,
    gift: number,
    cashEtc: number,
    realEstateSale: number,
    mortgageLoan: number,
    creditLoan: number,
    otherLoan: number,
    rentalDeposit: number,
    companySupport: number,
    otherBorrow: number,
    paymentTransfer: number,
    paymentDeposit: number,
    paymentCash: number,
    giftRelation: string,
    cashType: string,
    housingOwnership: 'none' | 'own',
    housingCount: number,
    otherBorrowRelation: string,
    otherLoanType: string,
    moveInType: 'self' | 'family' | 'rental' | 'other',
    moveInYear?: number,
    moveInMonth?: number,
  ): FundingForm {
    const ownFundsSubtotal = deposit + stockBond + gift + cashEtc + realEstateSale;
    const totalLoan = mortgageLoan + creditLoan + otherLoan;
    const borrowSubtotal = totalLoan + rentalDeposit + companySupport + otherBorrow;
    const grandTotal = ownFundsSubtotal + borrowSubtotal;
    return {
      name,
      deposit,
      stockBond,
      gift,
      cashEtc,
      realEstateSale,
      ownFundsSubtotal,
      mortgageLoan,
      creditLoan,
      otherLoan,
      totalLoan,
      rentalDeposit,
      companySupport,
      otherBorrow,
      borrowSubtotal,
      grandTotal,
      paymentTransfer,
      paymentDeposit,
      paymentCash,
      giftRelation,
      cashType,
      housingOwnership,
      housingCount,
      otherBorrowRelation,
      otherLoanType,
      moveInType,
      moveInYear,
      moveInMonth,
    };
  }

  const form1 = buildForm(
    input.person1Name,
    dep1, sb1, gi1, ce1, rs1,
    ml1, cl1, ol1, rd1, cs1, ob1,
    pt1, pd1, pc1,
    input.person1GiftRelation ?? '',
    input.person1CashType ?? '보유현금',
    input.person1HousingOwnership,
    input.person1HousingCount ?? 0,
    input.person1OtherBorrowRelation ?? '',
    input.person1OtherLoanType ?? input.otherLoanType ?? '',
    input.person1MoveInType,
    input.person1MoveInYear,
    input.person1MoveInMonth,
  );

  const form2 = buildForm(
    isSingle ? '' : input.person2Name,
    dep2, sb2, gi2, ce2, rs2,
    ml2, cl2, ol2, rd2, cs2, ob2,
    pt2, pd2, pc2,
    input.person2GiftRelation ?? '',
    input.person2CashType ?? '보유현금',
    input.person2HousingOwnership,
    input.person2HousingCount ?? 0,
    input.person2OtherBorrowRelation ?? '',
    input.person2OtherLoanType ?? input.otherLoanType ?? '',
    input.person2MoveInType,
    input.person2MoveInYear,
    input.person2MoveInMonth,
  );

  return [form1, form2];
}

// ---------------------------------------------------------------------------
// generateFormHtml
// ---------------------------------------------------------------------------

export function generateFormHtml(form: FundingForm, input: FundingInput): string {
  const fa = formatAmount;

  function chk(checked: boolean): string {
    return checked ? '☑' : '☐';
  }

  function amtCell(won: number): string {
    const v = fa(won);
    return v ? `${v} 원` : '&nbsp;';
  }

  // 증여 체크박스
  const giftRel = form.giftRelation ?? '';
  const giftNone = giftRel === '' || giftRel === '해당없음';
  const chkGiftSpouse   = chk(!giftNone && giftRel === '부부');
  const chkGiftLineal   = chk(!giftNone && giftRel === '직계존비속');
  const chkGiftOther    = chk(!giftNone && giftRel !== '부부' && giftRel !== '직계존비속');
  const giftOtherText   = (!giftNone && giftRel !== '부부' && giftRel !== '직계존비속') ? escHtml(giftRel) : '';

  // 현금 체크박스
  const cashT = form.cashType ?? '';
  const cashNone = cashT === '' || cashT === '해당없음';
  const chkCashHold  = chk(!cashNone && (cashT === '보유현금'));
  const chkCashAsset = chk(!cashNone && cashT !== '보유현금');
  const cashAssetText = (!cashNone && cashT !== '보유현금') ? escHtml(cashT) : '';

  // 기타대출 종류
  const otherLoanTypeText = form.otherLoanType ? escHtml(form.otherLoanType) : '';

  // 기존 주택 보유
  const chkHouseNone = chk(form.housingOwnership === 'none');
  const chkHouseOwn  = chk(form.housingOwnership === 'own');
  const houseCountText = form.housingOwnership === 'own' ? `${form.housingCount ?? 1}건` : '';

  // 기타차입 관계
  const borrowRel = form.otherBorrowRelation ?? '';
  const borrowNone = borrowRel === '' || borrowRel === '해당없음';
  const chkBorrowSpouse  = chk(!borrowNone && borrowRel === '부부');
  const chkBorrowLineal  = chk(!borrowNone && borrowRel === '직계존비속');
  const chkBorrowOther   = chk(!borrowNone && borrowRel !== '부부' && borrowRel !== '직계존비속');
  const borrowOtherText  = (!borrowNone && borrowRel !== '부부' && borrowRel !== '직계존비속') ? escHtml(borrowRel) : '';

  // 입주 계획
  const chkSelf   = chk(form.moveInType === 'self');
  const chkFamily = chk(form.moveInType === 'family');
  const chkRental = chk(form.moveInType === 'rental');
  const chkOther  = chk(form.moveInType === 'other');
  const moveInSchedule =
    form.moveInYear && form.moveInMonth
      ? `${form.moveInYear}년 ${form.moveInMonth}월`
      : form.moveInYear
        ? `${form.moveInYear}년`
        : '&nbsp;&nbsp;&nbsp;&nbsp;년 &nbsp;&nbsp;&nbsp;&nbsp;월';

  // 현금지급사유
  const cashReasonText = input.paymentCashReason ? escHtml(input.paymentCashReason) : '';

  const B = 'border:1px solid #000;';
  const P = 'padding:2px 4px;';
  const BP = B + P;
  const GBP = BP + 'background:#e8e8e8;';
  const VH = 'vertical-align:middle;';

  return `<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  .form-page {
    font-family: '맑은 고딕', 'Malgun Gothic', sans-serif;
    font-size: 9.5px;
    color: #000;
    width: 186mm;
    box-sizing: border-box;
    page-break-after: always;
  }
  .form-page table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .form-page td, .form-page th {
    border: 1px solid #000;
    padding: 2px 4px;
    vertical-align: middle;
    word-break: keep-all;
    line-height: 1.4;
    font-size: 9.5px;
  }
  .form-page .bg { background: #e8e8e8; }
  .form-page .center { text-align: center; }
  .form-page .right { text-align: right; }
  .form-page .bold { font-weight: bold; }
  .form-page .title-row td { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; padding: 4px; }
  .form-page .notice { font-size: 8.5px; }
  .form-page .amt { text-align: right; }
  @media print {
    .form-page { page-break-after: always; }
  }
</style>
<div class="form-page">
<table>
  <!-- 법률 근거 -->
  <tr>
    <td colspan="8" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;background:#e8e8e8;">
      ■ 부동산 거래신고 등에 관한 법률 시행규칙 [별지 제1호의3서식]
    </td>
  </tr>
  <!-- 제목 -->
  <tr class="title-row">
    <td colspan="8" style="border:1px solid #000;padding:4px;text-align:center;font-size:13px;font-weight:bold;letter-spacing:1px;">
      주택취득자금 조달 및 입주계획서
    </td>
  </tr>
  <!-- 유의 -->
  <tr>
    <td colspan="8" style="border:1px solid #000;padding:2px 4px;font-size:8px;">
      ※ 색상이 어두운 난은 신청인이 적지 않으며, 해당되는 곳에 [✓]표시를 합니다.
    </td>
  </tr>
  <!-- 접수번호/접수일시/처리기간 -->
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">접수번호</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">접수일시</td>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">처리기간</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
    <td colspan="3" style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
    <td colspan="2" style="border:1px solid #000;padding:3px 4px;text-align:center;">즉시</td>
  </tr>
  <!-- 제출인 헤더 -->
  <tr>
    <td rowspan="3" colspan="1" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;width:12mm;">제출인<br>(매수인)</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">성명(법인명)</td>
    <td colspan="4" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">주민등록번호(법인·외국인등록번호)</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:3px 4px;">${escHtml(form.name)}</td>
    <td colspan="4" style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">주소(법인소재지)</td>
    <td colspan="2" style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">(휴대)전화번호</td>
    <td style="border:1px solid #000;padding:3px 4px;">&nbsp;</td>
  </tr>

  <!-- ① 자금조달계획 헤더 행 -->
  <tr>
    <td rowspan="18" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;width:10mm;writing-mode:vertical-rl;letter-spacing:2px;">①<br>자<br>금<br>조<br>달<br>계<br>획</td>
    <td rowspan="9" colspan="1" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;width:10mm;writing-mode:vertical-rl;letter-spacing:1px;">자<br>기<br>자<br>금</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">② 금융기관 예금액</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">③ 주식·채권 매각대금</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.deposit)}</td>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.stockBond)}</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">④ 증여·상속</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑤ 현금 등 그 밖의 자금</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.gift)}</td>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.cashEtc)}</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      ${chkGiftSpouse} 부부&nbsp; ${chkGiftLineal} 직계존비속&nbsp; ${chkGiftOther} 그 밖의 관계(${giftOtherText})
    </td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      ${chkCashHold} 보유현금&nbsp; ${chkCashAsset} 그 밖의 자산(종류: ${cashAssetText})
    </td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑥ 부동산 처분대금 등</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑦ 소계</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.realEstateSale)}</td>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.ownFundsSubtotal)}</td>
  </tr>
  <!-- padding rows to align with borrow section -->
  <tr>
    <td colspan="6" style="border:1px solid #000;padding:1px 4px;font-size:7px;">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="6" style="border:1px solid #000;padding:1px 4px;font-size:7px;">&nbsp;</td>
  </tr>

  <!-- 차입금 등 -->
  <tr>
    <td rowspan="9" colspan="1" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;width:10mm;writing-mode:vertical-rl;letter-spacing:1px;">차<br>입<br>금<br>등</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑧ 금융기관 대출액 합계</td>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">주택담보대출</td>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">신용대출</td>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">그 밖의 대출</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.totalLoan)}</td>
    <td class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.mortgageLoan)}</td>
    <td class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.creditLoan)}</td>
    <td class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.otherLoan)}</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      기존주택 보유여부: ${chkHouseNone} 미보유&nbsp; ${chkHouseOwn} 보유(${houseCountText})
    </td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      대출종류: ${otherLoanTypeText}
    </td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑨ 임대보증금</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑩ 회사지원금·사채</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.rentalDeposit)}</td>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.companySupport)}</td>
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑪ 그 밖의 차입금</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑫ 소계</td>
  </tr>
  <tr>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.otherBorrow)}</td>
    <td colspan="3" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.borrowSubtotal)}</td>
  </tr>
  <tr>
    <td colspan="6" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      ${chkBorrowSpouse} 부부&nbsp; ${chkBorrowLineal} 직계존비속&nbsp; ${chkBorrowOther} 그 밖의 관계(${borrowOtherText})
    </td>
  </tr>
  <!-- ⑬ 합계 -->
  <tr>
    <td colspan="6" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;font-weight:bold;">⑬ 합계 (자기자금 + 차입금 등)</td>
  </tr>
  <tr>
    <td colspan="7" style="border:1px solid #000;padding:2px 4px;text-align:right;font-weight:bold;">${amtCell(form.grandTotal)}</td>
  </tr>

  <!-- ⑭ 조달자금 지급방식 -->
  <tr>
    <td rowspan="6" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;writing-mode:vertical-rl;letter-spacing:2px;">⑭<br>조<br>달<br>자<br>금<br>지<br>급<br>방<br>식</td>
    <td colspan="7" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">
      총 거래금액
    </td>
  </tr>
  <tr>
    <td colspan="7" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(input.totalPrice)}</td>
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑮ 계좌이체 금액</td>
    <td colspan="2" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.paymentTransfer)}</td>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑯ 보증금·대출 승계 금액</td>
    <td class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.paymentDeposit)}</td>
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;">⑰ 현금 및 그 밖의 지급방식 금액</td>
    <td colspan="2" class="amt" style="border:1px solid #000;padding:2px 4px;text-align:right;">${amtCell(form.paymentCash)}</td>
    <td colspan="3" style="border:1px solid #000;padding:2px 4px;font-size:8.5px;">
      지급 사유: ${cashReasonText}
    </td>
  </tr>

  <!-- ⑱ 입주계획 -->
  <tr>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;writing-mode:vertical-rl;letter-spacing:2px;width:10mm;">⑱<br>입<br>주<br>계<br>획</td>
    <td colspan="7" style="border:1px solid #000;padding:3px 4px;">
      ${chkSelf}&nbsp;본인입주&nbsp;&nbsp;
      ${chkFamily}&nbsp;본인외 가족입주&nbsp;&nbsp;
      ${chkRental}&nbsp;임대(전·월세)&nbsp;&nbsp;
      ${chkOther}&nbsp;기타
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;text-align:center;font-size:8.5px;">입주예정</td>
    <td colspan="7" style="border:1px solid #000;padding:3px 4px;">
      (입주 예정 시기: ${moveInSchedule})
    </td>
  </tr>
</table>

<!-- 제출 서명란 -->
<table style="margin-top:6px;">
  <tr>
    <td style="border:none;padding:3px 0;font-size:8.5px;" colspan="3">
      「부동산 거래신고 등에 관한 법률」 제3조제1항 및 같은 법 시행규칙 제2조제4항에 따라 위의 내용을 제출합니다.
    </td>
  </tr>
  <tr>
    <td style="border:none;padding:3px 0;text-align:center;width:33%;">&nbsp;&nbsp;&nbsp;&nbsp;년 &nbsp;&nbsp;&nbsp;&nbsp;월 &nbsp;&nbsp;&nbsp;&nbsp;일</td>
    <td style="border:none;padding:3px 0;text-align:center;width:33%;">제출인: ${escHtml(form.name)}</td>
    <td style="border:none;padding:3px 0;text-align:center;width:34%;">(서명 또는 인)</td>
  </tr>
  <tr>
    <td style="border:none;padding:3px 0;font-size:9.5px;" colspan="3">시장·군수·구청장 귀하</td>
  </tr>
</table>

<!-- 유의사항 -->
<table style="margin-top:4px;width:100%;border-collapse:collapse;">
  <tr>
    <td style="border:1px solid #000;padding:2px 4px;background:#e8e8e8;font-weight:bold;font-size:8.5px;">유의사항</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:2px 6px;font-size:8px;line-height:1.5;">
      1. 제출하신 주택취득자금 조달 및 입주계획서는 국세청 등 관계 기관에 제공될 수 있습니다.<br>
      2. 주택취득자금 조달 및 입주계획서를 거짓으로 작성하거나 신고 기한(계약 체결일로부터 30일) 이내에 제출하지 않은 경우에는 과태료 등의 처분을 받을 수 있습니다.<br>
      3. 이 서식은 부동산거래계약 신고서와 함께 제출하는 서류입니다.
    </td>
  </tr>
</table>
</div>`;
}

// ---------------------------------------------------------------------------
// Internal escaping helper (XSS 방지)
// ---------------------------------------------------------------------------

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// generateFormPdf / generateFundingPdf 는 서버 전용 모듈로 이동됨
// → src/lib/funding-pdf-server.ts (fs 사용, API Route에서만 import)
