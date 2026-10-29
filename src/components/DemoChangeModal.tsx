'use client';

import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Simulate Official Change
              </h3>
              <p className="text-xs text-stone-500">
                Hackathon Demo Scenario: Venue & Time Shift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="text-xs text-stone-600 leading-relaxed">
            The facility coordinator just reassigned your event. Ripple will update the official facts in TablesDB and recompute all connected materials in real-time.
          </div>

          {/* Change Comparison Cards */}
          <div className="space-y-3">
            {/* Venue Change */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-stone-500 uppercase tracking-wide block text-[10px]">
                  Venue Reassignment
                </span>
                <span className="line-through text-stone-600 font-medium">
                  {currentVenue}
                </span>
              </div>
              <ArrowRight size={16} className="text-amber-600 shrink-0" />
              <div className="text-right">
                <span className="font-bold text-stone-500 uppercase tracking-wide block text-[10px]">
                  New Venue
                </span>
                <span className="font-bold text-amber-950 font-mono text-sm">
                  {proposedVenue}
                </span>
              </div>
            </div>

            {/* Start Time Change */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-stone-500 uppercase tracking-wide block text-[10px]">
                  Start Time Delay
                </span>
                <span className="line-through text-stone-600 font-medium">
                  {currentStartTime}
                </span>
              </div>
              <ArrowRight size={16} className="text-amber-600 shrink-0" />
              <div className="text-right">
                <span className="font-bold text-stone-500 uppercase tracking-wide block text-[10px]">
                  New Start Time
                </span>
                <span className="font-bold text-amber-950 font-mono text-sm">
                  {proposedStartTime}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
            <div className="font-bold text-stone-800 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-brand-600" />
              What to expect after confirmation:
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-stone-600">
              <li>Revision will increment from Rev {currentRevision} to Rev {currentRevision + 1}.</li>
              <li>Main Poster, WhatsApp announcement, Volunteer Instructions Handout, and Schedule Excerpt Handout will flag conflicts.</li>
              <li>Registration deadline reminder will remain current (unaffected).</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChange}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              {isSubmitting ? 'Committing...' : 'Confirm & Commit Demo Change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
