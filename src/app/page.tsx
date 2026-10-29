'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { CreateEventModal } from '@/components/CreateEventModal';
import { AuthUser } from '@/lib/server/appwrite';
import { EventRow } from '@/lib/server/tables-db';
import {
  Sparkles,
  Plus,
  ArrowRight,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const { user } = await authRes.json();
          setUser(user);
          if (user) {
            const eventsRes = await fetch('/api/events');
            if (eventsRes.ok) {
              const { events } = await eventsRes.json();
              setEvents(events || []);
            }
          }
        }
      } catch (err) {
        console.error('Home init error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handleTrySample() {
    setIsDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize sample demo');
      }
      router.push(`/events/${data.eventId}`);
    } catch (err: any) {
      setDemoError(err.message || 'Could not load demo. Please verify Appwrite credentials.');
      setIsDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col selection:bg-brand-100 selection:text-brand-900 text-stone-900">
      <Navbar
        user={user}
        onNewEventClick={user ? () => setIsCreateOpen(true) : undefined}
      />

      {/* Quick Resume Strip for Authenticated Users */}
      {user && events.length > 0 && (
        <div className="bg-paper-100 border-b border-stone-200 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-800">Quick Resume:</span>
              <div className="flex flex-wrap items-center gap-2">
                {events.slice(0, 3).map((ev) => (
                  <Link
                    key={ev.$id}
                    href={`/events/${ev.$id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-800 hover:border-brand-500 hover:text-brand-700 transition-colors"
                  >
                    <span className="font-medium truncate max-w-[160px]">{ev.name}</span>
                    <span className="font-mono text-[11px] text-stone-500">r{ev.currentRevision}</span>
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 text-[11px]"
            >
              <Plus size={12} />
              New Event
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Composed Two-Column Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-16 md:mb-24">
          {/* Left Column: Headline, Explanation & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-semibold tracking-wide uppercase">
              Event Operations Workspace
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 tracking-tight leading-[1.15]">
              One change.{' '}
              <span className="text-brand-600">
                Find every outdated announcement.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-700 leading-relaxed max-w-xl">
              When an official venue, time, or deadline shifts, your posters, group chats,
              and volunteer notes don’t fix themselves. Ripple tracks what was shared across every
              channel and pinpoints exactly what became outdated.
            </p>

            {demoError && (
              <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  Appwrite Connection Notice
                </div>
                <p>{demoError}</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Verify Appwrite credentials in <code>.env.local</code>.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleTrySample}
                disabled={isDemoLoading}
                type="button"
                data-testid="try-demo-btn"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-2xs transition-colors"
              >
                <Sparkles size={16} className={isDemoLoading ? 'animate-spin' : ''} />
                <span>
                  {isDemoLoading ? 'Preparing Sample Event...' : 'Try the live demo'}
                </span>
                <span className="text-brand-200 text-xs font-normal">
                  (Campus Build Night)
                </span>
                <ArrowRight size={15} />
              </button>

              {user ? (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-sm transition-colors"
                >
                  <Plus size={15} />
                  Create an event
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-md bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-sm transition-colors"
                >
                  Create an event
                </Link>
              )}
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-y-1 gap-x-5 text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-current-600 stroke-2" />
                Isolated demo session
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-current-600 stroke-2" />
                Live Appwrite TablesDB rows
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-current-600 stroke-2" />
                No login required to try
              </span>
            </div>
          </div>

          {/* Right Column: Illustrative Preview */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-2xs relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                  <span className="text-xs font-semibold text-stone-900 uppercase tracking-wide">
                    See what needs updating
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium">
                  Example
                </span>
              </div>

              {/* Official Change Node */}
              <div className="bg-paper-100 border border-stone-200 rounded-md p-3 mb-4">
                <div className="text-[10px] font-semibold text-stone-600 uppercase tracking-wide mb-1">
                  Official Details Shift · Revision 2
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-400 line-through mr-2">Main Auditorium</span>
                    <span className="font-bold text-brand-700">Innovation Lab</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-600">11:00 AM</span>
                </div>
              </div>

              {/* Connected Announcements: exactly 4 Outdated displayed matching the 4 Need Updates count */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-stone-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Connected Materials (5)</span>
                  <span className="text-conflict-600 font-bold">4 Need Updates</span>
                </div>

                {/* 1. WhatsApp Announcement (Outdated) */}
                <div className="flex items-center justify-between p-2.5 rounded border border-conflict-200 bg-conflict-50/50 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-stone-600 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      WhatsApp Announcement
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-conflict-700 bg-conflict-100 px-2 py-0.5 rounded">
                    <AlertCircle size={11} /> Outdated
                  </span>
                </div>

                {/* 2. Campus Poster Graphic (Outdated) */}
                <div className="flex items-center justify-between p-2.5 rounded border border-conflict-200 bg-conflict-50/50 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={14} className="text-stone-600 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      Campus Poster Graphic
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-conflict-700 bg-conflict-100 px-2 py-0.5 rounded">
                    <AlertCircle size={11} /> Outdated
                  </span>
                </div>

                {/* 3. Volunteer Briefing Notes (Outdated) */}
                <div className="flex items-center justify-between p-2.5 rounded border border-conflict-200 bg-conflict-50/50 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-stone-600 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      Volunteer Briefing Notes
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-conflict-700 bg-conflict-100 px-2 py-0.5 rounded">
                    <AlertCircle size={11} /> Outdated
                  </span>
                </div>

                {/* 4. Schedule Excerpt Card (Outdated) */}
                <div className="flex items-center justify-between p-2.5 rounded border border-conflict-200 bg-conflict-50/50 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-stone-600 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      Schedule Excerpt Card
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-conflict-700 bg-conflict-100 px-2 py-0.5 rounded">
                    <AlertCircle size={11} /> Outdated
                  </span>
                </div>

                {/* 5. Registration Reminder (Matches official details - green example) */}
                <div className="flex items-center justify-between p-2.5 rounded border border-current-200 bg-current-50/40 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-stone-600 shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                      Registration Reminder
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-current-700 bg-current-100 px-2 py-0.5 rounded">
                    <Check size={11} strokeWidth={2.5} /> Matches official details
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-600 leading-snug">
                Ripple checks the materials you add against your official details. When a detail shifts, outdated materials are flagged immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Existing Events for Authenticated User (Full Section) */}
        {user && events.length > 0 && (
          <div className="mb-16 md:mb-20">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200">
              <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Your Events ({events.length})
              </h2>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus size={13} />
                Create Event
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => (
                <Link
                  key={ev.$id}
                  href={`/events/${ev.$id}`}
                  className="p-4 rounded-lg border border-stone-200 bg-white hover:border-brand-500 transition-colors group flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-800">
                        Revision {ev.currentRevision}
                      </span>
                      <span className="text-[11px] text-stone-600 font-mono">
                        {ev.timezone}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-brand-700 transition-colors">
                      {ev.name}
                    </h3>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <span>Created {new Date(ev.createdAt).toLocaleDateString()}</span>
                    <span className="text-brand-600 font-semibold flex items-center gap-1 text-[11px]">
                      Open Workspace <ArrowRight size={11} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3-Step Walkthrough Section */}
        <div className="pt-10 border-t border-stone-200">
          <div className="max-w-2xl mb-8">
            <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide mb-1">
              How Ripple Works
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              Keep every announcement in sync
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-5 rounded-lg bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-brand-600 mb-2 tracking-wide">
                  01 / COLLECT
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-2">
                  Add Announcements & Posters
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Paste group announcement drafts, volunteer instructions, or upload poster graphics.
                  Ripple extracts dates, times, venues, and deadlines for your explicit confirmation.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-stone-100 text-[11px] text-stone-600 font-medium">
                Organizer-Confirmed Claims
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-lg bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-brand-600 mb-2 tracking-wide">
                  02 / CHANGE
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-2">
                  Update Official Details Once
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  When logistics shift, update your official details in one central place.
                  Ripple automatically re-checks every confirmed claim against the newly updated details.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-stone-100 text-[11px] text-stone-600 font-medium">
                Instant Detail Comparison
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-lg bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-brand-600 mb-2 tracking-wide">
                  03 / REVIEW
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-2">
                  Inspect & Apply Corrections
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  See outdated materials highlighted immediately. Inspect verbatim evidence quotes,
                  review suggested text corrections, and save updated versions with full audit history.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-stone-100 text-[11px] text-stone-600 font-medium">
                Verbatim Evidence Inspection
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 bg-white text-center text-xs text-stone-600">
        <p>
          Ripple — Built with Next.js, Appwrite TablesDB, Appwrite Auth & Storage.
        </p>
      </footer>

      {isCreateOpen && (
        <CreateEventModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(id) => router.push(`/events/${id}`)}
        />
      )}
    </div>
  );
}
