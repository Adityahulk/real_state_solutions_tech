'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '~/lib/api';

interface WorkPackage {
  id: string;
  name: string;
  percentComplete: string;
  status: string;
  budget: string | null;
  deadline: string | null;
  vendor: { id: string; name: string } | null;
  devItem: { id: string; label: string; siteId: string } | null;
  progressUpdates: {
    id: string;
    capturedAt: string;
    percentAfter: string;
    note: string | null;
    lat: string | null;
    lng: string | null;
    photoDocIds: string[];
    authorId: string;
  }[];
  issues: {
    id: string;
    title: string;
    severity: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }[];
}

export default function WorkPackageDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['wp', id],
    queryFn: () => api.get<WorkPackage>(`/work-packages/${id}`),
  });

  const wp = q.data;
  if (!wp) return <p className="text-slate-500 text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        {wp.devItem && (
          <Link
            href={`/admin/dev-items/${wp.devItem.id}`}
            className="text-xs text-slate-500 hover:underline"
          >
            ← {wp.devItem.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold">{wp.name}</h1>
        <p className="text-xs text-slate-500">
          {wp.status} · {wp.vendor ? `${wp.vendor.name} · ` : ''}
          {wp.deadline && `due ${new Date(wp.deadline).toLocaleDateString('en-IN')}`}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Progress</h2>
          <span className="text-sm">{Number(wp.percentComplete).toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded overflow-hidden">
          <div
            className="h-full bg-brand-500"
            style={{ width: `${Math.min(100, Number(wp.percentComplete))}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold mb-3">Progress history</h2>
        {wp.progressUpdates.length === 0 ? (
          <p className="text-sm text-slate-500">No updates yet.</p>
        ) : (
          <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
            {wp.progressUpdates.map((u) => (
              <li key={u.id} className="pl-4 relative">
                <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
                <div className="text-xs text-slate-500">
                  {new Date(u.capturedAt).toLocaleString('en-IN')}
                  {u.lat && u.lng && (
                    <span className="ml-2 font-mono">
                      {Number(u.lat).toFixed(4)},{Number(u.lng).toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="text-sm mt-0.5">
                  Reported <strong>{Number(u.percentAfter).toFixed(0)}%</strong>
                  {u.note && <span className="text-slate-600"> — {u.note}</span>}
                </div>
                {u.photoDocIds.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {u.photoDocIds.map((id) => (
                      <PhotoThumb key={id} docId={id} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold mb-3">Issues</h2>
        {wp.issues.length === 0 ? (
          <p className="text-sm text-slate-500">No issues raised.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {wp.issues.map((i) => (
              <li key={i.id} className="py-2 flex items-center justify-between">
                <span>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 mr-2 ${
                      i.severity === 'blocker'
                        ? 'bg-red-100 text-red-800'
                        : i.severity === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {i.severity}
                  </span>
                  {i.title}
                </span>
                <span className="text-xs text-slate-500">{i.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PhotoThumb({ docId }: { docId: string }) {
  const q = useQuery({
    queryKey: ['doc-url', docId],
    queryFn: () => api.get<{ url: string }>(`/documents/${docId}/url`),
  });
  if (!q.data?.url) return <span className="text-xs text-slate-400">…</span>;
  return (
    <a href={q.data.url} target="_blank" rel="noopener noreferrer">
      <img
        src={q.data.url}
        alt="progress"
        className="h-16 w-16 rounded border border-slate-200 object-cover"
      />
    </a>
  );
}
