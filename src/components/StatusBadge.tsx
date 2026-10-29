import React from 'react';
import { MaterialStatus } from '@/lib/comparison';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: MaterialStatus;
  conflictCount?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, conflictCount = 0, label, size = 'md' }: StatusBadgeProps) {
  const isSmall = size === 'sm';
  const sizeClasses = isSmall ? 'text-xs px-2 py-0.5' : 'text-xs font-medium px-2.5 py-1';
  const iconSize = isSmall ? 12 : 14;

  switch (status) {
    case 'conflicting':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-conflict-500/30 bg-conflict-50 text-conflict-700 ${sizeClasses}`}
        >
          <AlertCircle size={iconSize} className="text-conflict-600 shrink-0" />
          <span>{label || `${conflictCount} Outdated Fact${conflictCount > 1 ? 's' : ''}`}</span>
        </span>
      );

    case 'needs_review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-review-500/30 bg-review-50 text-review-700 ${sizeClasses}`}
        >
          <AlertTriangle size={iconSize} className="text-review-600 shrink-0" />
          <span>{label || 'Needs Review'}</span>
        </span>
      );

    case 'current':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-current-500/30 bg-current-50 text-current-700 ${sizeClasses}`}
        >
          <CheckCircle2 size={iconSize} className="text-current-600 shrink-0" />
          <span>{label || 'Verified Current'}</span>
        </span>
      );

    case 'unverified':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-100 text-stone-700 ${sizeClasses}`}
        >
          <HelpCircle size={iconSize} className="text-stone-500 shrink-0" />
          <span>{label || 'No Confirmed Facts'}</span>
        </span>
      );
  }
}
