'use client';

import React from 'react';
import { MaterialRow } from '@/lib/server/tables-db';
import { MaterialComparisonSummary, Claim } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import { FileText, Image as ImageIcon, ChevronRight } from 'lucide-react';

interface MaterialCardProps {
  material: MaterialRow;
  summary?: MaterialComparisonSummary;
  claims: Claim[];
  isSelected: boolean;
  onSelect: () => void;
}

export function MaterialCard({
  material,
  summary,
  isSelected,
  onSelect,
}: MaterialCardProps) {
  const status = summary?.status || 'unverified';
  const hasConflict = status === 'conflicting';

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      className={`group w-full p-4 bg-white border rounded-lg text-left transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
        isSelected
          ? 'border-brand-600 bg-brand-50/30 shadow-2xs'
          : hasConflict
          ? 'border-conflict-200 hover:border-conflict-300'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Left: Type, Title, Version */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-md bg-paper-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0 mt-0.5 sm:mt-0">
          {material.kind === 'image' ? (
            <ImageIcon size={15} className="text-stone-600" />
          ) : (
            <FileText size={15} className="text-stone-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 break-words group-hover:text-brand-700 transition-colors leading-snug">
              {material.title}
            </h3>
            <span className="text-[10px] font-mono font-medium text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded shrink-0">
              v{material.version}
            </span>
          </div>

          {material.sourceText && (
            <p className="text-xs text-stone-600 font-sans line-clamp-2 mt-1 leading-relaxed">
              {material.sourceText.replace(/\s+/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status badge & Inspect action */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
        {summary && (
          <StatusBadge
            status={summary.status}
            conflictCount={summary.conflictCount}
            size="sm"
          />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 group-hover:text-brand-700 transition-colors px-2.5 py-1.5 rounded hover:bg-stone-100 min-h-[36px]"
        >
          <span>Inspect</span>
          <ChevronRight size={13} className="text-stone-400 group-hover:text-brand-600" />
        </button>
      </div>
    </div>
  );
}
