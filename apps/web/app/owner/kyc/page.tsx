'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface MyPlot {
  id: string;
  allotments: {
    ownerShares: { person: { id: string; fullName: string } | null }[];
  }[];
}

interface Submission {
  id: string;
  status: string;
  panMasked: string | null;
  aadhaarLast4: string | null;
  submittedAt: string;
  rejectionReason: string | null;
}

export default function OwnerKycPage() {
  const qc = useQueryClient();
  const plotsQ = useQuery({
    queryKey: ['me', 'plots'],
    queryFn: () => api.get<MyPlot[]>('/me/plots'),
  });

  // Pick the first person row that belongs to this user from any active allotment
  const personId =
    plotsQ.data?.flatMap((p) => p.allotments.flatMap((a) => a.ownerShares))?.find(
      (s) => !!s.person,
    )?.person?.id ?? null;

  const subsQ = useQuery({
    queryKey: ['kyc', personId],
    enabled: !!personId,
    queryFn: () => api.get<Submission[]>(`/persons/${personId}/kyc`),
  });

  const [pan, setPan] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!personId) throw new Error('No person record found');
      let panDocKey: string | undefined;
      let aadhaarDocKey: string | undefined;
      if (panFile) panDocKey = await uploadKycFile(personId, panFile);
      if (aadhaarFile) aadhaarDocKey = await uploadKycFile(personId, aadhaarFile);
      return api.post('/kyc/submissions', {
        personId,
        pan: pan || undefined,
        aadhaarLast4: aadhaarLast4 || undefined,
        panDocKey,
        aadhaarDocKey,
      });
    },
    onSuccess: () => {
      setPan('');
      setAadhaarLast4('');
      setPanFile(null);
      setAadhaarFile(null);
      qc.invalidateQueries({ queryKey: ['kyc'] });
    },
    onError: (e) => setError((e as Error).message),
  });

  if (!personId) {
    return (
      <p className="text-slate-500">
        Your account isn't linked to a Person record yet. Ask the builder to allot a plot
        to you first.
      </p>
    );
  }

  const verified = subsQ.data?.find((s) => s.status === 'VERIFIED');

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">KYC</h1>
      {verified ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
          Your KYC is verified. PAN {verified.panMasked ?? '****'} ·{' '}
          {verified.aadhaarLast4 && `Aadhaar ****${verified.aadhaarLast4}`}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold">Submit KYC</h2>
          <p className="text-xs text-slate-500">
            Only the masked PAN and the last 4 of your Aadhaar are stored. Your raw PAN is
            hashed; your Aadhaar number is never sent to the server.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-600 flex flex-col">
              PAN
              <input
                placeholder="ABCDE1234F"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
              />
            </label>
            <label className="text-xs text-slate-600 flex flex-col">
              Aadhaar (last 4)
              <input
                placeholder="1234"
                maxLength={4}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-600 flex flex-col">
              PAN document (scan / photo)
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPanFile(e.target.files?.[0] ?? null)}
                className="mt-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600 flex flex-col">
              Aadhaar document
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setAadhaarFile(e.target.files?.[0] ?? null)}
                className="mt-1 text-sm"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || (!pan && !aadhaarLast4)}
            className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {submit.isPending ? 'Submitting…' : 'Submit for verification'}
          </button>
        </div>
      )}

      {(subsQ.data?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold mb-2">History</h2>
          <ul className="text-sm divide-y divide-slate-100">
            {subsQ.data!.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <span>
                  {new Date(s.submittedAt).toLocaleDateString('en-IN')} — PAN{' '}
                  {s.panMasked ?? '—'}
                </span>
                <span
                  className={
                    s.status === 'VERIFIED'
                      ? 'text-emerald-600 text-xs'
                      : s.status === 'REJECTED'
                      ? 'text-red-600 text-xs'
                      : 'text-amber-600 text-xs'
                  }
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

async function uploadKycFile(personId: string, file: File): Promise<string> {
  const presign = await api.post<{ url: string; key: string }>(`/kyc/presign`, {
    personId,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });
  const put = await fetch(presign.url, {
    method: 'PUT',
    body: file,
    headers: { 'content-type': file.type || 'application/octet-stream' },
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return presign.key;
}
