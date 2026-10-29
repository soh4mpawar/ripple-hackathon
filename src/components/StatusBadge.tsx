import React from 'react';
import { MaterialStatus } from '@/lib/comparison';
import { Check, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: MaterialStatus;
  conflictCount?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, conflictCount = 0, label, size = 'md' }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  const sizeClasses = isSmall
    ? 'text-[11px] font-medium px-2 py-0.5 rounded-md'
    : 'text-xs font-medium px-2.5 py-1 rounded-md';
  const iconSize = isSmall ? 11 : 13;

  switch (status) {
    case 'conflicting':
      return (
        <span
          className={`inline-flex items-center gap-1.5 border border-conflict-200 bg-conflict-50 text-conflict-800 shrink-0 ${sizeClasses}`}
        >
          <AlertCircle size={iconSize} className="text-conflict-700 shrink-0" />
          <span className="font-semibold">
            {label || (conflictCount > 0 ? `${conflictCount} Outdated` : 'Outdated')}
          </span>
        </span>
      );

    case 'needs_review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 border border-review-200 bg-review-50 text-review-800 shrink-0 ${sizeClasses}`}
        >
          <AlertTriangle size={iconSize} className="text-review-700 shrink-0" />
          <span>{label || 'Needs Review'}</span>
        </span>
      );

    case 'current':
      return (
        <span
          className={`inline-flex items-center gap-1.5 border border-current-200 bg-current-50 text-current-800 shrink-0 ${sizeClasses}`}
        >
          <Check size={iconSize} className="text-current-700 shrink-0" strokeWidth={2.5} />
          <span>{label || (isSmall ? 'Matches official' : 'Reviewed · Matches official details')}</span>
        </span>
      );

    case 'unverified':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 border border-stone-200 bg-stone-100 text-stone-700 shrink-0 ${sizeClasses}`}
        >
          <HelpCircle size={iconSize} className="text-stone-500 shrink-0" />
          <span>{label || 'Unreviewed'}</span>
        </span>
      );
  }
}
