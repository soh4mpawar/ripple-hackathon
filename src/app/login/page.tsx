'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Sparkles, ArrowRight, Lock, Mail, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTryDemo() {
    setIsDemoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize demo session');
      }
      router.push(`/events/${data.eventId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo. Please verify Appwrite credentials in .env.local');
      setIsDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-stone-200">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              {mode === 'login' ? 'Organizer Sign In' : 'Create Organizer Account'}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access your tracked event materials'
                : 'Manage outdated materials with Appwrite TablesDB'}
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-300 p-2.5 pl-9 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-stone-400" />
                <input
                  type="email"
                  placeholder="organizer@club.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 pl-9 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-stone-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full text-xs rounded-xl border border-stone-300 p-2.5 pl-9 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  required
                />
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Minimum 8 characters (Appwrite Auth)
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors mt-2"
            >
              {isSubmitting
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to Dashboard'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-stone-500">
            {mode === 'login' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Register
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-600 font-medium">Or</span>
            </div>
          </div>

          {/* Quick Demo Access */}
          <button
            onClick={handleTryDemo}
            disabled={isDemoLoading}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles size={14} className={isDemoLoading ? 'animate-spin text-amber-600' : 'text-amber-600'} />
            {isDemoLoading ? 'Launching Demo...' : 'Try Demo Without Signing Up'}
          </button>
        </div>
      </main>
    </div>
  );
}
