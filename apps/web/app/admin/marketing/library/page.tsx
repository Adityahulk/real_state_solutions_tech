'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { api } from '~/lib/api';

interface LibraryAsset {
  id: string;
  title: string;
  brief: string | null;
  updatedAt: string;
  assets: { id: string; muxPlaybackId: string | null; storageKey: string | null }[];
}

interface Playback {
  url: string;
  kind: 'mux' | 's3' | 'none';
}

export default function MarketingLibraryPage() {
  const q = useQuery({
    queryKey: ['media-library'],
    queryFn: () => api.get<LibraryAsset[]>('/media-library'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Marketing library</h1>
        <Link
          href="/admin/marketing"
          className="text-sm text-brand-500 hover:underline"
        >
          ← All tasks
        </Link>
      </div>

      {q.data?.length === 0 && (
        <p className="text-slate-500 text-sm">
          Nothing in the library yet. Publish an approved marketing task to add it here.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {q.data?.map((task) => (
          <LibraryCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function LibraryCard({ task }: { task: LibraryAsset }) {
  const asset = task.assets[0];
  const playbackQ = useQuery({
    queryKey: ['asset-playback', asset?.id],
    enabled: !!asset,
    queryFn: () => api.get<Playback>(`/media-assets/${asset!.id}/playback`),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-brand-500 transition">
      <div className="bg-slate-900 aspect-video grid place-items-center text-slate-400 relative">
        {playbackQ.data?.kind === 's3' ? (
          <video
            src={playbackQ.data.url}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : playbackQ.data?.kind === 'mux' ? (
          <a
            href={playbackQ.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-brand-200 flex flex-col items-center gap-1"
          >
            <Film className="w-10 h-10" />
            <span className="text-xs">Play HLS</span>
          </a>
        ) : (
          <Film className="w-10 h-10" />
        )}
      </div>
      <div className="p-4">
        <Link
          href={`/admin/marketing/${task.id}`}
          className="font-medium text-sm hover:underline"
        >
          {task.title}
        </Link>
        {task.brief && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.brief}</p>
        )}
        <div className="mt-2 text-xs text-slate-400">
          Published {new Date(task.updatedAt).toLocaleDateString('en-IN')}
        </div>
      </div>
    </div>
  );
}
