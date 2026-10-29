'use client';

import React, { useState, useEffect } from 'react';
import { MaterialRow, FactRow, ChangeRow, ResolutionRow } from '@/lib/server/tables-db';
import { Claim, MaterialComparisonSummary, OfficialField } from '@/lib/comparison';
import { StatusBadge } from './StatusBadge';
import {
  X,
  FileText,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Send,
  History,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface MaterialDetailPanelProps {
  material: MaterialRow;
  summary?: MaterialComparisonSummary;
  claims: Claim[];
  facts: FactRow[];
  currentEventRevision: number;
  changes: ChangeRow[];
  resolutions: ResolutionRow[];
  versions: any[];
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
  const [activeTab, setActiveTab] = useState<'claims' | 'corrections' | 'history' | 'external'>('claims');

  // Manual claim creation state
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [newClaimField, setNewClaimField] = useState<OfficialField>('event_date');
  const [newClaimValue, setNewClaimValue] = useState('');
  const [newClaimQuote, setNewClaimQuote] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Editable claim state
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editClaimField, setEditClaimField] = useState<OfficialField>('event_date');
  const [editClaimValue, setEditClaimValue] = useState('');
  const [editClaimQuote, setEditClaimQuote] = useState('');
  const [isUpdatingClaim, setIsUpdatingClaim] = useState(false);

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

  // 1-Click Confirm All Proposed Claims
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  async function handleConfirmAllProposed() {
    setIsConfirmingAll(true);
    try {
      const proposed = currentClaims.filter((c) => c.reviewState === 'proposed');
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
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply correction');
      }

      onRefresh();
      setActiveTab('claims');
    } catch (err: any) {
      alert(err.message || 'Error creating new version');
    } finally {
      setIsApplyingCorrection(false);
    }
  }

  // Record external channel update acknowledgment
  async function handleRecordExternal(e: React.FormEvent) {
    e.preventDefault();
    setIsRecordingExternal(true);
    try {
      const res = await fetch(`/api/materials/${material.$id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventRevision: currentEventRevision,
          materialVersion: material.version,
          action: externalAction,
          note: externalNote.trim(),
        }),
      });

      if (res.ok) {
        setExternalNote('');
        setExternalSuccess(true);
        setTimeout(() => setExternalSuccess(false), 3000);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to record external acknowledgment');
      }
    } catch (err) {
      console.error('Error recording external acknowledgment:', err);
    } finally {
      setIsRecordingExternal(false);
    }
  }

  // Copy corrected text to clipboard
  const [copiedNotification, setCopiedNotification] = useState(false);
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

  // Compute multi-fact simultaneous replacements
  const conflictingComps = (summary?.comparisons || []).filter((c) => !c.isMatch);
  const generatedCorrections: Array<{
    field: string;
    originalQuote: string;
    replacementText: string;
  }> = [];

  let initialSuggestedText = material.sourceText || '';
  for (const comp of conflictingComps) {
    const claim = currentClaims.find((c) => c.id === comp.claimId);
    if (claim && claim.evidenceQuote) {
      generatedCorrections.push({
        field: comp.field,
        originalQuote: claim.evidenceQuote,
        replacementText: comp.officialDisplay,
      });
      initialSuggestedText = initialSuggestedText.replace(
        claim.evidenceQuote,
        comp.officialDisplay
      );
    }
  }

  const [editableCorrection, setEditableCorrection] = useState(initialSuggestedText);
  useEffect(() => {
    setEditableCorrection(initialSuggestedText);
  }, [initialSuggestedText]);

  // Version snapshot view state in Audit History
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  // Keyboard escape dismissal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper to render before/after diff with highlighted words
  function renderHighlightedText(source: string, highlights: Array<{ text: string; type: 'remove' | 'add' }>) {
    if (!source) return null;
    const sorted = [...highlights].sort((a, b) => b.text.length - a.text.length);
    const escaped = sorted.map((h) => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
    if (escaped.length === 0) return <span>{source}</span>;

    const regex = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts = source.split(regex);

    return parts.map((part, i) => {
      const match = sorted.find((h) => h.text === part);
      if (!match) return <span key={i}>{part}</span>;
      if (match.type === 'remove') {
        return (
          <mark
            key={i}
            className="bg-rose-100 text-rose-950 line-through px-1.5 py-0.5 rounded font-semibold border border-rose-200 inline"
            title="Outdated detail in current version"
          >
            {part}
          </mark>
        );
      }
      return (
        <mark
          key={i}
          className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded border border-emerald-300 inline"
          title="Updated official detail"
        >
          {part}
        </mark>
      );
    });
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-lg z-50 flex flex-col border-l border-stone-200">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-paper-100 flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2.5 mb-1.5">
            <span className="p-1 rounded bg-stone-200 text-stone-700 shrink-0 mt-0.5">
              {material.kind === 'image' ? <ImageIcon size={15} /> : <FileText size={15} />}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 break-words leading-snug">
              {material.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            {summary && (
              <StatusBadge
                status={summary.status}
                conflictCount={summary.conflictCount}
                size="sm"
              />
            )}
            <span className="font-medium">Version {material.version}</span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-600 font-mono text-[11px]">Compared against Revision {currentEventRevision}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-200 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
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
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[42px] ${
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
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[42px] ${
            activeTab === 'corrections'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
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
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[42px] ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Audit History ({materialVersions.length > 0 ? materialVersions.length : 1})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('external')}
          className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[42px] ${
            activeTab === 'external'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-600 hover:text-stone-900'
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
                <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  Saved Source Text (Version {material.version})
                </div>
                <div data-testid="saved-source-text" className="p-4 bg-paper-50 rounded-md border border-stone-200 text-[15px] sm:text-base font-sans text-stone-900 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                  {material.sourceText}
                </div>
              </div>
            )}

            {/* Poster graphic if image */}
            {material.kind === 'image' && material.storageFileId && (
              <div>
                <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1.5">
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
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-600">
                  <span>
                    Extractor: {material.kind === 'text' ? 'Local Deterministic Parser' : 'Manual Entry / Multimodal AI'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClaim(!showAddClaim)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200 transition-colors min-h-[34px]"
              >
                <Plus size={13} strokeWidth={2.5} />
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
                className="p-4 rounded-md border border-stone-300 bg-paper-100 space-y-3 text-xs"
              >
                <div className="font-bold text-stone-900 text-xs uppercase">
                  Manual Claim Entry
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Target Field
                    </label>
                    <select
                      value={newClaimField}
                      onChange={(e) => setNewClaimField(e.target.value as OfficialField)}
                      className="w-full text-xs rounded border border-stone-300 p-2 bg-white"
                    >
                      <option value="event_date">Event Date</option>
                      <option value="start_time">Start Time</option>
                      <option value="venue">Venue</option>
                      <option value="registration_deadline">Registration Deadline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Claimed Value
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Auditorium"
                      value={newClaimValue}
                      onChange={(e) => setNewClaimValue(e.target.value)}
                      className="w-full text-xs rounded border border-stone-300 p-2 bg-white font-sans"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Supporting Quote from Material (Verbatim)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Venue: Main Auditorium"
                    value={newClaimQuote}
                    onChange={(e) => setNewClaimQuote(e.target.value)}
                    className="w-full text-xs rounded border border-stone-300 p-2 bg-white font-sans"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddClaim(false)}
                    className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200/50 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                  >
                    {isSubmittingClaim ? 'Saving...' : 'Save & Confirm Claim'}
                  </button>
                </div>
              </form>
            )}

            {/* Proposed claims review banner */}
            {currentClaims.some((c) => c.reviewState === 'proposed') && (
              <div className="p-3.5 bg-paper-100 border border-brand-300 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      Review Extracted Claims ({currentClaims.filter((c) => c.reviewState === 'proposed').length} proposed)
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Confirm that extracted values and verbatim quotes accurately represent this material.
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmAllProposed}
                    disabled={isConfirmingAll}
                    type="button"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700 shadow-2xs transition-colors shrink-0 min-h-[34px]"
                  >
                    {isConfirmingAll ? 'Confirming...' : 'Confirm All Proposed'}
                  </button>
                </div>
              </div>
            )}

            {/* Claims list */}
            {currentClaims.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-stone-200 rounded-md text-stone-500 text-xs">
                No factual claims recorded for Version {material.version}.
              </div>
            ) : (
              <div className="space-y-3">
                {currentClaims.map((claim) => {
                  const comparison = summary?.comparisons.find((c) => c.claimId === claim.id);
                  const isConflicting = comparison && !comparison.isMatch;

                  return (
                    <div
                      key={claim.id}
                      className={`p-3.5 rounded-md border text-xs transition-colors ${
                        claim.reviewState === 'proposed'
                          ? 'border-brand-200 bg-brand-50/20'
                          : isConflicting
                          ? 'border-conflict-200 bg-conflict-50/30'
                          : 'border-stone-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-stone-800 uppercase text-[10px] tracking-wide">
                              {claim.field.replace('_', ' ')}:
                            </span>
                            <span className="font-bold text-stone-900 text-sm font-sans">
                              {claim.rawValue}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                claim.reviewState === 'confirmed'
                                  ? 'bg-current-100 text-current-800'
                                  : claim.reviewState === 'proposed'
                                  ? 'bg-brand-100 text-brand-800'
                                  : 'bg-review-100 text-review-800'
                              }`}
                            >
                              {claim.reviewState === 'confirmed'
                                ? 'Confirmed'
                                : claim.reviewState === 'proposed'
                                ? 'Proposed'
                                : 'Needs Clarification'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => startEditClaim(claim)}
                            type="button"
                            className="p-1.5 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                            title="Edit proposed claim field or value"
                            aria-label="Edit proposed claim field or value"
                          >
                            <Edit2 size={13} />
                          </button>

                          {claim.reviewState !== 'confirmed' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'confirmed')}
                              type="button"
                              className="p-1.5 rounded text-current-700 hover:bg-current-100 border border-current-200 bg-current-50 transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                              title="Confirm claim"
                              aria-label="Confirm claim"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          )}

                          {claim.reviewState !== 'needs_clarification' && (
                            <button
                              onClick={() => handleClaimAction(claim.id, 'needs_clarification')}
                              type="button"
                              className="p-1.5 rounded text-review-700 hover:bg-review-100 border border-review-200 bg-review-50 transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                              title="Mark as ambiguous"
                              aria-label="Mark as ambiguous"
                            >
                              <AlertTriangle size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteClaim(claim.id)}
                            type="button"
                            className="p-1.5 rounded text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                            title="Delete claim"
                            aria-label="Delete claim"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Claim Editor */}
                      {editingClaimId === claim.id ? (
                        <div className="mt-3 p-3.5 bg-white rounded border border-brand-300 space-y-2.5">
                          <div className="text-[11px] font-bold text-brand-900 uppercase">
                            Edit Claim Details
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                                Target Field
                              </label>
                              <select
                                value={editClaimField}
                                onChange={(e) => setEditClaimField(e.target.value as OfficialField)}
                                className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white"
                              >
                                <option value="event_date">Event Date</option>
                                <option value="start_time">Start Time</option>
                                <option value="venue">Venue</option>
                                <option value="registration_deadline">Registration Deadline</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                                Raw Claim Value
                              </label>
                              <input
                                type="text"
                                value={editClaimValue}
                                onChange={(e) => setEditClaimValue(e.target.value)}
                                className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white font-sans"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-stone-700 mb-1">
                              Evidence Quote (Verbatim from material)
                            </label>
                            <input
                              type="text"
                              value={editClaimQuote}
                              onChange={(e) => setEditClaimQuote(e.target.value)}
                              className="w-full text-xs rounded border border-stone-300 p-1.5 bg-white font-sans"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingClaimId(null)}
                              className="px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isUpdatingClaim}
                              onClick={() => handleSaveEditedClaim(claim.id)}
                              className="px-3 py-1 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                            >
                              {isUpdatingClaim ? 'Saving...' : 'Save & Update'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-stone-700 bg-paper-100 p-2 rounded mt-2 font-sans leading-relaxed">
                          <span className="font-semibold text-stone-800">Quote: </span>
                          &ldquo;{claim.evidenceQuote}&rdquo;
                        </div>
                      )}

                      {/* Ambiguity Reason */}
                      {claim.ambiguityReason && (
                        <div className="mt-2 text-xs flex items-start gap-1.5 text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-700" />
                          <span>{claim.ambiguityReason}</span>
                        </div>
                      )}

                      {/* Comparison feedback */}
                      {claim.reviewState === 'confirmed' && comparison && (
                        <div
                          className={`mt-2 text-xs p-2.5 rounded flex items-center justify-between ${
                            comparison.isMatch
                              ? 'bg-current-50 text-current-900 border border-current-200'
                              : 'bg-conflict-50 text-conflict-950 border border-conflict-200 font-medium'
                          }`}
                        >
                          <span>
                            {comparison.isMatch
                              ? `✓ Matches official details (${comparison.officialDisplay})`
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
              <p className="text-xs text-stone-600 mt-0.5">
                Ripple identifies all outdated details and replaces them with official values.
              </p>
            </div>

            {summary && summary.conflictCount === 0 ? (
              <div className="p-6 text-center border border-stone-200 rounded-md bg-current-50 text-xs">
                <CheckCircle size={24} className="mx-auto text-current-600 mb-1.5" />
                <h4 className="font-bold text-current-900 text-sm">
                  No Outdated Details Detected
                </h4>
                <p className="text-xs text-current-800 mt-1">
                  All reviewed claims in Version {material.version} match the official details at Revision {currentEventRevision}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Outdated items summary badges */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wide">
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
                        <span className="line-through text-stone-500 font-sans">
                          {corr.originalQuote}
                        </span>{' '}
                        <ArrowRight size={11} className="inline mx-1 text-conflict-600" />{' '}
                        <span className="font-bold text-conflict-950 font-sans">
                          {corr.replacementText}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 1: Before & After Diff Preview with highlighted changed time and venue */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide">
                    Visual Change Preview
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Original (v1) with outdated values struck through */}
                    <div>
                      <div className="text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                        <span>Original Text (v{material.version})</span>
                        <span className="text-[10px] text-conflict-700 font-medium bg-conflict-50 px-1.5 py-0.2 rounded border border-conflict-200">
                          Outdated highlighted
                        </span>
                      </div>
                      <div className="text-[14px] sm:text-[15px] font-sans p-3.5 bg-stone-50 rounded-md border border-stone-200 max-h-56 overflow-y-auto whitespace-pre-wrap text-stone-800 leading-relaxed">
                        {renderHighlightedText(
                          material.sourceText || 'Graphic material',
                          generatedCorrections.map((c) => ({ text: c.originalQuote, type: 'remove' }))
                        )}
                      </div>
                    </div>

                    {/* Proposed (v2 Preview) with new official values highlighted */}
                    <div>
                      <div className="text-xs font-semibold text-stone-900 mb-1 flex items-center justify-between">
                        <span>Proposed Preview (v{material.version + 1})</span>
                        <span className="text-[10px] text-current-800 font-medium bg-current-50 px-1.5 py-0.2 rounded border border-current-200">
                          Updated highlighted
                        </span>
                      </div>
                      <div className="text-[14px] sm:text-[15px] font-sans p-3.5 bg-emerald-50/30 rounded-md border border-emerald-200 max-h-56 overflow-y-auto whitespace-pre-wrap text-stone-900 leading-relaxed">
                        {renderHighlightedText(
                          initialSuggestedText,
                          generatedCorrections.map((c) => ({ text: c.replacementText, type: 'add' }))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Editable Draft */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900">
                        Edit corrected draft before saving
                      </span>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Adjust phrasing if needed. The new version will be created from this text:
                      </p>
                    </div>
                    <button
                      onClick={handleCopyText}
                      type="button"
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 px-2.5 py-1 rounded hover:bg-brand-50"
                    >
                      <Copy size={12} />
                      {copiedNotification ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={editableCorrection}
                    onChange={(e) => setEditableCorrection(e.target.value)}
                    className="w-full text-[15px] sm:text-base font-sans p-3.5 bg-white rounded-md border border-stone-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-stone-900 leading-relaxed resize-y"
                  />
                </div>

                {/* Explicit Claim Review Notice */}
                <div className="p-3.5 bg-paper-100 border border-stone-200 rounded-md text-xs text-stone-700 space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand-600" />
                    Explicit Claim Review Required
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Saving Version {material.version + 1} will re-extract claims from the updated text. The new claims will start in a <strong>proposed</strong> state and require your explicit review and confirmation before the material is marked as matching official details.
                  </p>
                </div>

                {/* Section 3: Primary Action */}
                <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-3">
                  <button
                    onClick={handleApplyCorrection}
                    disabled={isApplyingCorrection}
                    type="button"
                    data-testid="save-corrected-btn"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors min-h-[40px]"
                  >
                    <RefreshCw size={14} className={isApplyingCorrection ? 'animate-spin' : ''} />
                    <span>{isApplyingCorrection ? 'Saving Version...' : 'Save corrected version'}</span>
                    <span className="text-brand-200 text-xs font-normal">
                      (Creates v{material.version + 1})
                    </span>
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
              <p className="text-xs text-stone-600 mt-0.5">
                Inspect preserved historical copies from earlier revisions. History is immutable.
              </p>
            </div>

            {/* Preserved Versions Snapshots */}
            <div className="space-y-2.5">
              {materialVersions.length > 0 ? (
                materialVersions.map((v: any) => (
                  <div key={v.$id} className="p-3.5 bg-paper-50 rounded-md border border-stone-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        Version {v.version} {v.version === material.version ? '(Current)' : '(Historical)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedVersionId(expandedVersionId === v.$id ? null : v.$id)}
                        className="text-brand-600 hover:text-brand-800 font-semibold text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50"
                      >
                        {expandedVersionId === v.$id ? 'Hide Source' : 'Inspect Preserved Source'}
                        {expandedVersionId === v.$id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {expandedVersionId === v.$id && (
                      <div className="mt-2.5 p-3.5 bg-white rounded border border-stone-200 text-[14px] font-sans whitespace-pre-wrap text-stone-800 max-h-52 overflow-y-auto leading-relaxed">
                        {v.sourceText || '(Binary file material)'}
                      </div>
                    )}

                    <div className="text-[11px] text-stone-600 mt-1.5 font-mono">
                      Recorded on {new Date(v.createdAt).toLocaleString()}
                      {v.changeNote && ` • ${v.changeNote}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-paper-50 rounded-md border border-stone-200 text-xs text-stone-600">
                  Version 1 is the initial active copy.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MARK SHARED COPY UPDATED */}
        {activeTab === 'external' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Mark Shared Copy Updated
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Track real-world updates on Discord, WhatsApp, or Instagram. Logging an update records an audit event without modifying source text.
              </p>
            </div>

            {externalSuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                Update successfully logged in the audit trail.
              </div>
            )}

            <form onSubmit={handleRecordExternal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Action Taken
                </label>
                <select
                  value={externalAction}
                  onChange={(e) => setExternalAction(e.target.value)}
                  className="w-full text-xs rounded-md border border-stone-300 p-2.5 bg-white text-stone-900"
                >
                  <option value="Posted updated announcement on channel">
                    Posted updated announcement on channel
                  </option>
                  <option value="Pinned correction message">Pinned correction message</option>
                  <option value="Replaced image in social media story">
                    Replaced image in social media story
                  </option>
                  <option value="Reprinted physical handouts">Reprinted physical handouts</option>
                  <option value="Direct message sent to attendees">
                    Direct message sent to attendees
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Organizer Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Sent broadcast message to 120 members on Telegram."
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  className="w-full text-xs font-sans rounded-md border border-stone-300 p-2.5 bg-white text-stone-900"
                />
              </div>

              <button
                type="submit"
                disabled={isRecordingExternal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-2xs transition-colors min-h-[38px]"
              >
                <Send size={13} />
                {isRecordingExternal ? 'Logging...' : 'Record Channel Update'}
              </button>
            </form>

            {/* Past channel updates log */}
            {materialResolutions.length > 0 && (
              <div className="pt-3 border-t border-stone-200">
                <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-2">
                  Channel Update Log ({materialResolutions.length})
                </div>
                <div className="space-y-2">
                  {materialResolutions.map((res) => (
                    <div
                      key={res.$id}
                      className="p-3 bg-paper-50 rounded-md border border-stone-200 text-xs"
                    >
                      <div className="font-semibold text-stone-900">{res.action}</div>
                      {res.note && (
                        <div className="text-stone-700 font-sans mt-0.5">&ldquo;{res.note}&rdquo;</div>
                      )}
                      <div className="text-[10px] text-stone-600 font-mono mt-1">
                        Recorded on {new Date(res.createdAt).toLocaleString()} • For v{res.materialVersion} at Rev {res.eventRevision}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
