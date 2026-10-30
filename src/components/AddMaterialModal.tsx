'use client';

import React, { useState } from 'react';
import { X, FileText, Image as ImageIcon, UploadCloud } from 'lucide-react';

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

      setIsSubmitting(false);
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
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
              Add Event Material
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Add an announcement or poster to monitor against official details.
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
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Kind selector tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKind('text')}
              className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition-colors ${
                kind === 'text'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
              }`}
            >
              <FileText size={16} className={kind === 'text' ? 'text-brand-600' : 'text-stone-400'} />
              <div>
                <div className="text-xs font-semibold">Pasted Text</div>
                <div className="text-[11px] text-stone-500">Group chat or email copy</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKind('image')}
              className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition-colors ${
                kind === 'image'
                  ? 'border-brand-600 bg-brand-50/50 text-brand-900'
                  : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
              }`}
            >
              <ImageIcon size={16} className={kind === 'image' ? 'text-brand-600' : 'text-stone-400'} />
              <div>
                <div className="text-xs font-semibold">Poster Graphic</div>
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
              placeholder="e.g. Discord Announcement or Instagram Story"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-md border border-stone-300 p-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          {kind === 'text' ? (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Announcement Content
              </label>
              <textarea
                rows={5}
                placeholder="Paste announcement text, volunteer instructions, or email draft..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="w-full text-[15px] font-sans rounded-md border border-stone-300 p-3 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white leading-relaxed text-stone-900"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Ripple extracts claims (dates, times, venues) for your explicit review.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Upload Poster Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-md hover:border-brand-400 transition-colors bg-stone-50/50">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-7 w-7 text-stone-400" />
                  <div className="flex text-xs text-stone-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer font-semibold text-brand-600 hover:text-brand-700 focus-within:outline-hidden"
                    >
                      <span>Select an image file</span>
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
                  <p className="text-[11px] text-stone-500">
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
              className="px-4 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors"
            >
              {isSubmitting ? 'Analyzing & Extracting...' : 'Add Material & Extract Claims'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
