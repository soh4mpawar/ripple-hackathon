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
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Edit Official Event Details
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Updating official facts will atomically increment revision from Rev {currentRevision} to Rev {currentRevision + 1}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-brand-600" />
              Event Date
            </label>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="e.g. October 31, 2026"
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Clock size={14} className="text-brand-600" />
              Attendee Start Time
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="e.g. 10:00 AM"
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-brand-600" />
              Official Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Main Auditorium"
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-brand-600" />
              Registration Deadline
            </label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. October 30, 2026, 6:00 PM"
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800">
            <strong>Optimistic locking active:</strong> Ripple uses atomic Appwrite TablesDB transactions to prevent stale edits from silently overwriting newer event revisions.
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
            >
              <Save size={13} />
              {isSubmitting ? 'Committing Transaction...' : 'Commit Atomic Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
