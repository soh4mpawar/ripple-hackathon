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
      className={`group w-full p-3.5 bg-white border rounded-md text-left transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
        isSelected
          ? 'border-brand-600 bg-brand-50/30 shadow-2xs'
          : hasConflict
          ? 'border-conflict-200 hover:border-conflict-300'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Left: Type, Title, Version */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-md bg-paper-100 border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
          {material.kind === 'image' ? (
            <ImageIcon size={14} className="text-stone-600" />
          ) : (
            <FileText size={14} className="text-stone-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-stone-900 truncate group-hover:text-brand-700 transition-colors">
              {material.title}
            </h3>
            <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded shrink-0">
              v{material.version}
            </span>
          </div>

          {material.sourceText && (
            <p className="text-[11px] text-stone-500 font-mono truncate max-w-xl mt-0.5">
              {material.sourceText.replace(/\n+/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status badge & Inspect action */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
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
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 group-hover:text-brand-700 transition-colors px-2 py-1 rounded hover:bg-stone-100"
        >
          <span>Inspect</span>
          <ChevronRight size={12} className="text-stone-400 group-hover:text-brand-600" />
        </button>
      </div>
    </div>
  );
}
