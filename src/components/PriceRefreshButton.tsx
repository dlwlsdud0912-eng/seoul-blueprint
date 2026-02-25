'use client';

import { useState, useEffect } from 'react';
import { Apartment, PriceMap } from '@/types';

interface PriceRefreshButtonProps {
  apartments: Apartment[];
  onPriceUpdate: (prices: PriceMap) => void;
}

export default function PriceRefreshButton({
  apartments,
  onPriceUpdate,
}: PriceRefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  // 결과 요약 3초 후 자동 리셋
  useEffect(() => {
    if (!resultSummary) return;
    const timer = setTimeout(() => {
      setResultSummary(null);
      setError(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [resultSummary]);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResultSummary(null);

    const total = apartments.length;
    setProgress({ done: 0, total });

    // 10개씩 배치로 나눠서 요청 (한 번에 너무 많으면 타임아웃)
    const BATCH_SIZE = 10;
    const allPrices: PriceMap = {};
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < apartments.length; i += BATCH_SIZE) {
      const batch = apartments.slice(i, i + BATCH_SIZE);
      const payload = batch.map((apt) => ({
        id: apt.id,
        name: apt.name,
        size: apt.size,
        naverComplexId: apt.naverComplexId,
      }));

      try {
        const res = await fetch('/api/naver-price/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apartments: payload }),
        });

        if (res.ok) {
          const data = await res.json();
          for (const result of data.results) {
            if (result.price !== null) {
              allPrices[result.id] = {
                price: result.price,
                articleCount: result.articleCount,
                areaName: result.areaName,
              };
              successCount++;
            } else {
              failCount++;
            }
          }
        } else {
          failCount += batch.length;
        }
      } catch {
        // 배치 실패해도 다음 배치 계속 진행
        failCount += batch.length;
      }

      setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
    }

    onPriceUpdate(allPrices);
    setLoading(false);

    // 결과 요약 표시
    if (failCount > 0) {
      setError(`${failCount}건 실패`);
      setResultSummary(`${successCount}/${total} 성공`);
    } else {
      setResultSummary(`${successCount}건 완료`);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        loading
          ? 'text-[#b4b4b0] bg-[#f1f1ef] cursor-not-allowed'
          : error
            ? 'text-[#eb5757] hover:bg-[#eb5757]/10 cursor-pointer'
            : resultSummary
              ? 'text-[#0f7b6c] hover:bg-[#0f7b6c]/10 cursor-pointer'
              : 'text-[#2383e2] hover:bg-[#2383e2]/10 cursor-pointer'
      }`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            {progress.done}/{progress.total}
          </span>
        </>
      ) : resultSummary ? (
        <>
          {error ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{resultSummary}</span>
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>수동 갱신</span>
        </>
      )}
    </button>
  );
}
