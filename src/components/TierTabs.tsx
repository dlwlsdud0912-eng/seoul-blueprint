'use client';
import { TierKey } from '@/types';
import { TIERS } from '@/data/tiers';

interface TierTabsProps {
  activeTier: TierKey;
  onTierChange: (tier: TierKey) => void;
}

export default function TierTabs({ activeTier, onTierChange }: TierTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max gap-1">
        {TIERS.map((tier) => (
          <button
            key={tier.key}
            onClick={() => onTierChange(tier.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
              activeTier === tier.key
                ? 'bg-[#2383e2]/10 text-[#2383e2] font-medium'
                : 'text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]'
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>
    </div>
  );
}
