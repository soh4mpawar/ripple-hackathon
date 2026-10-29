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
  ShieldCheck,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
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
    <div className="min-h-screen bg-warm-50 flex flex-col selection:bg-brand-100 selection:text-brand-900">
      <Navbar
        user={user}
        onNewEventClick={user ? () => setIsCreateOpen(true) : undefined}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            Built for the Appwrite Databases Hackathon
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            “Your venue changed.{' '}
            <span className="text-brand-600 underline decoration-brand-300 underline-offset-4">
              Your poster didn&apos;t.
            </span>{' '}
            Ripple finds what needs fixing.”
          </h1>

          <p className="mt-5 text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto">
            College club organizers manage announcements, posters, and volunteer instructions
            across dozens of channels. When an official detail shifts, Ripple connects facts to
            materials in Appwrite TablesDB and highlights exactly what became outdated.
          </p>

          {demoError && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left max-w-md mx-auto">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                Appwrite Connection Notice
              </div>
              <p>{demoError}</p>
              <p className="mt-2 text-[11px] text-amber-700">
                To test live with your Appwrite project, configure <code>.env.local</code> and run{' '}
                <code>node scripts/setup-appwrite.mjs</code>.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleTrySample}
              disabled={isDemoLoading}
              type="button"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Sparkles size={16} className={isDemoLoading ? 'animate-spin' : ''} />
              {isDemoLoading ? 'Preparing Sample Event...' : 'Try Sample Event: Campus Build Night'}
              <ArrowRight size={15} />
            </button>

            {user ? (
              <button
                onClick={() => setIsCreateOpen(true)}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-sm shadow-xs transition-colors"
              >
                <Plus size={15} />
                Create New Event
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-sm shadow-xs transition-colors"
              >
                Sign In / Register
              </Link>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-current-600" />
              Isolated demo session
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-current-600" />
              Real database rows
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-current-600" />
              No signup required
            </span>
          </div>
        </div>

        {/* Existing Events for Authenticated User */}
        {user && events.length > 0 && (
          <div className="max-w-4xl mx-auto mb-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Your Events ({events.length})
              </h2>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus size={13} />
                New Event
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map((ev) => (
                <Link
                  key={ev.$id}
                  href={`/events/${ev.$id}`}
                  className="p-5 rounded-2xl border border-stone-200/90 bg-white hover:border-brand-500 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                        Revision {ev.currentRevision}
                      </span>
                      <span className="text-xs text-stone-600 font-mono">
                        {ev.timezone}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-brand-700 transition-colors">
                      {ev.name}
                    </h3>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <span>Created {new Date(ev.createdAt).toLocaleDateString()}</span>
                    <span className="text-brand-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open Workspace <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-6 border-t border-stone-200/60">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4">
              <Layers size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1.5">
              1. Extract & Confirm Claims
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Upload poster screenshots or paste announcement copy. Multimodal extraction identifies
              date, start time, venue, and registration deadline claims for organizer confirmation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1.5">
              2. Atomic Revision Tracking
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              When official details change, Appwrite TablesDB transactions atomically bump the
              revision and log changes with optimistic locking, preventing stale edits.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-sm font-bold text-stone-900 mb-1.5">
              3. Visual Impact Map & Fixes
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              The dependency graph connects canonical facts to affected materials. Review side-by-side
              corrected copy, produce Version 2, and record external channel acknowledgments.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 py-8 bg-white/60 text-center text-xs text-stone-500">
        <p>
          Ripple — Built with Next.js, Appwrite TablesDB, Appwrite Auth, Storage & Multimodal AI.
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
