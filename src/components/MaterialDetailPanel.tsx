'use client';

import React, { useState } from 'react';
import { MaterialRow, FactRow, ResolutionRow } from '@/lib/server/tables-db';
import { Claim, MaterialComparisonSummary, OfficialField } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import { generateCorrections } from '@/lib/corrections';
import {
  X,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Plus,
  RefreshCw,
  Copy,
  ArrowRight,
  History,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react';

interface MaterialDetailPanelProps {
  material: MaterialRow;
  summary?: MaterialComparisonSummary;
  claims: Claim[];
  facts: FactRow[];
  currentEventRevision: number;
  changes: any[];
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
  resolutions,
  versions = [],
  onClose,
  onRefresh,
}: MaterialDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'claims' | 'corrections' | 'history' | 'external'>('claims');

  // Manual claim addition state
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [newClaimField, setNewClaimField] = useState<OfficialField>('venue');
  const [newClaimValue, setNewClaimValue] = useState('');
  const [newClaimQuote, setNewClaimQuote] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Generate suggested corrections from comparison results
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
      console.error('Error saving edited claim:', err);
    } finally {
      setIsUpdatingClaim(false);
    }
  }

  // External update acknowledgment state
  const [externalAction, setExternalAction] = useState('Posted updated announcement on channel');
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
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add claim');
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

  const currentClaims = claims.filter(
    (c) => c.materialId === material.$id && c.materialVersion === material.version
  );
  const materialResolutions = resolutions.filter((r) => r.materialId === material.$id);
  const materialVersions = (versions || []).filter((v: any) => v.materialId === material.$id);

  // Keyboard escape dismissal
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-lg z-50 flex flex-col border-l border-stone-200">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-paper-100 flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {material.kind === 'image' ? (
              <span className="p-1 rounded bg-stone-200 text-stone-700">
                <ImageIcon size={14} />
              </span>
            ) : (
              <span className="p-1 rounded bg-stone-200 text-stone-700">
                <FileText size={14} />
              </span>
            )}
            <h2 className="text-base font-bold text-stone-900 truncate">
              {material.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
            {summary && (
              <StatusBadge
                status={summary.status}
                conflictCount={summary.conflictCount}
                size="sm"
              />
            )}
            <span>Version {material.version}</span>
            <span>•</span>
            <span>Compared against Revision {currentEventRevision}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-200 transition-colors"
          title="Close panel"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-stone-200 bg-white px-4 sm:px-5 shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'claims'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Claims & Review ({currentClaims.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('corrections')}
          className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'corrections'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Correction Preview
          {summary && summary.conflictCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-conflict-100 text-conflict-800">
              {summary.conflictCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Audit History ({materialVersions.length > 0 ? materialVersions.length : 1})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('external')}
          className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'external'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Mark Shared Copy
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* TAB 1: CLAIMS & REVIEW */}
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {/* Source Text Snippet */}
            {material.sourceText && (
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Saved Source Text (Version {material.version})
                </div>
                <pre className="p-3 bg-paper-50 rounded-md border border-stone-200 text-xs font-mono text-stone-800 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                  {material.sourceText}
                </pre>
              </div>
            )}

            {/* Poster graphic if image */}
            {material.kind === 'image' && material.storageFileId && (
              <div>
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Uploaded Poster Graphic
                </div>
                <div className="p-2 bg-stone-100 rounded-md border border-stone-200 flex justify-center max-h-56 overflow-hidden">
                  <img
                    src={`/api/materials/${material.$id}/image`}
                    alt={material.title}
                    className="max-h-52 object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Header with add manual claim */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                  Extracted Claims & Evidence
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                  <span>
                    Extractor: {material.kind === 'text' ? 'Local Deterministic Parser' : 'Manual Entry / Multimodal AI'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClaim(!showAddClaim)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 transition-colors"
              >
                <Plus size={12} strokeWidth={2.5} />
                Add Claim Manually
              </button>
            </div>

            {/* Unverified image notice */}
            {material.kind === 'image' && currentClaims.length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-700 shrink-0" />
                  Image Claims: Unverified (AI Extraction Unavailable)
                </div>
                <p className="text-[11px] text-amber-800 pl-5">
                  Storage upload verified. Enter the claims visible on this poster manually below to compare them against official details.
                </p>
              </div>
            )}

            {/* Manual claim entry form */}
            {showAddClaim && (
              <form
                onSubmit={handleAddManualClaim}
                className="p-3.5 rounded-md border border-stone-300 bg-paper-100 space-y-2.5 text-xs"
              >
                <div className="font-bold text-stone-900 text-[11px] uppercase">
                  Manual Claim Entry
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                      Target Field
                    </label>
                    <select
                      value={newClaimField}
                      onChange={(e) => setNewClaimField(e.target.value as OfficialField)}
                      className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white"
                    >
                      <option value="event_date">Event Date</option>
                      <option value="start_time">Start Time</option>
                      <option value="venue">Venue</option>
                      <option value="registration_deadline">Registration Deadline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                      Claimed Value
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium"
                      value={newClaimValue}
                      onChange={(e) => setNewClaimValue(e.target.value)}
                      className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                    Supporting Quote from Material
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Venue: Main Auditorium"
                    value={newClaimQuote}
                    onChange={(e) => setNewClaimQuote(e.target.value)}
                    className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white font-mono"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddClaim(false)}
                    className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200/50 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-3 py-1 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                  >
                    {isSubmittingClaim ? 'Saving...' : 'Save & Confirm Claim'}
                  </button>
                </div>
              </form>
            )}

            {/* Claims list */}
            {currentClaims.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-stone-200 rounded-md text-xs text-stone-500">
                No claims recorded for Version {material.version}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Proposed Claims Review Banner */}
                {currentClaims.some((c) => c.reviewState === 'proposed') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        Review Extracted Claims
                      </div>
                      <div className="text-[11px] text-amber-800">
                        {currentClaims.filter((c) => c.reviewState === 'proposed').length} proposed claim(s) awaiting confirmation.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmAllProposed}
                      disabled={isConfirmingAll}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-current-700 hover:bg-current-800 text-white shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check size={12} strokeWidth={2.5} />
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
                      className={`p-3 rounded-md border text-xs transition-colors ${
                        isConflict
                          ? 'border-conflict-300 bg-conflict-50/40'
                          : claim.reviewState === 'confirmed'
                          ? 'border-stone-200 bg-white'
                          : claim.reviewState === 'needs_clarification'
                          ? 'border-review-300 bg-review-50/40'
                          : 'border-stone-200 bg-paper-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 uppercase text-[10px] tracking-wide">
                              {claim.field.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded capitalize ${
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

                          <div className="text-sm font-semibold text-stone-900 mt-0.5">
                            &ldquo;{claim.rawValue}&rdquo;
                          </div>
                        </div>

                        {/* Review Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => (editingClaimId === claim.id ? setEditingClaimId(null) : startEditClaim(claim))}
                            type="button"
                            className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                            title="Edit proposed claim field or value"
                            aria-label="Edit proposed claim field or value"
                          >
                            <Edit2 size={13} />
                          </button>

                          {claim.reviewState !== 'confirmed' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'confirmed')}
                              type="button"
                              className="p-1 rounded text-current-700 hover:bg-current-100 border border-current-200 bg-current-50 transition-colors"
                              title="Confirm claim"
                              aria-label="Confirm claim"
                            >
                              <Check size={13} strokeWidth={2.5} />
                            </button>
                          )}

                          {claim.reviewState !== 'needs_clarification' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'needs_clarification')}
                              type="button"
                              className="p-1 rounded text-review-700 hover:bg-review-100 border border-review-200 bg-review-50 transition-colors"
                              title="Mark as ambiguous"
                              aria-label="Mark as ambiguous"
                            >
                              <AlertTriangle size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteClaim(claim.id)}
                            type="button"
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete claim"
                            aria-label="Delete claim"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Claim Editor */}
                      {editingClaimId === claim.id ? (
                        <div className="mt-2.5 p-3 bg-white rounded border border-brand-300 space-y-2">
                          <div className="text-[10px] font-bold text-brand-900 uppercase">
                            Edit Claim Details
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                                Target Field
                              </label>
                              <select
                                value={editClaimField}
                                onChange={(e) => setEditClaimField(e.target.value as OfficialField)}
                                className="w-full text-xs rounded border border-stone-300 p-1 bg-white"
                              >
                                <option value="event_date">Event Date</option>
                                <option value="start_time">Start Time</option>
                                <option value="venue">Venue</option>
                                <option value="registration_deadline">Registration Deadline</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                                Raw Claim Value
                              </label>
                              <input
                                type="text"
                                value={editClaimValue}
                                onChange={(e) => setEditClaimValue(e.target.value)}
                                className="w-full text-xs rounded border border-stone-300 p-1 bg-white"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                              Evidence Quote (Verbatim from material)
                            </label>
                            <input
                              type="text"
                              value={editClaimQuote}
                              onChange={(e) => setEditClaimQuote(e.target.value)}
                              className="w-full text-xs rounded border border-stone-300 p-1 bg-white font-mono"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingClaimId(null)}
                              className="px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingClaim}
                              onClick={() => handleSaveEditedClaim(claim.id)}
                              className="px-2.5 py-0.5 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                            >
                              {isUpdatingClaim ? 'Saving...' : 'Save & Update'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-600 bg-paper-100 p-1.5 rounded font-mono mt-1.5">
                          <span className="font-semibold text-stone-500">Quote: </span>
                          &ldquo;{claim.evidenceQuote}&rdquo;
                        </div>
                      )}

                      {/* Ambiguity Reason */}
                      {claim.ambiguityReason && (
                        <div className="mt-1.5 text-[11px] flex items-start gap-1.5 text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-700" />
                          <span>{claim.ambiguityReason}</span>
                        </div>
                      )}

                      {/* Comparison feedback */}
                      {claim.reviewState === 'confirmed' && comparison && (
                        <div
                          className={`mt-2 text-[11px] p-2 rounded flex items-center justify-between ${
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
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Review Suggested Corrections
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Ripple applies all conflicting official details simultaneously. Review the proposed text before saving.
              </p>
            </div>

            {summary && summary.conflictCount === 0 ? (
              <div className="p-6 text-center border border-stone-200 rounded-md bg-current-50 text-xs">
                <CheckCircle size={24} className="mx-auto text-current-600 mb-1.5" />
                <h4 className="font-bold text-current-900">
                  No Outdated Details Detected
                </h4>
                <p className="text-[11px] text-current-800 mt-0.5">
                  All reviewed claims in Version {material.version} match the official details at Revision {currentEventRevision}.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Outdated items summary */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                    Identified Outdated Details
                  </div>
                  {generatedCorrections.map((corr, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded border border-conflict-200 bg-conflict-50 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-conflict-900 uppercase text-[10px]">
                          {corr.field.replace('_', ' ')}:
                        </span>{' '}
                        <span className="line-through text-stone-500 font-mono">
                          {corr.originalQuote}
                        </span>{' '}
                        <ArrowRight size={10} className="inline mx-1 text-conflict-600" />{' '}
                        <span className="font-bold text-conflict-900 font-mono">
                          {corr.replacementText}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Side-by-Side View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Original */}
                  <div>
                    <div className="text-[11px] font-semibold text-stone-700 mb-1">
                      Original Text (v{material.version})
                    </div>
                    <pre className="text-xs font-mono p-3 bg-stone-100 rounded border border-stone-200 max-h-56 overflow-y-auto whitespace-pre-wrap text-stone-700 leading-relaxed">
                      {material.sourceText || 'Graphic material'}
                    </pre>
                  </div>

                  {/* Proposed Corrected */}
                  <div>
                    <div className="text-[11px] font-semibold text-stone-900 mb-1 flex items-center justify-between">
                      <span>Proposed Corrected (v{material.version + 1})</span>
                      <button
                        onClick={handleCopyText}
                        type="button"
                        className="text-[10px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        <Copy size={10} />
                        {copiedNotification ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={editableCorrection}
                      onChange={(e) => setEditableCorrection(e.target.value)}
                      className="w-full text-xs font-mono p-3 bg-white rounded border border-stone-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-stone-900 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Apply CTA with clear workflow guidance */}
                <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-stone-500 max-w-sm">
                    Saving text creates Version {material.version + 1}. Extracted claims will be held in review for your explicit confirmation.
                  </p>

                  <button
                    onClick={handleApplyCorrection}
                    disabled={isApplyingCorrection}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <RefreshCw size={12} className={isApplyingCorrection ? 'animate-spin' : ''} />
                    {isApplyingCorrection ? 'Saving...' : `Apply Correction · Save v${material.version + 1}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY & PRESERVED VERSIONS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Version History & Preserved Snapshots
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Inspect preserved historical copies from earlier revisions. History is immutable.
              </p>
            </div>

            {/* Preserved Versions Snapshots */}
            <div className="space-y-2">
              {materialVersions.length > 0 ? (
                materialVersions.map((v: any) => (
                  <div key={v.$id} className="p-3 bg-paper-50 rounded border border-stone-200 text-xs">
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
                        {expandedVersionId === v.$id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>

                    {expandedVersionId === v.$id && (
                      <pre className="mt-2 p-2.5 bg-white rounded border border-stone-200 text-[11px] font-mono whitespace-pre-wrap text-stone-800 max-h-48 overflow-y-auto leading-relaxed">
                        {v.sourceText || '(Binary file material)'}
                      </pre>
                    )}

                    <div className="text-[10px] text-stone-500 mt-1 font-mono">
                      Recorded on {new Date(v.createdAt).toLocaleString()}
                      {v.changeNote && ` • ${v.changeNote}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-paper-50 rounded border border-stone-200 text-xs">
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
                      {expandedVersionId === 'current' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>

                  {expandedVersionId === 'current' && (
                    <pre className="mt-2 p-2.5 bg-white rounded border border-stone-200 text-[11px] font-mono whitespace-pre-wrap text-stone-800 max-h-48 overflow-y-auto leading-relaxed">
                      {material.sourceText || '(Binary file material)'}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Resolutions Audit Log */}
            <div className="pt-2 border-t border-stone-200 space-y-2">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">
                Resolution Events
              </div>
              {materialResolutions.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-stone-200 rounded text-xs text-stone-500">
                  No resolution events recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {materialResolutions.map((res) => (
                    <div
                      key={res.$id}
                      className="p-2.5 rounded border border-stone-200 bg-white text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-stone-900">
                        <span>{res.action}</span>
                        <span className="font-mono text-[10px] text-stone-500">
                          Rev {res.eventRevision} • v{res.materialVersion}
                        </span>
                      </div>
                      {res.note && <p className="text-[11px] text-stone-600">{res.note}</p>}
                      <div className="text-[10px] text-stone-400 font-mono">
                        {new Date(res.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EXTERNAL ACKNOWLEDGMENT ("MARK SHARED COPY UPDATED") */}
        {activeTab === 'external' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Mark Shared Copy Updated
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Record when you have posted or distributed corrected text on external channels (e.g. Discord, WhatsApp, printed handouts).
              </p>
            </div>

            {externalSuccess && (
              <div className="p-2.5 rounded bg-current-50 border border-current-200 text-current-800 text-xs flex items-center gap-1.5">
                <CheckCircle size={13} className="text-current-600 shrink-0" />
                External resolution recorded in audit trail.
              </div>
            )}

            <form onSubmit={handleRecordExternalUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                  Action Taken
                </label>
                <input
                  type="text"
                  value={externalAction}
                  onChange={(e) => setExternalAction(e.target.value)}
                  placeholder="e.g. Posted updated announcement on Discord channel"
                  className="w-full text-xs rounded border border-stone-300 p-2 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                  Organizer Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  placeholder="e.g. Pinned to #announcements and notified all attendees."
                  className="w-full text-xs rounded border border-stone-300 p-2 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isRecordingExternal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-stone-900 hover:bg-stone-800 text-white transition-colors"
                >
                  <Share2 size={12} />
                  {isRecordingExternal ? 'Recording...' : 'Record Distribution'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
