'use client';

import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FactRow } from '@/lib/server/tables-db';

interface DemoChangeModalProps {
  eventId: string;
  currentRevision: number;
  facts: FactRow[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DemoChangeModal({
  eventId,
  currentRevision,
  facts,
  onClose,
  onSuccess,
}: DemoChangeModalProps) {
  const factMap = new Map(facts.map((f) => [f.field, f.displayValue]));
  const currentVenue = factMap.get('venue') || 'Main Auditorium';
  const currentStartTime = factMap.get('start_time') || '10:00 AM';

  const proposedVenue = 'Innovation Lab';
  const proposedStartTime = '11:00 AM';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleConfirmChange() {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/official`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: currentRevision,
          updatedFields: {
            venue: proposedVenue,
            start_time: proposedStartTime,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply demo change');
      }

      setIsSubmitting(false);
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-lg border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-paper-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                Demo Scenario
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs font-mono text-stone-500">Venue & Start Time Shift</span>
            </div>
            <h3 className="text-base font-bold text-stone-900 mt-0.5">
              Simulate Official Change
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-200 transition-colors"
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <p className="text-xs text-stone-600 leading-relaxed">
            The facility coordinator just reassigned your event room and delayed the start.
            Ripple will commit this change atomically to Appwrite TablesDB and evaluate all tracked materials.
          </p>

          {/* Change Comparison */}
          <div className="space-y-2.5">
            {/* Venue Change */}
            <div className="p-3 rounded-md border border-stone-200 bg-paper-50 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-stone-500 uppercase tracking-wide block text-[10px]">
                  Venue Reassignment
                </span>
                <span className="line-through text-stone-400 font-medium">
                  {currentVenue}
                </span>
              </div>
              <ArrowRight size={14} className="text-stone-400 shrink-0 mx-2" />
              <div className="text-right">
                <span className="font-semibold text-brand-700 uppercase tracking-wide block text-[10px]">
                  New Official Venue
                </span>
                <span className="font-bold text-stone-900 font-mono text-sm">
                  {proposedVenue}
                </span>
              </div>
            </div>

            {/* Start Time Change */}
            <div className="p-3 rounded-md border border-stone-200 bg-paper-50 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-stone-500 uppercase tracking-wide block text-[10px]">
                  Start Time Shift
                </span>
                <span className="line-through text-stone-400 font-medium">
                  {currentStartTime}
                </span>
              </div>
              <ArrowRight size={14} className="text-stone-400 shrink-0 mx-2" />
              <div className="text-right">
                <span className="font-semibold text-brand-700 uppercase tracking-wide block text-[10px]">
                  New Start Time
                </span>
                <span className="font-bold text-stone-900 font-mono text-sm">
                  {proposedStartTime}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-md border border-stone-200 text-xs text-stone-600 space-y-1.5">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5 text-xs">
              <CheckCircle2 size={13} className="text-brand-600" />
              Expected outcome after atomic TablesDB commit:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-600">
              <li>Revision will atomically advance from Rev {currentRevision} to Rev {currentRevision + 1}.</li>
              <li>Main Poster Copy, WhatsApp Group Announcement, Volunteer Instructions Handout, and Schedule Excerpt Handout will become Outdated.</li>
              <li>Discord Registration Reminder remains unaffected and current.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 rounded-md border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChange}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors"
            >
              {isSubmitting ? 'Committing...' : 'Confirm & Commit Demo Change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
