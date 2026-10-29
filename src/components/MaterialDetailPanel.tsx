'use client';

import React, { useState } from 'react';
import { MaterialRow, FactRow, ChangeRow, ResolutionRow } from '@/lib/server/tables-db';
import { Claim, MaterialComparisonSummary, OfficialField } from '@/lib/comparison';
import { generateCorrections } from '@/lib/corrections';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Check,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  History,
  Send,
  AlertCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MaterialDetailPanelProps {
  material: MaterialRow;
  summary?: MaterialComparisonSummary;
  claims: Claim[];
  facts: FactRow[];
  currentEventRevision: number;
  changes: ChangeRow[];
  resolutions: ResolutionRow[];
  versions?: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export function MaterialDetailPanel({
  material,
  summary,
  claims,
  facts,
  currentEventRevision,
  changes,
  resolutions,
  versions,
  onClose,
  onRefresh,
}: MaterialDetailPanelProps) {
  // Filter claims belonging to this material and current version
  const currentClaims = claims.filter(
    (c) => c.materialId === material.$id && c.materialVersion === material.version
  );

  // Handle escape key to close panel for accessibility
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [activeTab, setActiveTab] = useState<'claims' | 'corrections' | 'external' | 'history'>('claims');

  // Manual claim state
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [newClaimField, setNewClaimField] = useState<OfficialField>('venue');
  const [newClaimValue, setNewClaimValue] = useState('');
  const [newClaimQuote, setNewClaimQuote] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Correction state
  const generatedCorrections = summary
    ? generateCorrections(
        material.$id,
        material.version,
        material.sourceText || null,
        summary.comparisons,
        facts.map((f) => ({
          id: f.$id,
          field: f.field,
          displayValue: f.displayValue,
          normalizedValue: f.normalizedValue,
          revision: f.revision,
        })),
        currentEventRevision
      )
    : [];

  const [editableCorrection, setEditableCorrection] = useState<string>(
    generatedCorrections[0]?.suggestedFullText || material.sourceText || ''
  );
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync editableCorrection whenever generated suggestions or material changes
  React.useEffect(() => {
    if (generatedCorrections.length > 0 && generatedCorrections[0]?.suggestedFullText) {
      setEditableCorrection(generatedCorrections[0].suggestedFullText);
    } else {
      setEditableCorrection(material.sourceText || '');
    }
  }, [material.$id, material.version, summary?.conflictCount]);

  // Edit claim state
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editClaimField, setEditClaimField] = useState<OfficialField>('venue');
  const [editClaimValue, setEditClaimValue] = useState('');
  const [editClaimQuote, setEditClaimQuote] = useState('');
  const [isUpdatingClaim, setIsUpdatingClaim] = useState(false);

  // Expanded version inspection state
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  function startEditClaim(claim: Claim) {
    setEditingClaimId(claim.id);
    setEditClaimField(claim.field);
    setEditClaimValue(claim.rawValue);
    setEditClaimQuote(claim.evidenceQuote);
  }

  async function handleSaveEditedClaim(claimId: string) {
    setIsUpdatingClaim(true);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: editClaimField,
          rawValue: editClaimValue.trim(),
          evidenceQuote: editClaimQuote.trim(),
        }),
      });
      if (res.ok) {
        setEditingClaimId(null);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update claim');
      }
    } catch (err) {
      console.error('Error updating claim:', err);
    } finally {
      setIsUpdatingClaim(false);
    }
  }

  // External update acknowledgment state
  const [externalAction, setExternalAction] = useState('Posted update on Discord channel');
  const [externalNote, setExternalNote] = useState('');
  const [isRecordingExternal, setIsRecordingExternal] = useState(false);
  const [externalSuccess, setExternalSuccess] = useState(false);

  // Update claim review state
  async function handleClaimAction(
    claimId: string,
    action: 'confirmed' | 'rejected' | 'needs_clarification'
  ) {
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewState: action }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating claim:', err);
    }
  }

  // Explicit confirmation for all proposed claims
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  async function handleConfirmAllProposed() {
    const proposed = currentClaims.filter((c) => c.reviewState === 'proposed');
    if (proposed.length === 0) return;
    setIsConfirmingAll(true);
    try {
      for (const c of proposed) {
        await fetch(`/api/claims/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewState: 'confirmed' }),
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Error confirming proposed claims:', err);
    } finally {
      setIsConfirmingAll(false);
    }
  }

  // Delete claim
  async function handleDeleteClaim(claimId: string) {
    if (!confirm('Are you sure you want to delete this claim?')) return;
    try {
      const res = await fetch(`/api/claims/${claimId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Error deleting claim:', err);
    }
  }

  // Add manual claim
  async function handleAddManualClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!newClaimValue.trim() || !newClaimQuote.trim()) return;

    setIsSubmittingClaim(true);
    try {
      const res = await fetch(`/api/materials/${material.$id}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: newClaimField,
          rawValue: newClaimValue.trim(),
          evidenceQuote: newClaimQuote.trim(),
          reviewState: 'confirmed',
        }),
      });
      if (res.ok) {
        setNewClaimValue('');
        setNewClaimQuote('');
        setShowAddClaim(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Error adding claim:', err);
    } finally {
      setIsSubmittingClaim(false);
    }
  }

  // Apply suggested correction (creates version N+1)
  async function handleApplyCorrection() {
    setIsApplyingCorrection(true);
    try {
      const res = await fetch(`/api/materials/${material.$id}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedText: editableCorrection,
          eventRevision: currentEventRevision,
          expectedMaterialVersion: material.version,
          note: `Applied correction to align with official details at Revision ${currentEventRevision}.`,
        }),
      });

      if (res.ok) {
        setActiveTab('claims');
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to apply correction');
      }
    } catch (err) {
      console.error('Error applying correction:', err);
    } finally {
      setIsApplyingCorrection(false);
    }
  }

  // Record external acknowledgment
  async function handleRecordExternalUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!externalAction.trim()) return;

    setIsRecordingExternal(true);
    try {
      const res = await fetch(`/api/materials/${material.$id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: externalAction.trim(),
          note: externalNote.trim() || undefined,
          eventRevision: currentEventRevision,
        }),
      });

      if (res.ok) {
        setExternalSuccess(true);
        setExternalNote('');
        setTimeout(() => setExternalSuccess(false), 3000);
        onRefresh();
      }
    } catch (err) {
      console.error('Error recording external acknowledgment:', err);
    } finally {
      setIsRecordingExternal(false);
    }
  }

  // Copy corrected text to clipboard
  function handleCopyText() {
    navigator.clipboard.writeText(editableCorrection);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  }

  const materialResolutions = resolutions.filter((r) => r.materialId === material.$id);
  const materialVersions = (versions || []).filter((v: any) => v.materialId === material.$id);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="p-6 border-b border-stone-200/80 bg-warm-50 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {material.kind === 'image' ? (
              <span className="p-1 rounded bg-brand-100 text-brand-700">
                <ImageIcon size={16} />
              </span>
            ) : (
              <span className="p-1 rounded bg-stone-200 text-stone-700">
                <FileText size={16} />
              </span>
            )}
            <h2 className="text-lg font-bold text-stone-900 truncate">
              {material.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {summary && (
              <StatusBadge
                status={summary.status}
                conflictCount={summary.conflictCount}
                size="md"
              />
            )}
            <span className="text-stone-500 font-medium">
              Version {material.version}
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-500">
              Checked against Event Rev {currentEventRevision}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors"
          title="Close panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-200 bg-white px-6">
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'claims'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Claims & Review ({currentClaims.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('corrections')}
          className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'corrections'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Correction Preview
          {summary && summary.conflictCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-conflict-100 text-conflict-700 text-[10px] font-bold">
              {summary.conflictCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('external')}
          className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'external'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          External Acknowledgment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Audit History ({materialResolutions.length})
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Source Material Display */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>Material Source ({material.kind === 'image' ? 'Image File' : 'Plain Text'})</span>
            <span className="font-mono text-[11px] text-stone-600">ID: {material.$id.slice(0, 8)}...</span>
          </div>

          {material.kind === 'image' ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center min-h-[180px]">
                {/* Secure storage image preview */}
                <img
                  src={`/api/materials/${material.$id}/image`}
                  alt={material.title}
                  className="max-h-72 object-contain rounded-md"
                  onError={(e) => {
                    // Fallback graphic for fictional sample poster
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="p-6 text-center text-stone-600 text-xs">
                  <ImageIcon size={32} className="mx-auto mb-2 text-stone-400" />
                  <p className="font-medium text-stone-700">Uploaded Poster Graphic</p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Claims were extracted from this visual material and are verified below.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <pre className="text-xs text-stone-800 font-mono whitespace-pre-wrap bg-white p-3.5 rounded-lg border border-stone-200/80 max-h-48 overflow-y-auto">
              {material.sourceText}
            </pre>
          )}
        </div>

        {/* TAB 1: CLAIMS & REVIEW */}
        {activeTab === 'claims' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Extracted Claims & Evidence
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Confirm or reject factual statements extracted from this material.
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    Extractor: {material.kind === 'text' ? 'Local Deterministic Parser' : 'Manual Entry / Multimodal AI'}
                  </span>
                  <span className="text-[10px] text-stone-600">
                    • Review and edit values before confirming
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClaim(!showAddClaim)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
              >
                <Plus size={13} />
                Add Claim Manually
              </button>
            </div>

            {/* Image extraction notice if unverified image */}
            {material.kind === 'image' && currentClaims.length === 0 && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Image Claims: Unverified (AI Extraction Unavailable)</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Storage upload verified. Automatic OCR requires a live multimodal AI key. Enter the claims visible on this poster manually below to track them against official facts.
                  </div>
                </div>
              </div>
            )}

            {/* Manual claim entry form */}
            {showAddClaim && (
              <form
                onSubmit={handleAddManualClaim}
                className="p-4 rounded-xl border border-brand-200 bg-brand-50/30 space-y-3"
              >
                <div className="text-xs font-bold text-brand-900 uppercase">
                  Manual Claim Entry
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Target Field
                    </label>
                    <select
                      value={newClaimField}
                      onChange={(e) => setNewClaimField(e.target.value as OfficialField)}
                      className="w-full text-xs rounded-lg border border-stone-300 p-2 bg-white"
                    >
                      <option value="event_date">Event Date</option>
                      <option value="start_time">Start Time</option>
                      <option value="venue">Venue</option>
                      <option value="registration_deadline">Registration Deadline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Raw Value in Material
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium"
                      value={newClaimValue}
                      onChange={(e) => setNewClaimValue(e.target.value)}
                      className="w-full text-xs rounded-lg border border-stone-300 p-2 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Supporting Evidence Quote (Verbatim from material)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Venue: Main Auditorium"
                    value={newClaimQuote}
                    onChange={(e) => setNewClaimQuote(e.target.value)}
                    className="w-full text-xs rounded-lg border border-stone-300 p-2 bg-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddClaim(false)}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200/50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
                  >
                    {isSubmittingClaim ? 'Saving...' : 'Save & Confirm Claim'}
                  </button>
                </div>
              </form>
            )}

            {/* Claims list */}
            {currentClaims.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-xl">
                <p className="text-xs text-stone-500">
                  No claims found for Version {material.version}.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddClaim(true)}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  + Add a claim manually
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentClaims.some((c) => c.reviewState === 'proposed') && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        Review Extracted Claims
                      </div>
                      <div className="text-[11px] text-amber-800">
                        {currentClaims.filter((c) => c.reviewState === 'proposed').length} proposed claim(s) awaiting organizer confirmation.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmAllProposed}
                      disabled={isConfirmingAll}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check size={13} />
                      {isConfirmingAll ? 'Confirming...' : 'Confirm All Proposed'}
                    </button>
                  </div>
                )}
                {currentClaims.map((claim) => {
                  const comparison = summary?.comparisons.find((c) => c.claimId === claim.id);
                  const isConflict = comparison && !comparison.isMatch;

                  return (
                    <div
                      key={claim.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isConflict
                          ? 'border-conflict-300 bg-conflict-50/40'
                          : claim.reviewState === 'confirmed'
                          ? 'border-stone-200 bg-white'
                          : claim.reviewState === 'needs_clarification'
                          ? 'border-review-300 bg-review-50/40'
                          : 'border-stone-200 bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 uppercase">
                              {claim.field.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                                claim.reviewState === 'confirmed'
                                  ? 'bg-current-100 text-current-800'
                                  : claim.reviewState === 'needs_clarification'
                                  ? 'bg-review-100 text-review-800'
                                  : claim.reviewState === 'rejected'
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {claim.reviewState.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-stone-900 mt-1">
                            &ldquo;{claim.rawValue}&rdquo;
                          </div>
                        </div>

                        {/* Review Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => (editingClaimId === claim.id ? setEditingClaimId(null) : startEditClaim(claim))}
                            type="button"
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                            title="Edit proposed claim field or value"
                          >
                            <Edit3 size={14} />
                          </button>

                          {claim.reviewState !== 'confirmed' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'confirmed')}
                              type="button"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Confirm claim"
                            >
                              <Check size={14} />
                            </button>
                          )}

                          {claim.reviewState !== 'needs_clarification' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'needs_clarification')}
                              type="button"
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                              title="Mark as ambiguous / needs clarification"
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteClaim(claim.id)}
                            type="button"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete claim"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Claim Editor */}
                      {editingClaimId === claim.id ? (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-brand-300 shadow-2xs space-y-2.5">
                          <div className="text-[11px] font-bold text-brand-900 uppercase">
                            Edit Claim Details
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                                Target Field
                              </label>
                              <select
                                value={editClaimField}
                                onChange={(e) => setEditClaimField(e.target.value as OfficialField)}
                                className="w-full text-xs rounded-lg border border-stone-300 p-1.5 bg-white"
                              >
                                <option value="event_date">Event Date</option>
                                <option value="start_time">Start Time</option>
                                <option value="venue">Venue</option>
                                <option value="registration_deadline">Registration Deadline</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                                Raw Claim Value
                              </label>
                              <input
                                type="text"
                                value={editClaimValue}
                                onChange={(e) => setEditClaimValue(e.target.value)}
                                className="w-full text-xs rounded-lg border border-stone-300 p-1.5 bg-white"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                              Evidence Quote (Verbatim from material)
                            </label>
                            <input
                              type="text"
                              value={editClaimQuote}
                              onChange={(e) => setEditClaimQuote(e.target.value)}
                              className="w-full text-xs rounded-lg border border-stone-300 p-1.5 bg-white font-mono"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingClaimId(null)}
                              className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingClaim}
                              onClick={() => handleSaveEditedClaim(claim.id)}
                              className="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                            >
                              {isUpdatingClaim ? 'Saving...' : 'Save & Update'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Evidence quote */}
                          <div className="text-xs text-stone-600 bg-stone-100/70 p-2 rounded-md font-mono mt-2">
                            <span className="font-semibold text-stone-500">Quote: </span>
                            &ldquo;{claim.evidenceQuote}&rdquo;
                            {claim.evidenceLocation && (
                              <span className="text-stone-600 ml-2">({claim.evidenceLocation})</span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Ambiguity Reason */}
                      {claim.ambiguityReason && (
                        <div className="mt-2 text-xs flex items-start gap-1.5 text-amber-800 bg-amber-50/80 p-2 rounded-md border border-amber-200">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                          <span>{claim.ambiguityReason}</span>
                        </div>
                      )}

                      {/* Comparison feedback */}
                      {claim.reviewState === 'confirmed' && comparison && (
                        <div
                          className={`mt-2.5 text-xs p-2 rounded-md flex items-center justify-between ${
                            comparison.isMatch
                              ? 'bg-current-50 text-current-800 border border-current-200'
                              : 'bg-conflict-50 text-conflict-900 border border-conflict-200 font-medium'
                          }`}
                        >
                          <span>
                            {comparison.isMatch
                              ? `✓ Matches official value (${comparison.officialDisplay})`
                              : `⚠️ Outdated! Official is "${comparison.officialDisplay}"`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CORRECTION PREVIEW */}
        {activeTab === 'corrections' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Suggested Corrections & Versioning
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Review suggested fixes, edit the updated copy, and create Version {material.version + 1}.
              </p>
            </div>

            {summary && summary.conflictCount === 0 ? (
              <div className="p-8 text-center border border-stone-200 rounded-xl bg-current-50/40">
                <CheckCircle size={28} className="mx-auto text-current-600 mb-2" />
                <h4 className="text-sm font-bold text-current-900">
                  No Outdated Facts Detected
                </h4>
                <p className="text-xs text-current-800 mt-1 max-w-sm mx-auto">
                  All confirmed claims in Version {material.version} match the official details at Revision {currentEventRevision}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Identified Outdated Fields */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                    Outdated Claims in this Material
                  </div>
                  {generatedCorrections.map((corr, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-conflict-200 bg-conflict-50/50 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-semibold text-conflict-900 uppercase">
                          {corr.field.replace('_', ' ')}:
                        </span>{' '}
                        <span className="line-through text-stone-500 font-mono">
                          {corr.originalQuote}
                        </span>{' '}
                        <ArrowRight size={12} className="inline mx-1 text-conflict-600" />{' '}
                        <span className="font-bold text-conflict-900 font-mono">
                          {corr.replacementText}
                        </span>
                      </div>
                      <span className="text-[10px] text-conflict-700 font-mono font-medium">
                        Rev {corr.eventRevision}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Side-by-Side View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Original */}
                  <div>
                    <div className="text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
                      <span>Original Text (v{material.version})</span>
                    </div>
                    <pre className="text-xs font-mono p-3 bg-stone-100 rounded-lg border border-stone-200 max-h-56 overflow-y-auto whitespace-pre-wrap text-stone-700">
                      {material.sourceText || 'Graphic material'}
                    </pre>
                  </div>

                  {/* Proposed Corrected */}
                  <div>
                    <div className="text-xs font-semibold text-brand-900 mb-1.5 flex items-center justify-between">
                      <span>Suggested Corrected (v{material.version + 1})</span>
                      <button
                        onClick={handleCopyText}
                        type="button"
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        <Copy size={11} />
                        {copiedNotification ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={editableCorrection}
                      onChange={(e) => setEditableCorrection(e.target.value)}
                      className="w-full text-xs font-mono p-3 bg-white rounded-lg border border-brand-300 focus:ring-1 focus:ring-brand-500 text-stone-900 resize-none"
                    />
                  </div>
                </div>

                {/* Apply CTA */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-stone-500">
                    Applying creates Version {material.version + 1} and reconfirms claims.
                  </div>
                  <button
                    onClick={handleApplyCorrection}
                    disabled={isApplyingCorrection}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <RefreshCw size={14} className={isApplyingCorrection ? 'animate-spin' : ''} />
                    {isApplyingCorrection ? 'Applying...' : `Apply Correction (Create v${material.version + 1})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXTERNAL ACKNOWLEDGMENT */}
        {activeTab === 'external' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Record External Update Acknowledgment
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Log when you have fixed this material on external channels (e.g. Discord, WhatsApp, print).
                Note: External acknowledgments are tracked separately and do not falsely claim the unchanged file has changed.
              </p>
            </div>

            {externalSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                External resolution successfully recorded in audit log!
              </div>
            )}

            <form onSubmit={handleRecordExternalUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Channel / Action Taken
                </label>
                <input
                  type="text"
                  value={externalAction}
                  onChange={(e) => setExternalAction(e.target.value)}
                  placeholder="e.g. Posted updated flyer to Discord announcements channel"
                  className="w-full text-xs rounded-lg border border-stone-300 p-2.5 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Organizer Notes / Link (Optional)
                </label>
                <textarea
                  rows={3}
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  placeholder="e.g. Pinged @here and pinned message. Poster printing reprinted with revision 2."
                  className="w-full text-xs rounded-lg border border-stone-300 p-2.5 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isRecordingExternal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Send size={13} />
                {isRecordingExternal ? 'Recording...' : 'Record Acknowledgment'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: AUDIT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Audit Trail & Resolution History
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Chronological record of corrections, revisions, and preserved historical source copies.
              </p>
            </div>

            {/* Preserved Historical Versions Inspection */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  Preserved Version Snapshots ({materialVersions.length > 0 ? materialVersions.length : 1})
                </span>
                <span className="text-[10px] font-semibold text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded-full">
                  Current: v{material.version}
                </span>
              </div>

              {materialVersions.length > 0 ? (
                <div className="space-y-2">
                  {materialVersions.map((v: any) => (
                    <div key={v.$id} className="p-3 bg-white rounded-lg border border-stone-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">
                          Version {v.version} {v.version === material.version ? '(Current)' : '(Historical)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedVersionId(expandedVersionId === v.$id ? null : v.$id)}
                          className="text-brand-600 hover:text-brand-800 font-semibold text-[11px] flex items-center gap-1"
                        >
                          {expandedVersionId === v.$id ? 'Hide Source' : 'Inspect Preserved Source'}
                          {expandedVersionId === v.$id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      {expandedVersionId === v.$id && (
                        <pre className="mt-2 p-2.5 bg-stone-50 rounded border border-stone-200 text-xs font-mono whitespace-pre-wrap text-stone-800 max-h-48 overflow-y-auto">
                          {v.sourceText || '(Binary file material)'}
                        </pre>
                      )}
                      <div className="text-[10px] text-stone-600 mt-1">
                        Recorded on {new Date(v.createdAt).toLocaleString()}
                        {v.changeNote && ` • ${v.changeNote}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">
                      Version {material.version} (Active)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedVersionId(expandedVersionId === 'current' ? null : 'current')}
                      className="text-brand-600 hover:text-brand-800 font-semibold text-[11px] flex items-center gap-1"
                    >
                      {expandedVersionId === 'current' ? 'Hide Source' : 'Inspect Active Source'}
                      {expandedVersionId === 'current' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {expandedVersionId === 'current' && (
                    <pre className="mt-2 p-2.5 bg-stone-50 rounded border border-stone-200 text-xs font-mono whitespace-pre-wrap text-stone-800 max-h-48 overflow-y-auto">
                      {material.sourceText || '(Binary file material)'}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Resolutions list */}
            {materialResolutions.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-stone-200 rounded-xl text-xs text-stone-500">
                No resolution events recorded yet for this material.
              </div>
            ) : (
              <div className="space-y-3">
                {materialResolutions.map((res) => (
                  <div
                    key={res.$id}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">
                        {res.action}
                      </span>
                      <span className="text-stone-600 font-mono text-[11px]">
                        Event Rev {res.eventRevision} • v{res.materialVersion}
                      </span>
                    </div>
                    {res.note && (
                      <p className="text-xs text-stone-600">{res.note}</p>
                    )}
                    <div className="text-[10px] text-stone-600 pt-1">
                      {new Date(res.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
