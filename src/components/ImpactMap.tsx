'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MaterialRow, FactRow } from '@/lib/server/tables-db';
import { Claim, MaterialComparisonSummary } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import { Calendar, Clock, MapPin, AlertCircle, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';

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
  const materialRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edges, setEdges] = useState<EdgePath[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

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

        // Calculate material left connector coordinate relative to container
        const mX = matRect.left - containerRect.left;
        const mY = matRect.top + matRect.height / 2 - containerRect.top;

        for (const comp of summary.comparisons) {
          const factEl = factRefs.current[comp.field];
          if (!factEl) continue;
          const factRect = factEl.getBoundingClientRect();

          // Calculate fact right connector coordinate relative to container
          const fX = factRect.right - containerRect.left;
          const fY = factRect.top + factRect.height / 2 - containerRect.top;

          // Bezier curve control points
          const deltaX = Math.max(40, (mX - fX) * 0.5);
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
    const timeout = setTimeout(calculateEdges, 100);
    return () => {
      window.removeEventListener('resize', calculateEdges);
      clearTimeout(timeout);
    };
  }, [facts, materials, claims, summaries]);

  const fieldIcons: Record<string, React.ReactNode> = {
    event_date: <Calendar size={15} className="text-brand-600" />,
    start_time: <Clock size={15} className="text-brand-600" />,
    venue: <MapPin size={15} className="text-brand-600" />,
    registration_deadline: <AlertCircle size={15} className="text-brand-600" />,
  };

  const fieldLabels: Record<string, string> = {
    event_date: 'Event Date',
    start_time: 'Start Time',
    venue: 'Venue',
    registration_deadline: 'Reg Deadline',
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-white border border-stone-200/80 rounded-2xl p-6 shadow-sm mb-8 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
        <div>
          <h2 className="text-sm font-bold text-stone-900 tracking-wide uppercase">
            Official Facts vs. Event Materials Impact Map
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Lines show confirmed facts repeated across materials. Red lines indicate outdated claims requiring fixes.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded-full bg-current-500 inline-block" />
            <span className="text-stone-600">Verified Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded-full bg-conflict-500 inline-block" />
            <span className="text-stone-600 font-semibold">Outdated / Conflict</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Column: Official Facts */}
        <div className="md:col-span-4 space-y-4">
          <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
            Canonical Facts
          </div>
          {facts.map((fact) => (
            <div
              key={fact.field}
              ref={(el) => {
                factRefs.current[fact.field] = el;
              }}
              className="relative p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors shadow-2xs group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-md bg-white border border-stone-200">
                  {fieldIcons[fact.field] || <Sparkles size={14} />}
                </span>
                <span className="text-xs font-semibold text-stone-700">
                  {fieldLabels[fact.field] || fact.field}
                </span>
              </div>
              <div className="text-sm font-semibold text-stone-900 pl-7 truncate" title={fact.displayValue}>
                {fact.displayValue}
              </div>
              {/* Connector dot */}
              <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow-xs" />
            </div>
          ))}
        </div>

        {/* Middle Spacer for SVG */}
        <div className="hidden md:block md:col-span-3 min-h-[320px] pointer-events-none" />

        {/* Right Column: Materials */}
        <div className="md:col-span-5 space-y-3">
          <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
            Tracked Event Materials ({materials.length})
          </div>
          {materials.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-stone-200 rounded-xl text-stone-600 text-xs">
              No materials added yet. Paste announcement text or upload a poster to inspect conflicts.
            </div>
          ) : (
            materials.map((mat) => {
              const summary = summaries[mat.$id];
              const isSelected = selectedMaterialId === mat.$id;
              const hasConflict = summary?.status === 'conflicting';

              return (
                <div
                  key={mat.$id}
                  ref={(el) => {
                    materialRefs.current[mat.$id] = el;
                  }}
                  onClick={() => onSelectMaterial(mat.$id)}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/40 shadow-sm ring-1 ring-brand-500'
                      : hasConflict
                      ? 'border-conflict-300 bg-conflict-50/20 hover:border-conflict-400'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {/* Connector dot */}
                  <div
                    className={`hidden md:block absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                      hasConflict ? 'bg-conflict-600' : 'bg-current-600'
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {mat.kind === 'image' ? (
                        <ImageIcon size={15} className="text-brand-600 shrink-0" />
                      ) : (
                        <FileText size={15} className="text-stone-500 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-stone-900 truncate">
                        {mat.title}
                      </span>
                    </div>

                    {summary && (
                      <StatusBadge
                        status={summary.status}
                        conflictCount={summary.conflictCount}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 pl-6">
                    <span>Version {mat.version}</span>
                    <span>
                      {summary?.confirmedCount || 0} confirmed facts
                    </span>
                  </div>
                </div>
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
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#E11D48" floodOpacity="0.4" />
          </filter>
        </defs>
        {edges.map((edge) => {
          const isSelected = selectedMaterialId === edge.materialId;
          const isConflicting = !edge.isMatch;

          return (
            <path
              key={edge.id}
              d={edge.d}
              fill="none"
              stroke={isConflicting ? '#E11D48' : '#10B981'}
              strokeWidth={isConflicting ? (isSelected ? 3.5 : 2.5) : (isSelected ? 2.5 : 1.5)}
              strokeDasharray={isConflicting ? '6,4' : undefined}
              filter={isConflicting ? 'url(#glow)' : undefined}
              opacity={isSelected ? 1 : 0.75}
              className="transition-all duration-200"
            />
          );
        })}
      </svg>
    </div>
  );
}
