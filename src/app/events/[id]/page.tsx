'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { OfficialDetailsStrip } from '@/components/OfficialDetailsStrip';
import { ImpactMap } from '@/components/ImpactMap';
import { MaterialCard } from '@/components/MaterialCard';
import { MaterialDetailPanel } from '@/components/MaterialDetailPanel';
import { AddMaterialModal } from '@/components/AddMaterialModal';
import { EditOfficialModal } from '@/components/EditOfficialModal';
import { DemoChangeModal } from '@/components/DemoChangeModal';
import { CreateEventModal } from '@/components/CreateEventModal';
import { StatusBadge } from '@/components/StatusBadge';
import {
  EventRow,
  FactRow,
  MaterialRow,
  ClaimRow,
  ChangeRow,
  ResolutionRow,
} from '@/lib/server/tables-db';
import { MaterialComparisonSummary, Claim } from '@/lib/comparison';
import { AuthUser } from '@/lib/server/appwrite';
import {
  Plus,
  LayoutGrid,
  GitBranch,
  History,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function EventWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MaterialComparisonSummary>>({});
  const [stats, setStats] = useState({
    totalMaterials: 0,
    currentCount: 0,
    conflictCount: 0,
    reviewCount: 0,
    unverifiedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Modals state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isEditOfficialOpen, setIsEditOfficialOpen] = useState(false);
  const [isDemoChangeOpen, setIsDemoChangeOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Fetch event and auth user
  async function loadData() {
    try {
      setError(null);
      const [authRes, eventRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/events/${eventId}`),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        setUser(authData.user);
      }

      if (!eventRes.ok) {
        const errData = await eventRes.json();
        throw new Error(errData.error || 'Failed to load event');
      }

      const data = await eventRes.json();
      setEvent(data.event);
      setFacts(data.facts);
      setMaterials(data.materials);
      setClaims(data.claims);
      setChanges(data.changes);
      setResolutions(data.resolutions);
      setSummaries(data.summaries);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  const selectedMaterial = materials.find((m) => m.$id === selectedMaterialId);
  const selectedSummary = selectedMaterialId ? summaries[selectedMaterialId] : undefined;

  // Format claims for comparison types
  const formattedClaims: Claim[] = claims.map((c) => ({
    id: c.$id,
    materialId: c.materialId,
    materialVersion: c.materialVersion,
    factId: c.factId,
    field: c.field,
    rawValue: c.rawValue,
    normalizedValue: c.normalizedValue,
    evidenceQuote: c.evidenceQuote,
    evidenceLocation: c.evidenceLocation,
    reviewState: c.reviewState,
    ambiguityReason: c.ambiguityReason,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 animate-pulse">
          <div className="h-10 bg-stone-200/60 rounded-xl w-1/3" />
          <div className="h-32 bg-white rounded-2xl border border-stone-200" />
          <div className="h-72 bg-white rounded-2xl border border-stone-200" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 max-w-md mx-auto p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-1">
            Unable to Load Event
          </h2>
          <p className="text-xs text-stone-600 mb-6">{error || 'Event not found or unauthorized'}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-stone-300 hover:bg-stone-50"
            >
              Go to Home
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Navbar
        user={user}
        onNewEventClick={() => setIsCreateEventOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                {event.name}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-200/80 text-stone-800">
                Rev {event.currentRevision}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Timezone: <span className="font-mono text-stone-700">{event.timezone}</span> •
              Created on {new Date(event.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddMaterialOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Plus size={15} />
              Add Event Material
            </button>
          </div>
        </div>

        {/* 4 Canonical Facts Strip */}
        <OfficialDetailsStrip
          facts={facts}
          timezone={event.timezone}
          currentRevision={event.currentRevision}
          onEditClick={() => setIsEditOfficialOpen(true)}
          onDemoChangeClick={() => setIsDemoChangeOpen(true)}
        />

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Total Materials
            </span>
            <div className="text-2xl font-black text-stone-900 mt-1">
              {stats.totalMaterials}
            </div>
            <span className="text-[11px] text-stone-400">Tracked in database</span>
          </div>

          <div className="bg-white border border-conflict-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-conflict-700 uppercase tracking-wide">
              Outdated Conflicts
            </span>
            <div className="text-2xl font-black text-conflict-600 mt-1">
              {stats.conflictCount}
            </div>
            <span className="text-[11px] text-conflict-600">Requires immediate fix</span>
          </div>

          <div className="bg-white border border-current-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-current-700 uppercase tracking-wide">
              Verified Current
            </span>
            <div className="text-2xl font-black text-current-600 mt-1">
              {stats.currentCount}
            </div>
            <span className="text-[11px] text-current-700">All claims match Rev {event.currentRevision}</span>
          </div>

          <div className="bg-white border border-review-200 rounded-2xl p-4 shadow-2xs">
            <span className="text-xs font-semibold text-review-700 uppercase tracking-wide">
              Needs Review / Unverified
            </span>
            <div className="text-2xl font-black text-review-600 mt-1">
              {stats.reviewCount + stats.unverifiedCount}
            </div>
            <span className="text-[11px] text-review-700">Unreviewed or no facts</span>
          </div>
        </div>

        {/* View Mode Toggle Strip */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('graph')}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'graph'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <GitBranch size={13} />
              Impact Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <LayoutGrid size={13} />
              Material Cards View
            </button>
          </div>

          <span className="text-xs text-stone-600 font-medium">
            Click any material card or node to inspect and apply corrections
          </span>
        </div>

        {/* Impact Map View (or List View) */}
        {viewMode === 'graph' ? (
          <ImpactMap
            facts={facts}
            materials={materials}
            claims={formattedClaims}
            summaries={summaries}
            selectedMaterialId={selectedMaterialId}
            onSelectMaterial={(id) => setSelectedMaterialId(id)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {materials.map((mat) => (
              <MaterialCard
                key={mat.$id}
                material={mat}
                summary={summaries[mat.$id]}
                claims={formattedClaims}
                isSelected={selectedMaterialId === mat.$id}
                onSelect={() => setSelectedMaterialId(mat.$id)}
              />
            ))}
          </div>
        )}

        {/* Material Cards Grid when in graph view */}
        {viewMode === 'graph' && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Event Materials Grid ({materials.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <MaterialCard
                  key={mat.$id}
                  material={mat}
                  summary={summaries[mat.$id]}
                  claims={formattedClaims}
                  isSelected={selectedMaterialId === mat.$id}
                  onSelect={() => setSelectedMaterialId(mat.$id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Official Change History Section */}
        {changes.length > 0 && (
          <div className="mt-8 bg-white border border-stone-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-brand-600" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Revision Change History (Audit Log)
              </h3>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {changes.map((change) => (
                <div key={change.$id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-800 uppercase text-[11px]">
                      {change.field.replace('_', ' ')}:
                    </span>
                    <span className="line-through text-stone-400 font-mono">
                      {change.oldDisplayValue || 'Initial'}
                    </span>
                    <ArrowRight size={12} className="text-stone-400" />
                    <span className="font-bold text-stone-900 font-mono">
                      {change.newDisplayValue}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-400 font-mono text-[11px]">
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full text-stone-700">
                      Rev {change.revision}
                    </span>
                    <span>{new Date(change.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail Inspector Drawer / Panel */}
      {selectedMaterial && (
        <MaterialDetailPanel
          material={selectedMaterial}
          summary={selectedSummary}
          claims={formattedClaims}
          facts={facts}
          currentEventRevision={event.currentRevision}
          changes={changes}
          resolutions={resolutions}
          onClose={() => setSelectedMaterialId(null)}
          onRefresh={loadData}
        />
      )}

      {/* Modals */}
      {isAddMaterialOpen && (
        <AddMaterialModal
          eventId={eventId}
          onClose={() => setIsAddMaterialOpen(false)}
          onSuccess={() => {
            setIsAddMaterialOpen(false);
            loadData();
          }}
        />
      )}

      {isEditOfficialOpen && (
        <EditOfficialModal
          eventId={eventId}
          currentRevision={event.currentRevision}
          facts={facts}
          onClose={() => setIsEditOfficialOpen(false)}
          onSuccess={() => {
            setIsEditOfficialOpen(false);
            loadData();
          }}
        />
      )}

      {isDemoChangeOpen && (
        <DemoChangeModal
          eventId={eventId}
          currentRevision={event.currentRevision}
          facts={facts}
          onClose={() => setIsDemoChangeOpen(false)}
          onSuccess={() => {
            setIsDemoChangeOpen(false);
            loadData();
          }}
        />
      )}

      {isCreateEventOpen && (
        <CreateEventModal
          onClose={() => setIsCreateEventOpen(false)}
          onSuccess={(newEventId) => {
            setIsCreateEventOpen(false);
            router.push(`/events/${newEventId}`);
          }}
        />
      )}
    </div>
  );
}
