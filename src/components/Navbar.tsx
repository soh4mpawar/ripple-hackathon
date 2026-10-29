'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, LogOut, User } from 'lucide-react';
import { AuthUser } from '@/lib/server/appwrite';

interface NavbarProps {
  user?: AuthUser | null;
  onNewEventClick?: () => void;
  onTrySampleClick?: () => void;
}

export function Navbar({ user, onNewEventClick, onTrySampleClick }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20 group-hover:bg-brand-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12c3-4 6-4 9 0 3 4 6 4 9 0" />
              <path d="M2 17c3-3 6-3 9 0 3 3 6 3 9 0" />
              <path d="M2 7c3-3 6-3 9 0 3 3 6 3 9 0" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-stone-900 group-hover:text-brand-700 transition-colors">
              Ripple
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
              Appwrite TablesDB
            </span>
          </div>
        </Link>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          {onTrySampleClick && (
            <button
              onClick={onTrySampleClick}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <Sparkles size={13} className="text-amber-600" />
              Try Sample Event
            </button>
          )}

          {onNewEventClick && (
            <button
              onClick={onNewEventClick}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              New Event
            </button>
          )}

          {/* User profile / session state */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                <span className="w-7 h-7 rounded-full bg-warm-200 flex items-center justify-center text-stone-700 border border-stone-300">
                  <User size={13} />
                </span>
                <span className="hidden md:inline-block max-w-[120px] truncate">
                  {user.name}
                  {user.isAnonymous && ' (Demo)'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                type="button"
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
