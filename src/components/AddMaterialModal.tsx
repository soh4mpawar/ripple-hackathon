'use client';

import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, UploadCloud, Sparkles } from 'lucide-react';

interface AddMaterialModalProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddMaterialModal({ eventId, onClose, onSuccess }: AddMaterialModalProps) {
  const [kind, setKind] = useState<'text' | 'image'>('text');
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

    if (!title.trim()) {
      setError('Please provide a title for the material.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (kind === 'text') {
        if (!sourceText.trim()) {
          setError('Please paste the announcement text.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(`/api/events/${eventId}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            sourceText: sourceText.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add material');
        }
      } else {
        if (!selectedFile) {
          setError('Please select an image file (PNG or JPEG).');
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('file', selectedFile);

        const res = await fetch(`/api/events/${eventId}/materials`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to upload image material');
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <Sparkles size={18} />
            </span>
            <h3 className="text-base font-bold text-stone-900">
              Add Event Material
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Kind selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKind('text')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                kind === 'text'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700'
              }`}
            >
              <FileText size={18} className={kind === 'text' ? 'text-brand-600' : 'text-stone-400'} />
              <div>
                <div className="text-xs font-bold">Pasted Text</div>
                <div className="text-[11px] text-stone-500">Announcement or email copy</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKind('image')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                kind === 'image'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700'
              }`}
            >
              <ImageIcon size={18} className={kind === 'image' ? 'text-brand-600' : 'text-stone-400'} />
              <div>
                <div className="text-xs font-bold">Poster Graphic</div>
                <div className="text-[11px] text-stone-500">PNG or JPEG screenshot</div>
              </div>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Material Title / Label
            </label>
            <input
              type="text"
              placeholder="e.g. Instagram Story Announcement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          {kind === 'text' ? (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Announcement Content
              </label>
              <textarea
                rows={6}
                placeholder="Paste your announcement, email snippet, or volunteer handout text..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-300 p-3 font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Ripple will extract factual claims (dates, times, venues) for your review.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Upload Poster Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-xl hover:border-brand-400 transition-colors bg-stone-50/50">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-8 w-8 text-stone-400" />
                  <div className="flex text-xs text-stone-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer font-semibold text-brand-600 hover:text-brand-500 focus-within:outline-hidden"
                    >
                      <span>Select a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                        }}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    {selectedFile ? (
                      <span className="font-semibold text-stone-900">{selectedFile.name}</span>
                    ) : (
                      'PNG, JPG up to 10MB'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
            >
              {isSubmitting ? 'Analyzing & Extracting...' : 'Add Material & Extract Claims'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
