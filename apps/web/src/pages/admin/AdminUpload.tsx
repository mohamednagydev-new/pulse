import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Upload, Copy, Check } from 'lucide-react';
import { getAccessToken } from '../../lib/api';

/** Upload Canva-exported MP4s and images; returns IDs/URLs to paste into content. */
export default function AdminUpload() {
  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Media Upload</h1>
      </header>
      <div className="space-y-4 p-4">
        <Uploader kind="video" endpoint="/api/admin/upload/video" accept="video/*" resultKey="id" hint="MP4 (Canva export). Returns a Video ID — paste into a Lesson's 'Video ID'." />
        <Uploader kind="image" endpoint="/api/admin/upload/image" accept="image/jpeg,image/png,image/webp,image/gif" resultKey="path" hint="JPG, PNG, WEBP or GIF. Returns an image path — paste into a cover/avatar/image field." />
      </div>
    </div>
  );
}

function Uploader({ kind, endpoint, accept, resultKey, hint }: { kind: string; endpoint: string; accept: string; resultKey: string; hint: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      const data = await res.json();
      setResult(String(data[resultKey]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-bold capitalize">{kind}</h2>
      <p className="mb-3 text-xs text-gray-400">{hint}</p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-6 text-gray-500">
        <Upload size={18} /> {busy ? 'Uploading…' : `Choose ${kind}`}
        <input type="file" accept={accept} className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
          <code className="flex-1 truncate text-sm">{result}</code>
          <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check size={16} className="text-brand-green" /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
