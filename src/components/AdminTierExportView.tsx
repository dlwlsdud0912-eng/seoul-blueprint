'use client';

import { useMemo, useState } from 'react';
import type { TierKey } from '@/types';
import { buildTierExportPayload } from '@/lib/tier-export';
import { checkPriceProximity } from '@/lib/price-proximity';

type ExportApartment = {
  id: string;
  district: string;
  name: string;
  size: string;
  basePrice: number;
  currentPrice?: number;
  areaName?: string;
  sizes?: Record<string, { price: number; count: number } | null>;
};

interface AdminTierExportViewProps {
  apartments: ExportApartment[];
  activeTier: TierKey;
  updatedAtKR: string;
}

export default function AdminTierExportView({
  apartments,
  activeTier,
  updatedAtKR,
}: AdminTierExportViewProps) {
  const [mode, setMode] = useState<'all' | 'proximity'>('all');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [pdfLoading, setPdfLoading] = useState(false);

  const filteredApartments = useMemo(() => {
    if (mode === 'all') {
      return apartments;
    }

    return apartments.filter((apartment) => checkPriceProximity(apartment.sizes).hasProximity);
  }, [apartments, mode]);

  const proximityCount = useMemo(
    () => apartments.filter((apartment) => checkPriceProximity(apartment.sizes).hasProximity).length,
    [apartments]
  );

  const exportData = useMemo(
    () =>
      buildTierExportPayload(activeTier, filteredApartments, updatedAtKR, {
        titleSuffix: mode === 'proximity' ? '(가격근접 ON)' : '',
        filenamePrefix: mode === 'proximity' ? '가격근접ON' : undefined,
      }),
    [activeTier, filteredApartments, mode, updatedAtKR]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportData.bodyHtml);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      const response = await fetch('/api/tier-export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: exportData.title,
          subtitle: exportData.subtitle,
          filename: exportData.filename,
          rows: exportData.rows,
        }),
      });

      if (!response.ok) {
        throw new Error('PDF export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = exportData.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleOpenPreview() {
    const preview = window.open('', '_blank', 'noopener,noreferrer');
    if (!preview) {
      return;
    }
    preview.document.open();
    preview.document.write(exportData.documentHtml);
    preview.document.close();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[#dfe6ea] bg-[linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] p-4 shadow-[0_20px_45px_rgba(61,92,136,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-[#2f6feb] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(47,111,235,0.18)]">
              티어별 표 내보내기
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1b2b40]">{exportData.title}</h2>
              <p className="mt-1 text-sm text-[#5d7088]">
                네이버 프리미엄 스튜디오 복붙용 HTML과 PDF를 같은 화면에서 바로 뽑습니다.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#55657d] sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2">
              <div className="text-[11px] text-[#7b8aa0]">현재 티어</div>
              <div className="mt-1 font-semibold text-[#1b2b40]">{activeTier} 티어</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2">
              <div className="text-[11px] text-[#7b8aa0]">표 행 수</div>
              <div className="mt-1 font-semibold text-[#1b2b40]">{exportData.totalCount}개</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-[#7b8aa0]">업데이트</div>
              <div className="mt-1 font-semibold text-[#1b2b40]">{updatedAtKR || '-'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="export-mode-all"
              type="button"
              onClick={() => setMode('all')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                mode === 'all'
                  ? 'border-[#2f6feb] bg-[#edf4ff] text-[#2f6feb]'
                  : 'border-[#d9e3ef] bg-white text-[#5d7088] hover:bg-[#f6f9fc]'
              }`}
            >
              전체 {apartments.length}개
            </button>
            <button
              data-testid="export-mode-proximity"
              type="button"
              onClick={() => setMode('proximity')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                mode === 'proximity'
                  ? 'border-[#0f9d7a] bg-[#edf9f5] text-[#0f9d7a]'
                  : 'border-[#d9e3ef] bg-white text-[#5d7088] hover:bg-[#f6f9fc]'
              }`}
            >
              가격근접 ON만 {proximityCount}개
            </button>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-[#516277]">
              {mode === 'proximity'
                ? '59㎡/84㎡ 가격 차이가 가까운 단지만 따로 골라 표와 PDF로 내보냅니다.'
                : '표 형식으로 유지한 상태에서 바로 복사하거나 PDF로 저장할 수 있습니다.'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                data-testid="export-copy-button"
                type="button"
                onClick={handleCopy}
                className="rounded-2xl bg-[#2f6feb] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(47,111,235,0.18)] transition hover:-translate-y-0.5"
              >
                {copyState === 'copied'
                  ? 'HTML 복사 완료'
                  : copyState === 'error'
                    ? '복사 실패'
                    : 'HTML 복사'}
              </button>
              <button
                data-testid="export-preview-button"
                type="button"
                onClick={handleOpenPreview}
                className="rounded-2xl border border-[#d9e3ef] bg-white px-4 py-2.5 text-sm font-medium text-[#35506f] transition hover:bg-[#f6f9fc]"
              >
                새 창 미리보기
              </button>
              <button
                data-testid="export-pdf-button"
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="rounded-2xl border border-[#d9e3ef] bg-white px-4 py-2.5 text-sm font-medium text-[#35506f] transition hover:bg-[#f6f9fc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfLoading ? 'PDF 생성 중...' : 'PDF 저장'}
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#e5ecf4] bg-[#fbfdff] px-4 py-3 text-sm text-[#5d7088]">
            파일명: <span className="font-medium text-[#23364f]">{exportData.filename}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#e3eaf2] bg-white shadow-[0_18px_45px_rgba(54,84,63,0.08)]">
        <div className="border-b border-[#edf2ee] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#163325]">미리보기</h3>
          <p className="mt-1 text-xs text-[#708576]">실제 복사되는 HTML 표를 그대로 미리 봅니다.</p>
        </div>
        <iframe
          title={`${exportData.title} preview`}
          srcDoc={exportData.documentHtml}
          className="h-[72vh] min-h-[560px] w-full bg-white"
        />
      </section>
    </div>
  );
}
