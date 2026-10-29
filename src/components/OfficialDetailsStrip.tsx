'use client';

import React from 'react';
import { Calendar, Clock, MapPin, AlertCircle, Edit3, Sparkles } from 'lucide-react';
import { FactRow } from '@/lib/server/tables-db';

interface OfficialDetailsStripProps {
  facts: FactRow[];
  timezone: string;
  currentRevision: number;
  onEditClick: () => void;
  onDemoChangeClick: () => void;
}

export function OfficialDetailsStrip({
  facts,
  timezone,
  currentRevision,
  onEditClick,
  onDemoChangeClick,
}: OfficialDetailsStripProps) {
  const factMap = new Map(facts.map((f) => [f.field, f.displayValue]));

  const eventDate = factMap.get('event_date') || 'Not set';
  const startTime = factMap.get('start_time') || 'Not set';
  const venue = factMap.get('venue') || 'Not set';
  const deadline = factMap.get('registration_deadline') || 'Not set';

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden mb-8">
      {/* Top action row */}
      <div className="px-6 py-4 bg-warm-100/60 border-b border-stone-200/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Official Source of Truth
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Revision {currentRevision}
          </span>
          <span className="text-xs text-stone-600 bg-stone-100/80 px-2 py-0.5 rounded-md font-mono">
            {timezone}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onDemoChangeClick}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors shadow-sm"
            title="Simulate Venue & Time change for demonstration"
          >
            <Sparkles size={14} className="text-amber-600" />
            Simulate Official Change
          </button>

          <button
            onClick={onEditClick}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 hover:border-stone-400 transition-colors shadow-sm"
          >
            <Edit3 size={13} className="text-stone-500" />
            Edit Official Details
          </button>
        </div>
      </div>

      {/* 4 canonical values grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/80">
        {/* Date */}
        <div className="p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-medium text-stone-600 uppercase tracking-wide">
              Event Date
            </span>
            <span className="block text-base font-semibold text-stone-900 mt-0.5 truncate" title={eventDate}>
              {eventDate}
            </span>
            <span className="block text-xs text-stone-600 mt-0.5 font-mono">
              All materials must match
            </span>
          </div>
        </div>

        {/* Start Time */}
        <div className="p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-medium text-stone-600 uppercase tracking-wide">
              Start Time
            </span>
            <span className="block text-base font-semibold text-stone-900 mt-0.5 truncate" title={startTime}>
              {startTime}
            </span>
            <span className="block text-xs text-stone-600 mt-0.5 font-mono">
              Attendee start time
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-medium text-stone-600 uppercase tracking-wide">
              Venue
            </span>
            <span className="block text-base font-semibold text-stone-900 mt-0.5 truncate" title={venue}>
              {venue}
            </span>
            <span className="block text-xs text-stone-600 mt-0.5 font-mono">
              Official building / hall
            </span>
          </div>
        </div>

        {/* Registration Deadline */}
        <div className="p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-medium text-stone-600 uppercase tracking-wide">
              Registration Deadline
            </span>
            <span className="block text-base font-semibold text-stone-900 mt-0.5 truncate" title={deadline}>
              {deadline}
            </span>
            <span className="block text-xs text-stone-600 mt-0.5 font-mono">
              Hard RSVP cut-off
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
