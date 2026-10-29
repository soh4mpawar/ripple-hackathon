'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, AlertCircle, Save } from 'lucide-react';
import { FactRow } from '@/lib/server/tables-db';

interface EditOfficialModalProps {
  eventId: string;
  currentRevision: number;
  facts: FactRow[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditOfficialModal({
  eventId,
  currentRevision,
  facts,
  onClose,
  onSuccess,
}: EditOfficialModalProps) {
  const factMap = new Map(facts.map((f) => [f.field, f.displayValue]));

  const [eventDate, setEventDate] = useState(factMap.get('event_date') || '');
  const [startTime, setStartTime] = useState(factMap.get('start_time') || '');
  const [venue, setVenue] = useState(factMap.get('venue') || '');
  const [deadline, setDeadline] = useState(factMap.get('registration_deadline') || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/official`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: currentRevision,
          updatedFields: {
            event_date: eventDate.trim(),
            start_time: startTime.trim(),
            venue: venue.trim(),
            registration_deadline: deadline.trim(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update official details');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during update');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-lg border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-paper-100">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Edit Official Details
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Updating details will atomically increment revision from Rev {currentRevision} to Rev {currentRevision + 1}.
            </p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Calendar size={13} className="text-stone-500" />
              Event Date
            </label>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="e.g. October 31, 2026"
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Clock size={13} className="text-stone-500" />
              Start Time
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="e.g. 10:00 AM"
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-stone-500" />
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Main Auditorium"
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-stone-500" />
              Registration Deadline
            </label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. October 30, 2026, 6:00 PM"
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-md text-[11px] text-stone-600">
            <strong className="text-stone-800">Optimistic Locking:</strong> Transactions check current revision before applying updates, guaranteeing stale edits cannot overwrite newer event states.
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors"
            >
              <Save size={13} />
              {isSubmitting ? 'Committing...' : 'Save Official Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
