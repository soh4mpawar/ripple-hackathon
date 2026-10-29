'use client';

import React from 'react';
import { MaterialRow } from '@/lib/server/tables-db';
import { MaterialComparisonSummary, Claim } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import { FileText, Image as ImageIcon, ChevronRight, AlertCircle, Check } from 'lucide-react';

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
  claims,
  isSelected,
  onSelect,
}: MaterialCardProps) {
  const currentClaims = claims.filter(
    (c) => c.materialId === material.$id && c.materialVersion === material.version
  );

  const status = summary?.status || 'unverified';
  const hasConflict = status === 'conflicting';

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl p-5 border text-left transition-all cursor-pointer ${
        isSelected
          ? 'bg-white border-brand-600 shadow-md ring-2 ring-brand-500/20'
          : hasConflict
          ? 'bg-white border-conflict-300 hover:border-conflict-500 shadow-xs hover:shadow-sm'
          : 'bg-white border-stone-200/90 hover:border-stone-300 hover:shadow-sm'
      }`}
    >
      {/* Top row: Title, Type icon, Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              material.kind === 'image'
                ? 'bg-brand-50 border-brand-200 text-brand-700'
                : 'bg-warm-100 border-stone-200 text-stone-700'
            }`}
          >
            {material.kind === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-900 truncate group-hover:text-brand-700 transition-colors">
              {material.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="capitalize">{material.kind}</span>
              <span>•</span>
              <span>Version {material.version}</span>
            </div>
          </div>
        </div>

        <StatusBadge
          status={status}
          conflictCount={summary?.conflictCount || 0}
          size="sm"
        />
      </div>

      {/* Snippet / preview */}
      {material.sourceText && (
        <p className="text-xs text-stone-600 line-clamp-2 mb-3 bg-stone-50/70 p-2.5 rounded-lg border border-stone-100 font-mono">
          {material.sourceText}
        </p>
      )}

      {/* Confirmed Claims overview */}
      <div className="space-y-1.5 pt-2 border-t border-stone-100 mb-3">
        {summary && summary.comparisons.length > 0 ? (
          summary.comparisons.slice(0, 3).map((comp) => (
            <div
              key={comp.claimId}
              className={`text-xs flex items-center justify-between gap-2 px-2 py-1 rounded-md ${
                comp.isMatch
                  ? 'bg-current-50/50 text-current-800'
                  : 'bg-conflict-50 text-conflict-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {comp.isMatch ? (
                  <Check size={12} className="text-current-600 shrink-0" />
                ) : (
                  <AlertCircle size={12} className="text-conflict-600 shrink-0" />
                )}
                <span className="capitalize truncate">
                  {comp.field.replace('_', ' ')}: {comp.claimRaw}
                </span>
              </div>
              {!comp.isMatch && (
                <span className="text-[10px] text-conflict-600 shrink-0 font-semibold">
                  ≠ Official
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-stone-600 italic px-2 py-1">
            {currentClaims.length === 0
              ? 'No facts extracted yet'
              : `${currentClaims.length} claim(s) awaiting review`}
          </div>
        )}
      </div>

      {/* Footer: Revision tag & CTA */}
      <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
        <span>Checked against Rev {summary?.lastCheckedRevision ?? 1}</span>
        <span className="inline-flex items-center gap-1 text-brand-600 font-semibold group-hover:translate-x-0.5 transition-transform">
          Inspect
          <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
}
