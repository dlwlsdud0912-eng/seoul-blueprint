import { Apartment } from '@/types';

interface StatsBarProps {
  apartments: Apartment[];
}

export default function StatsBar({ apartments }: StatsBarProps) {
  const districts = new Set(apartments.map((a) => a.district));
  const prices = apartments
    .map((a) => a.currentPrice)
    .filter((price): price is number => typeof price === 'number');
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return (
    <div className="flex items-center gap-3 text-xs text-[#787774]">
      <span>총 <strong className="text-[#37352f] font-medium">{apartments.length}</strong>개 단지</span>
      <span>·</span>
      <span><strong className="text-[#37352f] font-medium">{districts.size}</strong>개 구</span>
      <span>·</span>
      <span>최저 <strong className="text-[#2383e2] font-medium">{minPrice}억</strong></span>
      <span>·</span>
      <span>최고 <strong className="text-[#eb5757] font-medium">{maxPrice}억</strong></span>
    </div>
  );
}
