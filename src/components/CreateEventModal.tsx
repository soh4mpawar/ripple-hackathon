'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Clock, MapPin, AlertCircle, Plus } from 'lucide-react';

interface CreateEventModalProps {
  onClose: () => void;
  onSuccess?: (eventId: string) => void;
}

export function CreateEventModal({ onClose, onSuccess }: CreateEventModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [venue, setVenue] = useState('');
  const [deadline, setDeadline] = useState('');

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
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          timezone,
          facts: {
            event_date: eventDate.trim(),
            start_time: startTime.trim(),
            venue: venue.trim(),
            registration_deadline: deadline.trim(),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const { event } = await res.json();
      if (onSuccess) {
        onSuccess(event.$id);
      } else {
        router.push(`/events/${event.$id}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
              Create New Event
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Enter official details. Ripple monitors promotional copy against these facts.
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Event Name
            </label>
            <input
              type="text"
              placeholder="e.g. Annual Campus Hackathon 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Kolkata or America/New_York"
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-stone-500" />
                Event Date
              </label>
              <input
                type="text"
                placeholder="e.g. November 14, 2026"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full text-xs rounded-md border border-stone-300 p-2.5 bg-white"
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
                placeholder="e.g. 10:00 AM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs rounded-md border border-stone-300 p-2.5 bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-stone-500" />
                Venue
              </label>
              <input
                type="text"
                placeholder="e.g. Grand Hall"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full text-xs rounded-md border border-stone-300 p-2.5 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <AlertCircle size={13} className="text-stone-500" />
                Reg Deadline
              </label>
              <input
                type="text"
                placeholder="e.g. Nov 10, 2026, 5:00 PM"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs rounded-md border border-stone-300 p-2.5 bg-white"
                required
              />
            </div>
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
              <Plus size={13} strokeWidth={2.5} />
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
