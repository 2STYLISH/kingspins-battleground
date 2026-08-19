'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAndAnalyzeScreenshot, reanalyzeScreenshot } from '@/lib/actions/games';
import type { ScreenshotExtractionResult } from '@/lib/types';

export default function ScreenshotUploadPanel({
  scheduleId,
  latestExtraction,
  screenshotId,
}: {
  scheduleId: string;
  latestExtraction: ScreenshotExtractionResult | null;
  screenshotId: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) { setError('Select a screenshot file first.'); return; }

    setBusy(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      await uploadAndAnalyzeScreenshot({
        scheduleId,
        fileBase64: base64,
        // Match the extension to the JPEG bytes actually being uploaded.
        fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg',
        // fileToBase64 always re-encodes to JPEG via canvas below, so the
        // bytes we upload are JPEG regardless of the original file type.
        contentType: 'image/jpeg',
      });
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReanalyze() {
    if (!screenshotId) return;
    setBusy(true);
    setError('');
    try {
      await reanalyzeScreenshot(screenshotId);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Re-analyze failed.');
    } finally {
      setBusy(false);
    }
  }

  const confidence = Math.round((latestExtraction?.confidence ?? 0) * 100);
  const aiWorked = (latestExtraction?.confidence ?? 0) > 0;
  const aiErrorMsg: string | undefined = (latestExtraction as any)?._error;

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-display text-lg text-white tracking-widest mb-1">SCREENSHOT</h2>
        <p className="text-xs text-silver-500 leading-relaxed">
          Upload the final box-score screenshot. AI reads it once and pre-fills the stats
          form below — nothing is saved as official until you review, mark DNP players, and verify.
        </p>
      </div>

      {/* File + action row */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer">
          <span className="btn-secondary text-xs px-4 py-2 cursor-pointer inline-block">
            {fileName ? fileName.slice(0, 28) + (fileName.length > 28 ? '…' : '') : 'CHOOSE FILE'}
          </span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
        </label>

        <button onClick={handleUpload} disabled={busy} className="btn-primary text-xs px-4 py-2">
          {busy ? 'WORKING…' : 'UPLOAD & ANALYZE'}
        </button>

        {screenshotId && (
          <button onClick={handleReanalyze} disabled={busy} className="btn-secondary text-xs px-4 py-2">
            RE-ANALYZE
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-surface-700 border border-surface-500 rounded-lg px-4 py-3">
          <p className="text-silver-300 text-sm">{error}</p>
        </div>
      )}

      {/* AI result */}
      {latestExtraction && (
        <div className="border-t border-surface-700 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">AI Extraction</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              aiWorked ? 'text-silver-200 bg-surface-700' : 'text-silver-600 bg-surface-800'
            }`}>
              {confidence}% confidence
            </span>
          </div>

          {!aiWorked ? (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 space-y-3">
              <p className="text-silver-300 text-sm font-medium">AI extraction returned 0% confidence.</p>

              {/* Show exact API error if we have one */}
              {aiErrorMsg && (
                <div className="bg-surface-900 border border-surface-600 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest mb-1">Error from API</p>
                  <p className="text-silver-300 text-xs font-mono break-all">{aiErrorMsg}</p>
                </div>
              )}

              <p className="text-silver-500 text-xs leading-relaxed">Possible causes:</p>
              <ul className="text-silver-500 text-xs space-y-1 list-none">
                <li className="flex gap-2">
                  <span className="text-silver-600">①</span>
                  <span>
                    <strong className="text-silver-400">Wrong or truncated API key</strong> — Copy the full key
                    from{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-white underline">
                      aistudio.google.com/apikey
                    </a>{' '}
                    and paste it into <code className="text-silver-300 bg-surface-700 px-1 rounded">.env</code>{' '}
                    as <code className="text-silver-300 bg-surface-700 px-1 rounded">AI_PROVIDER_API_KEY=</code>.
                    Keys start with <code className="text-silver-300 bg-surface-700 px-1 rounded">AQ.</code> or{' '}
                    <code className="text-silver-300 bg-surface-700 px-1 rounded">AIza</code>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-silver-600">②</span>
                  <span>The screenshot image quality is too low for OCR to read the box score numbers</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-silver-600">③</span>
                  <span>Gemini API quota exceeded or the model name in{' '}
                    <code className="text-silver-300 bg-surface-700 px-1 rounded">.env</code> is incorrect
                    (currently set to <code className="text-silver-300 bg-surface-700 px-1 rounded">gemini-3.6-flash</code>)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-silver-600">④</span>
                  <span>
                    <strong className="text-silver-400">Location blocked</strong> — If you see "User location is not supported", set <code className="text-silver-300 bg-surface-700 px-1 rounded">AI_PROVIDER_BASE_URL=</code> in <code className="text-silver-300 bg-surface-700 px-1 rounded">.env</code> to a proxy URL.
                  </span>
                </li>
              </ul>
              <p className="text-silver-600 text-xs pt-1">
                You can still enter stats manually in the form below.
              </p>
            </div>
          ) : (
            <p className="text-silver-400 text-sm">
              ✓ Extracted{' '}
              <span className="text-white font-mono">{latestExtraction.players?.length ?? 0}</span>{' '}
              player lines. Review and correct in the form below — mark DNP for players who didn't play.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions for OCR is generally fine at 1920x1080
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available.'));
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}
