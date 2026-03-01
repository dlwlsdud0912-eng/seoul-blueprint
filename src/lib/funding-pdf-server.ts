// 서버 전용 PDF 생성 모듈 (Node.js fs 사용)
// API Route에서만 import하세요. 클라이언트 컴포넌트에서 import하면 빌드 에러 발생.

import { readFileSync } from 'fs';
import path from 'path';
import { splitFunding } from './funding-plan';
import type { FundingForm, FundingInput } from './funding-plan';

// ---------------------------------------------------------------------------
// generateFormPdf  —  빈 양식 PDF 위에 텍스트 삽입 후 Uint8Array 반환
// ---------------------------------------------------------------------------

/**
 * 한 사람분 FundingForm 데이터를 빈 양식 PDF 1페이지에 삽입합니다.
 *
 * PDF 좌표계: 좌하단 (0,0), Y 위로 증가.
 * A4: width=595.28pt, height=841.89pt
 *
 * 아래 COORDS 상수는 빈 양식 PDF를 측정해 얻은 근사값이며,
 * 실제 출력 확인 후 fine-tuning이 필요할 수 있습니다.
 */
async function generateFormPdf(
  form: FundingForm,
  input: FundingInput,
): Promise<Uint8Array> {
  // pdf-lib + fontkit (서버 환경에서 실행)
  const { PDFDocument, rgb } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  // 빈 양식 로드 (서버: fs 사용)
  const blankBytes = readFileSync(path.join(process.cwd(), 'public', 'funding-form-blank.pdf'));
  const pdfDoc = await PDFDocument.load(blankBytes);

  // fontkit 등록 + 한글 폰트 임베드
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Regular.ttf'));
  const font = await pdfDoc.embedFont(fontBytes);
  const boldFontBytes = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NanumGothicBold.ttf'));
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  // 1페이지만 사용
  const page = pdfDoc.getPage(0);
  const { height } = page.getSize(); // 841.89

  // ── 헬퍼 ──────────────────────────────────────────────────────────────

  /** PDF Y좌표 변환: 상단 기준 yFromTop → 하단 기준 y */
  function y(yFromTop: number): number {
    return height - yFromTop;
  }

  /** 금액 텍스트 삽입 (우측 정렬, 파란색 Bold, 노안도 잘 보이게 큰 사이즈) */
  function drawAmount(won: number, xRight: number, yFromTop: number, size = 11) {
    if (won === 0) return;
    const text = won.toLocaleString('ko-KR');
    const textWidth = boldFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: xRight - textWidth,
      y: y(yFromTop),
      size,
      font: boldFont,
      color: rgb(0, 0.1, 0.7),
    });
  }

  /** 텍스트 삽입 (좌측 정렬) */
  function drawText(text: string, xLeft: number, yFromTop: number, size = 8) {
    if (!text) return;
    page.drawText(text, {
      x: xLeft,
      y: y(yFromTop),
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  /** 체크마크 삽입 */
  function drawCheck(checked: boolean, xLeft: number, yFromTop: number, size = 9) {
    if (!checked) return;
    page.drawText('✓', {
      x: xLeft,
      y: y(yFromTop),
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // ── 좌표 상수 (A4 595×842, yFromTop 기준) ─────────────────────────
  // 빈 양식 PDF에서 pdfjs-dist로 추출한 정확한 좌표.

  // 제출인 영역
  const NAME_X      = 200;  const NAME_Y      = 143;

  // 자기자금 — 금액 우측끝 X ("원" 왼쪽)
  const OWN_RIGHT_L = 330;   // 좌 열 (원 x≈337)
  const OWN_RIGHT_R = 525;   // 우 열 (원 x≈531)
  const DEP_Y       = 218;   // ② 예금액
  const SB_Y        = 218;   // ③ 주식 (같은 행)
  const GIFT_Y      = 243;   // ④ 증여
  const CASH_Y      = 243;   // ⑤ 현금 (같은 행)
  const CHK_GIFT_Y  = 258;   // ④ 체크박스 1행
  const CHK_GIFT_OTHER_Y = 270; // ④ 체크박스 2행 (그밖의 관계)
  const CHK_CASH_Y  = 258;   // ⑤ 체크박스 1행
  const CHK_CASH_OTHER_Y = 270; // ⑤ 체크박스 2행 (그밖의 자산)
  const RE_Y        = 294;   // ⑥ 부동산 처분
  const OWN_SUB_Y   = 294;   // ⑦ 소계 (같은 행)

  // 차입금
  const BOR_LEFT_R  = 268;   // ⑧ 합계 좌측 (원 x≈275)
  const BOR_RIGHT_R = 525;   // 주택담보/신용/그밖/⑩/⑫ 우측 (원 x≈531)
  const LOAN_TOT_Y  = 348;   // ⑧ 합계
  const MORT_Y      = 314;   // 주택담보대출
  const CRED_Y      = 330;   // 신용대출
  const OTH_LOAN_Y  = 346;   // 그밖대출
  const CHK_HOUSE_Y = 382;   // 기존 주택 체크 행
  const RENT_Y      = 406;   // ⑨ 임대보증금
  const COMP_Y      = 406;   // ⑩ 회사지원금 (같은 행)
  const BOR_OTH2_Y  = 430;   // ⑪ 그밖차입금
  const BOR_SUB_Y   = 456;   // ⑫ 소계
  const CHK_BOR_Y   = 447;   // ⑪ 체크박스 1행
  const CHK_BOR_OTHER_Y = 459; // ⑪ 체크박스 2행

  // 합계
  const GRAND_RIGHT = 525;
  const GRAND_Y     = 476;   // ⑬

  // 지급방식 (모든 "원" x≈497)
  const PAY_R       = 490;   // 금액 우측끝 (모든 행 공통)
  const PAY_TOTAL_Y = 497;   // 총 거래금액
  const PAY_TRF_Y   = 513;   // ⑮ 계좌이체
  const PAY_DEP_Y   = 527;   // ⑯ 보증금 승계
  const PAY_CSH_Y   = 548;   // ⑰ 현금

  // 입주계획
  const CHK_MOVEIN_Y  = 584; // 입주계획 체크 행
  const CHK_MOVEIN2_Y = 585; // 임대/그밖 (약간 다른 행)
  const MOVEIN_SCH_X = 265;  const MOVEIN_SCH_Y = 598;

  // 서명란
  const SIGN_NAME_X = 380;   const SIGN_NAME_Y = 665;

  // 체크박스 X 좌표 ([ ] 안쪽에 ✓ 배치)
  const CHK_GIFT_SPOUSE_X   = 169;
  const CHK_GIFT_LINEAL_X   = 214;
  const CHK_GIFT_OTHER_X    = 169;   // 2행 사용
  const CHK_CASH_HOLD_X     = 367;
  const CHK_CASH_ASSET_X    = 367;   // 2행 사용
  const CHK_HOUSE_NONE_X    = 169;
  const CHK_HOUSE_OWN_X     = 239;
  const CHK_BOR_SPOUSE_X    = 169;
  const CHK_BOR_LINEAL_X    = 214;
  const CHK_BOR_OTHER_X     = 169;   // 2행 사용
  const CHK_SELF_X          = 172;
  const CHK_FAMILY_X        = 242;
  const CHK_RENTAL_X        = 381;
  const CHK_OTHER_X         = 458;

  // ── 데이터 삽입 ────────────────────────────────────────────────────

  // 성명
  drawText(form.name, NAME_X, NAME_Y, 9);

  // ② 예금
  drawAmount(form.deposit,       OWN_RIGHT_L, DEP_Y);
  // ③ 주식
  drawAmount(form.stockBond,     OWN_RIGHT_R, SB_Y);
  // ④ 증여
  drawAmount(form.gift,          OWN_RIGHT_L, GIFT_Y);
  // ⑤ 현금
  drawAmount(form.cashEtc,       OWN_RIGHT_R, CASH_Y);

  // ④ 체크박스 — 1행: 부부, 직계존비속 / 2행: 그밖
  const giftRel = input.giftRelation ?? '';
  drawCheck(giftRel === '부부',         CHK_GIFT_SPOUSE_X, CHK_GIFT_Y);
  drawCheck(giftRel === '직계존비속',   CHK_GIFT_LINEAL_X, CHK_GIFT_Y);
  drawCheck(giftRel !== '' && giftRel !== '부부' && giftRel !== '직계존비속',
                                        CHK_GIFT_OTHER_X,  CHK_GIFT_OTHER_Y);

  // ⑤ 체크박스 — 1행: 보유현금 / 2행: 그밖의 자산
  const cashT = input.cashType ?? '';
  drawCheck(cashT === '보유현금' || cashT === '', CHK_CASH_HOLD_X, CHK_CASH_Y);
  drawCheck(cashT !== '' && cashT !== '보유현금', CHK_CASH_ASSET_X, CHK_CASH_OTHER_Y);

  // ⑥ 부동산 처분
  drawAmount(form.realEstateSale,   OWN_RIGHT_L, RE_Y);
  // ⑦ 소계
  drawAmount(form.ownFundsSubtotal, OWN_RIGHT_R, OWN_SUB_Y);

  // ⑧ 대출 합계 + 세부
  drawAmount(form.totalLoan,    BOR_LEFT_R,  LOAN_TOT_Y);
  drawAmount(form.mortgageLoan, BOR_RIGHT_R, MORT_Y);
  drawAmount(form.creditLoan,   BOR_RIGHT_R, CRED_Y);
  drawAmount(form.otherLoan,    BOR_RIGHT_R, OTH_LOAN_Y);

  // 기존 주택 체크박스
  drawCheck(input.housingOwnership === 'none', CHK_HOUSE_NONE_X, CHK_HOUSE_Y);
  drawCheck(input.housingOwnership === 'own',  CHK_HOUSE_OWN_X,  CHK_HOUSE_Y);
  if (input.housingOwnership === 'own' && input.housingCount) {
    drawText(`${input.housingCount}`, 292, CHK_HOUSE_Y, 8);
  }

  // 대출 종류
  if (input.otherLoanType) {
    drawText(input.otherLoanType, 432, 356, 7.5);
  }

  // ⑨ 임대보증금
  drawAmount(form.rentalDeposit,  OWN_RIGHT_L, RENT_Y);
  // ⑩ 회사지원금
  drawAmount(form.companySupport, BOR_RIGHT_R, COMP_Y);
  // ⑪ 그밖차입금
  drawAmount(form.otherBorrow,    OWN_RIGHT_L, BOR_OTH2_Y);
  // ⑫ 소계
  drawAmount(form.borrowSubtotal, BOR_RIGHT_R, BOR_SUB_Y);

  // ⑪ 체크박스 — 1행: 부부, 직계존비속 / 2행: 그밖
  const borrowRel = input.otherBorrowRelation ?? '';
  drawCheck(borrowRel === '부부',         CHK_BOR_SPOUSE_X, CHK_BOR_Y);
  drawCheck(borrowRel === '직계존비속',   CHK_BOR_LINEAL_X, CHK_BOR_Y);
  drawCheck(borrowRel !== '' && borrowRel !== '부부' && borrowRel !== '직계존비속',
                                          CHK_BOR_OTHER_X,  CHK_BOR_OTHER_Y);

  // ⑬ 합계
  drawAmount(form.grandTotal,    GRAND_RIGHT, GRAND_Y, 9);

  // ⑭ 총 거래금액
  drawAmount(input.totalPrice,     PAY_R, PAY_TOTAL_Y);
  // ⑮ 계좌이체
  drawAmount(form.paymentTransfer, PAY_R, PAY_TRF_Y);
  // ⑯ 보증금 승계
  drawAmount(form.paymentDeposit,  PAY_R, PAY_DEP_Y);
  // ⑰ 현금
  drawAmount(form.paymentCash,     PAY_R, PAY_CSH_Y);
  if (input.paymentCashReason) {
    drawText(input.paymentCashReason, 235, 566, 7.5);
  }

  // ⑱ 입주계획 체크박스
  drawCheck(input.moveInType === 'self',   CHK_SELF_X,   CHK_MOVEIN_Y);
  drawCheck(input.moveInType === 'family', CHK_FAMILY_X, CHK_MOVEIN_Y);
  drawCheck(input.moveInType === 'rental', CHK_RENTAL_X, CHK_MOVEIN2_Y);
  drawCheck(input.moveInType === 'other',  CHK_OTHER_X,  CHK_MOVEIN2_Y);

  // 입주 예정 시기
  if (input.moveInYear || input.moveInMonth) {
    if (input.moveInYear)  drawText(`${input.moveInYear}`,  265, MOVEIN_SCH_Y, 8);
    if (input.moveInMonth) drawText(`${input.moveInMonth}`, 300, MOVEIN_SCH_Y, 8);
  }

  // 서명란 — 이름만 삽입
  drawText(form.name, SIGN_NAME_X, SIGN_NAME_Y, 8);

  const pdfBytesResult = await pdfDoc.save();
  return new Uint8Array(pdfBytesResult);
}

// ---------------------------------------------------------------------------
// generateFundingPdf  —  두 사람분 양식을 1 PDF로 합쳐서 반환
// ---------------------------------------------------------------------------

/**
 * FundingInput을 받아 두 사람분 자금조달계획서를 하나의 PDF로 만듭니다.
 * - 각 사람분 빈 양식 1페이지에 데이터 삽입
 * - 두 페이지를 새 PDFDocument에 복사해 반환
 */
export async function generateFundingPdf(
  input: FundingInput,
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');

  const [form1, form2] = splitFunding(input);

  const pdf1Bytes = await generateFormPdf(form1, input);
  const pdf2Bytes = await generateFormPdf(form2, input);

  const finalPdf = await PDFDocument.create();

  const src1 = await PDFDocument.load(pdf1Bytes);
  const src2 = await PDFDocument.load(pdf2Bytes);

  const [p1] = await finalPdf.copyPages(src1, [0]);
  const [p2] = await finalPdf.copyPages(src2, [0]);

  finalPdf.addPage(p1);
  finalPdf.addPage(p2);

  const result = await finalPdf.save();
  return new Uint8Array(result);
}
