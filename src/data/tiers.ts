import { Tier } from '@/types';

export const TIERS: Tier[] = [
  { key: '12', label: '가용 6억+대출6', maxPrice: '12억 이하', cashNeeded: '6억', loanAmount: '6억' },
  { key: '14', label: '가용 8억+대출6', maxPrice: '14억 이하', cashNeeded: '8억', loanAmount: '6억' },
  { key: '16', label: '가용 12억+대출4', maxPrice: '16억 이하', cashNeeded: '12억', loanAmount: '4억' },
  { key: '20', label: '가용 16억+대출4', maxPrice: '20억 이하', cashNeeded: '16억', loanAmount: '4억' },
  { key: '24', label: '가용 20억+대출4', maxPrice: '24억 이하', cashNeeded: '20억', loanAmount: '4억' },
  { key: '28', label: '가용 26억+대출2', maxPrice: '28억 이하', cashNeeded: '26억', loanAmount: '2억' },
  { key: '32', label: '가용 30억+대출2', maxPrice: '32억 이하', cashNeeded: '30억', loanAmount: '2억' },
  { key: '50', label: '프리미엄', maxPrice: '32억 초과', cashNeeded: '50억+', loanAmount: '-' },
];
