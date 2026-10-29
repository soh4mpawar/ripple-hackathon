'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MaterialRow, FactRow } from '@/lib/server/tables-db';
import { Claim, MaterialComparisonSummary } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import { Calendar, Clock, MapPin, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';

interface ImpactMapProps {
  facts: FactRow[];
  materials: MaterialRow[];
  claims: Claim[];
  summaries: Record<string, MaterialComparisonSummary>;
  selectedMaterialId: string | null;
  onSelectMaterial: (materialId: string) => void;
}

interface EdgePath {
  id: string;
  field: string;
  materialId: string;
  isMatch: boolean;
  d: string;
  officialValue: string;
  claimValue: string;
}

export function ImpactMap({
  facts,
  materials,
  claims,
  summaries,
  selectedMaterialId,
  onSelectMaterial,
}: ImpactMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const factRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const materialRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [edges, setEdges] = useState<EdgePath[]>([]);

  // Calculate SVG edge coordinates dynamically based on rendered DOM node positions
  useEffect(() => {
    function calculateEdges() {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newEdges: EdgePath[] = [];

      for (const mat of materials) {
        const summary = summaries[mat.$id];
        if (!summary) continue;

        const matEl = materialRefs.current[mat.$id];
        if (!matEl) continue;
        const matRect = matEl.getBoundingClientRect();

        const mX = matRect.left - containerRect.left;
        const mY = matRect.top + matRect.height / 2 - containerRect.top;

        for (const comp of summary.comparisons) {
          const factEl = factRefs.current[comp.field];
          if (!factEl) continue;
          const factRect = factEl.getBoundingClientRect();

          const fX = factRect.right - containerRect.left;
          const fY = factRect.top + factRect.height / 2 - containerRect.top;

          const deltaX = Math.max(48, (mX - fX) * 0.48);
          const pathD = `M ${fX} ${fY} C ${fX + deltaX} ${fY}, ${mX - deltaX} ${mY}, ${mX} ${mY}`;

          newEdges.push({
            id: `${comp.claimId}-${comp.field}`,
            field: comp.field,
            materialId: mat.$id,
            isMatch: comp.isMatch,
            d: pathD,
            officialValue: comp.officialDisplay,
            claimValue: comp.claimRaw,
          });
        }
      }

      setEdges(newEdges);
    }

    calculateEdges();
    window.addEventListener('resize', calculateEdges);
    const timeout = setTimeout(calculateEdges, 120);
    return () => {
      window.removeEventListener('resize', calculateEdges);
      clearTimeout(timeout);
    };
  }, [facts, materials, claims, summaries]);

  const fieldIcons: Record<string, React.ReactNode> = {
    event_date: <Calendar size={13} className="text-stone-500" />,
    start_time: <Clock size={13} className="text-stone-500" />,
    venue: <MapPin size={13} className="text-stone-500" />,
    registration_deadline: <AlertCircle size={13} className="text-stone-500" />,
  };

  const fieldLabels: Record<string, string> = {
    event_date: 'Official Date',
    start_time: 'Official Start',
    venue: 'Official Venue',
    registration_deadline: 'Reg Deadline',
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white border border-stone-200 rounded-lg p-5 shadow-2xs mb-6 overflow-hidden"
    >
      {/* Header and Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-stone-100">
        <div>
          <h2 className="text-xs font-bold text-stone-900 tracking-tight uppercase">
            Impact Map · Dependency Routing
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Connections show official details repeated across announcements. Outdated connections are highlighted in red.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-current-600 inline-block" />
            <span>Matches official</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-conflict-600 inline-block" />
            <span className="font-semibold text-conflict-800">Needs update</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative z-10">
        {/* Left Column: Official Details */}
        <div className="md:col-span-4 space-y-3">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
            Official Details
          </div>
          {facts.map((fact) => (
            <div
              key={fact.field}
              ref={(el) => {
                factRefs.current[fact.field] = el;
              }}
              className="relative p-3 rounded-md border border-stone-200 bg-paper-50 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                {fieldIcons[fact.field]}
                <span className="text-[11px] font-semibold text-stone-700">
                  {fieldLabels[fact.field] || fact.field}
                </span>
              </div>
              <div className="text-xs font-semibold text-stone-900 pl-5 truncate" title={fact.displayValue}>
                {fact.displayValue}
              </div>
              {/* Connector point */}
              <div className="hidden md:block absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-stone-400 border border-white" />
            </div>
          ))}
        </div>

        {/* Middle Spacer for Clean SVG Lines */}
        <div className="hidden md:block md:col-span-3 min-h-[300px] pointer-events-none" />

        {/* Right Column: Connected Materials */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
            Connected Materials ({materials.length})
          </div>
          {materials.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-stone-200 rounded-md text-stone-500 text-xs">
              No materials added yet.
            </div>
          ) : (
            materials.map((mat) => {
              const summary = summaries[mat.$id];
              const isSelected = selectedMaterialId === mat.$id;
              const hasConflict = summary?.status === 'conflicting';

              return (
                <button
                  key={mat.$id}
                  ref={(el) => {
                    materialRefs.current[mat.$id] = el;
                  }}
                  type="button"
                  onClick={() => onSelectMaterial(mat.$id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMaterial(mat.$id);
                    }
                  }}
                  className={`w-full relative p-3 rounded-md border text-left transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/50 shadow-2xs'
                      : hasConflict
                      ? 'border-conflict-300 bg-conflict-50/30 hover:border-conflict-400'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {/* Connector point */}
                  <div
                    className={`hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white ${
                      hasConflict ? 'bg-conflict-600' : 'bg-current-600'
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {mat.kind === 'image' ? (
                        <ImageIcon size={13} className="text-stone-500 shrink-0" />
                      ) : (
                        <FileText size={13} className="text-stone-500 shrink-0" />
                      )}
                      <h3 className="text-xs font-semibold text-stone-900 truncate group-hover:text-brand-700 transition-colors">
                        {mat.title}
                      </h3>
                    </div>

                    {summary && (
                      <StatusBadge
                        status={summary.status}
                        conflictCount={summary.conflictCount}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pl-5">
                    <span>Version {mat.version}</span>
                    <span>
                      {summary?.confirmedCount || 0} reviewed claim{summary?.confirmedCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* SVG Canvas for connection lines */}
      <svg
        className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ overflow: 'visible' }}
      >
        {edges.map((edge) => {
          const isSelected = selectedMaterialId === edge.materialId;
          const hasSelected = selectedMaterialId !== null;
          const isConflicting = !edge.isMatch;

          let opacity = 0.6;
          let strokeWidth = 1.5;

          if (hasSelected) {
            if (isSelected) {
              opacity = 1;
              strokeWidth = 2.5;
            } else {
              opacity = 0.15;
              strokeWidth = 1;
            }
          }

          return (
            <path
              key={edge.id}
              d={edge.d}
              fill="none"
              stroke={isConflicting ? '#DC2626' : '#16A34A'}
              strokeWidth={strokeWidth}
              opacity={opacity}
              className="transition-opacity duration-150"
            />
          );
        })}
      </svg>
    </div>
  );
}
