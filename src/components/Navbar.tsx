'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, User } from 'lucide-react';
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
    <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12c3-4 6-4 9 0 3 4 6 4 9 0" />
              <path d="M2 17c3-3 6-3 9 0 3 3 6 3 9 0" />
              <path d="M2 7c3-3 6-3 9 0 3 3 6 3 9 0" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-stone-900 group-hover:text-brand-700 transition-colors">
              Ripple
            </span>
            <span className="hidden sm:inline-block text-[11px] font-medium text-stone-500">
              Event Operations
            </span>
          </div>
        </Link>

        {/* Action controls */}
        <div className="flex items-center gap-2.5">
          {onTrySampleClick && (
            <button
              onClick={onTrySampleClick}
              type="button"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-md bg-stone-100 text-stone-800 border border-stone-200 hover:bg-stone-200/70 transition-colors"
            >
              Try the live demo
            </button>
          )}

          {onNewEventClick && (
            <button
              onClick={onNewEventClick}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-2xs"
            >
              <Plus size={13} strokeWidth={2.5} />
              New Event
            </button>
          )}

          {/* User profile / session state */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                <span className="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
                  <User size={12} />
                </span>
                <span className="hidden md:inline-block max-w-[130px] truncate text-stone-800 font-medium text-[11px]">
                  {user.name}
                  {user.isAnonymous && ' (Demo)'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                type="button"
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-100 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-md border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
