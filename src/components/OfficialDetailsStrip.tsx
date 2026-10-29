'use client';

import React from 'react';
import { Calendar, Clock, MapPin, AlertCircle, Edit2, Play } from 'lucide-react';
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
    <div className="bg-white border border-stone-200 rounded-lg shadow-2xs overflow-hidden mb-6">
      {/* Top action row */}
      <div className="px-4 py-2.5 bg-paper-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-stone-900 tracking-tight text-[11px] uppercase">
            Official Details
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-600 font-mono text-[11px]">
            {currentRevision === 1 ? 'Initial Details · Version 1' : `Updated Details · Version ${currentRevision}`}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500 font-mono text-[11px]">
            {timezone}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDemoChangeClick}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200/80 transition-colors"
            title="Simulate venue and time change for demonstration"
          >
            <Play size={10} className="text-brand-600 fill-brand-600" />
            Simulate venue & time shift
          </button>

          <button
            onClick={onEditClick}
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <Edit2 size={11} className="text-stone-500" />
            Edit details
          </button>
        </div>
      </div>

      {/* 4 information cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 text-xs">
        {/* Date */}
        <div className="p-3.5 flex items-start gap-2.5">
          <Calendar size={14} className="text-stone-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
              Date
            </span>
            <span className="block text-sm font-semibold text-stone-900 mt-0.5 truncate" title={eventDate}>
              {eventDate}
            </span>
          </div>
        </div>

        {/* Start Time */}
        <div className="p-3.5 flex items-start gap-2.5">
          <Clock size={14} className="text-stone-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
              Start Time
            </span>
            <span className="block text-sm font-semibold text-stone-900 mt-0.5 truncate" title={startTime}>
              {startTime}
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="p-3.5 flex items-start gap-2.5">
          <MapPin size={14} className="text-stone-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
              Venue
            </span>
            <span className="block text-sm font-semibold text-stone-900 mt-0.5 truncate" title={venue}>
              {venue}
            </span>
          </div>
        </div>

        {/* Registration Deadline */}
        <div className="p-3.5 flex items-start gap-2.5">
          <AlertCircle size={14} className="text-stone-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide">
              Registration Deadline
            </span>
            <span className="block text-sm font-semibold text-stone-900 mt-0.5 truncate" title={deadline}>
              {deadline}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
