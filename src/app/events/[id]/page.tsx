'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { OfficialDetailsStrip } from '@/components/OfficialDetailsStrip';
import { ImpactMap } from '@/components/ImpactMap';
import { MaterialCard } from '@/components/MaterialCard';
import { MaterialDetailPanel } from '@/components/MaterialDetailPanel';
import { AddMaterialModal } from '@/components/AddMaterialModal';
import { EditOfficialModal } from '@/components/EditOfficialModal';
import { DemoChangeModal } from '@/components/DemoChangeModal';
import { CreateEventModal } from '@/components/CreateEventModal';
import {
  EventRow,
  FactRow,
  MaterialRow,
  ClaimRow,
  ChangeRow,
  ResolutionRow,
} from '@/lib/server/tables-db';
import { AuthUser } from '@/lib/server/appwrite';
import {
  Claim,
  MaterialComparisonSummary,
} from '@/lib/comparison';
import {
  Plus,
  Network,
  List,
  History,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function EventWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Server state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
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

  // View state: 'graph' (Impact Map) vs 'list' (Material List)
  const [hasExplicitViewMode, setHasExplicitViewMode] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [listFilter, setListFilter] = useState<'all' | 'conflicting' | 'review' | 'current'>('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Modals state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isEditOfficialOpen, setIsEditOfficialOpen] = useState(false);
  const [isDemoChangeOpen, setIsDemoChangeOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  // Ensure mobile viewports default to list mode, while respecting explicit user toggle
  useEffect(() => {
    function checkViewport() {
      if (!hasExplicitViewMode && typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          setViewMode('list');
        }
      }
    }
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [hasExplicitViewMode]);

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
      setVersions(data.versions || []);
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

  function handleMaterialUpdated(updatedMaterial: MaterialRow) {
    setMaterials((prev) =>
      prev.map((m) => (m.$id === updatedMaterial.$id ? { ...m, ...updatedMaterial } : m))
    );
  }

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
    reviewState: c.reviewState as any,
    ambiguityReason: c.ambiguityReason,
  }));

  // Filtered materials for list view
  const filteredMaterials = materials.filter((m) => {
    const summary = summaries[m.$id];
    if (listFilter === 'conflicting') return summary?.status === 'conflicting';
    if (listFilter === 'review') return summary?.status === 'needs_review' || summary?.status === 'unverified';
    if (listFilter === 'current') return summary?.status === 'current';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-stone-600 font-mono">Loading event workspace...</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-paper-50 flex flex-col">
        <Navbar user={user} />
        <div className="flex-1 max-w-md mx-auto p-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
            <ShieldAlert size={20} />
          </div>
          <h2 className="text-sm font-bold text-stone-900 mb-1">
            Unable to Load Event
          </h2>
          <p className="text-xs text-stone-600 mb-5">{error || 'Event not found or unauthorized'}</p>
          <div className="flex gap-2.5">
            <button
              onClick={() => router.push('/')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-white border border-stone-300 hover:bg-stone-50"
            >
              Go to Home
            </button>
            <button
              onClick={loadData}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const needReviewCount = stats.reviewCount + stats.unverifiedCount;

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col text-stone-900">
      <Navbar
        user={user}
        onNewEventClick={() => setIsCreateEventOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace Header */}
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4 pb-4 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                {event.name}
              </h1>
              <span className="text-[11px] font-mono text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded font-medium">
                Revision {event.currentRevision}
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Timezone: <span className="font-mono text-stone-800 font-medium">{event.timezone}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAddMaterialOpen(true)}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-2xs transition-colors min-h-[38px]"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Event Material
            </button>
          </div>
        </div>

        {/* Official Details Information Strip */}
        <OfficialDetailsStrip
          facts={facts}
          timezone={event.timezone}
          currentRevision={event.currentRevision}
          onEditClick={() => setIsEditOfficialOpen(true)}
          onDemoChangeClick={() => setIsDemoChangeOpen(true)}
        />

        {/* Compact Status Summary Strip */}
        <div className="bg-white border border-stone-200 rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-stone-900">
              {stats.totalMaterials} material{stats.totalMaterials !== 1 ? 's' : ''}
            </span>
            <span className="text-stone-300">•</span>

            {/* Outdated materials */}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-conflict-600" />
              <span className="text-conflict-800 font-semibold">
                <span className="text-conflict-600 text-2xl font-bold mr-1">{stats.conflictCount}</span>
                {stats.conflictCount === 1 ? 'needs update' : 'need updates'}
              </span>
            </span>

            <span className="text-stone-300">•</span>

            {/* Needs review */}
            <span className="inline-flex items-center gap-1.5 text-stone-700">
              <span className="w-2 h-2 rounded-full bg-review-500" />
              <span>
                <strong className="font-semibold text-stone-900">{needReviewCount}</strong>{' '}
                {needReviewCount === 1 ? 'needs review' : 'need review'}
              </span>
            </span>

            <span className="text-stone-300">•</span>

            {/* Matches official details (grammatically correct singular/plural) */}
            <span className="inline-flex items-center gap-1.5 text-stone-700">
              <span className="w-2 h-2 rounded-full bg-current-600" />
              <span>
                <strong className="font-semibold text-stone-900">{stats.currentCount}</strong>{' '}
                {stats.currentCount === 1 ? 'matches official details' : 'match official details'}
              </span>
            </span>
          </div>

          {/* View Mode Toggle: Impact Map vs Material List */}
          <div className="flex items-center gap-1 bg-paper-100 p-0.5 rounded-md border border-stone-200 text-xs shrink-0">
            <button
              onClick={() => {
                setViewMode('graph');
                setHasExplicitViewMode(true);
              }}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded transition-colors min-h-[32px] ${
                viewMode === 'graph'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Network size={13} />
              <span>Impact Map</span>
            </button>

            <button
              onClick={() => {
                setViewMode('list');
                setHasExplicitViewMode(true);
              }}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded transition-colors min-h-[32px] ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List size={13} />
              <span>Material List</span>
            </button>
          </div>
        </div>

        {/* Working Area: Impact Map Mode OR Material List Mode */}
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
          <div className="space-y-3 mb-8">
            {/* Filter bar for Material List */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200">
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <button
                  onClick={() => setListFilter('all')}
                  type="button"
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors min-h-[32px] ${
                    listFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  All ({materials.length})
                </button>
                <button
                  onClick={() => setListFilter('conflicting')}
                  type="button"
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors min-h-[32px] ${
                    listFilter === 'conflicting'
                      ? 'bg-conflict-600 text-white'
                      : 'text-conflict-800 hover:bg-conflict-50'
                  }`}
                >
                  Outdated ({stats.conflictCount})
                </button>
                <button
                  onClick={() => setListFilter('review')}
                  type="button"
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors min-h-[32px] ${
                    listFilter === 'review'
                      ? 'bg-review-600 text-white'
                      : 'text-review-800 hover:bg-review-50'
                  }`}
                >
                  Needs Review ({needReviewCount})
                </button>
                <button
                  onClick={() => setListFilter('current')}
                  type="button"
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors min-h-[32px] ${
                    listFilter === 'current'
                      ? 'bg-current-600 text-white'
                      : 'text-current-800 hover:bg-current-50'
                  }`}
                >
                  Matches Official ({stats.currentCount})
                </button>
              </div>

              <span className="text-[11px] text-stone-600 font-medium">
                Showing {filteredMaterials.length} of {materials.length} materials
              </span>
            </div>

            {/* List Rows */}
            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center bg-white border border-dashed border-stone-200 rounded-lg text-xs text-stone-600">
                No materials match the selected filter.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map((mat) => (
                  <MaterialCard
                    key={mat.$id}
                    material={mat}
                    summary={summaries[mat.$id]}
                    claims={formattedClaims.filter((c) => c.materialId === mat.$id)}
                    isSelected={selectedMaterialId === mat.$id}
                    onSelect={() => setSelectedMaterialId(mat.$id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Change History Audit Log (Cleanly stacked for mobile and desktop) */}
        {changes.length > 0 && (
          <div className="mt-8 bg-white border border-stone-200 rounded-lg p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
              <History size={15} className="text-stone-600" />
              <h3 className="text-xs font-bold text-stone-900 tracking-tight uppercase">
                Official Detail Change History
              </h3>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {changes.map((change) => (
                <div
                  key={change.$id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide">
                      {change.field.replace('_', ' ')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="line-through text-stone-500 font-sans text-xs">
                        {change.oldDisplayValue || 'Initial'}
                      </span>
                      <ArrowRight size={11} className="text-stone-400 shrink-0" />
                      <span className="font-bold text-stone-900 font-sans text-xs">
                        {change.newDisplayValue}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-stone-600 font-mono text-[11px] shrink-0 pt-1 sm:pt-0">
                    <span className="bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-stone-800 font-medium">
                      Revision {change.revision}
                    </span>
                    <span>{new Date(change.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer credit */}
      <footer className="mt-auto py-6 border-t border-stone-200 text-center text-[11px] text-stone-500">
        Ripple · Built with Appwrite TablesDB for the Appwrite Databases Hackathon
      </footer>

      {/* Detail Inspector Drawer / Panel */}
      {selectedMaterial && (
        <MaterialDetailPanel
          key={`${selectedMaterial.$id}-v${selectedMaterial.version}`}
          material={selectedMaterial}
          summary={selectedSummary}
          claims={formattedClaims}
          facts={facts}
          currentEventRevision={event.currentRevision}
          changes={changes}
          resolutions={resolutions}
          versions={versions}
          onClose={() => setSelectedMaterialId(null)}
          onRefresh={loadData}
          onMaterialUpdated={handleMaterialUpdated}
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
          onSuccess={(id) => router.push(`/events/${id}`)}
        />
      )}
    </div>
  );
}
