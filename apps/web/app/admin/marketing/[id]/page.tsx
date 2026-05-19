'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '~/lib/api';

type Status =
  | 'BRIEFED'
  | 'RAW_UPLOADED'
  | 'EDIT_IN_PROGRESS'
  | 'EDIT_UPLOADED'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED';

interface MediaAsset {
  id: string;
  kind: 'raw' | 'edit' | 'final';
  muxPlaybackId: string | null;
  storageKey: string | null;
  createdAt: string;
}
interface Comment {
  id: string;
  body: string;
  authorId: string;
  timestampSec: string | null;
  resolved: boolean;
  createdAt: string;
}
interface Task {
  id: string;
  title: string;
  brief: string | null;
  status: Status;
  deadline: string | null;
  videographerId: string | null;
  editorId: string | null;
  siteId: string | null;
  plotId: string | null;
  assets: MediaAsset[];
  comments: Comment[];
}

interface MeAbility {
  user: { id: string };
  roleKeys: string[];
}

interface UserRow {
  id: string;
  displayName: string;
  email: string;
  roleAssignments: { role: { key: string } }[];
}

export default function MarketingTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const taskQ = useQuery({
    queryKey: ['media-task', id],
    queryFn: () => api.get<Task>(`/media-tasks/${id}`),
  });
  const meQ = useQuery({
    queryKey: ['me-abilities'],
    queryFn: () => api.get<MeAbility>('/me/abilities'),
  });
  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserRow[]>('/users'),
  });

  const task = taskQ.data;
  const me = meQ.data;
  const roleKeys = me?.roleKeys ?? [];

  const isHead = roleKeys.includes('super_admin') || roleKeys.includes('marketing_head');
  const isVideographer =
    roleKeys.includes('videographer') && task?.videographerId === me?.user.id;
  const isEditor = roleKeys.includes('editor') && task?.editorId === me?.user.id;

  const videographers = (usersQ.data ?? []).filter((u) =>
    u.roleAssignments.some((r) => r.role.key === 'videographer'),
  );
  const editors = (usersQ.data ?? []).filter((u) =>
    u.roleAssignments.some((r) => r.role.key === 'editor'),
  );

  const rawAsset = task?.assets.find((a) => a.kind === 'raw');
  const editAsset = task?.assets.find((a) => a.kind === 'edit');

  if (!task) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/marketing" className="text-xs text-slate-500 hover:underline">
          ← Marketing
        </Link>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        <p className="text-xs text-slate-500">
          {task.status}
          {task.deadline && ` · due ${new Date(task.deadline).toLocaleDateString('en-IN')}`}
        </p>
        {task.brief && (
          <p className="text-sm text-slate-700 mt-2 max-w-2xl whitespace-pre-line">{task.brief}</p>
        )}
      </div>

      {isHead && (
        <AssignmentBlock
          task={task}
          videographers={videographers}
          editors={editors}
          onChange={() => qc.invalidateQueries({ queryKey: ['media-task', id] })}
        />
      )}

      <UploadBlock
        kind="raw"
        title="Raw footage"
        task={task}
        existing={rawAsset}
        canUpload={isVideographer || isHead}
        onUploaded={() => qc.invalidateQueries({ queryKey: ['media-task', id] })}
      />

      <UploadBlock
        kind="edit"
        title="Edited cut"
        task={task}
        existing={editAsset}
        canUpload={isEditor || isHead}
        onUploaded={() => qc.invalidateQueries({ queryKey: ['media-task', id] })}
      />

      {isHead && (task.status === 'EDIT_UPLOADED' || task.status === 'APPROVED') && (
        <DecisionBlock
          task={task}
          onDecided={() => qc.invalidateQueries({ queryKey: ['media-task', id] })}
        />
      )}

      <CommentsBlock
        task={task}
        editAsset={editAsset ?? null}
        onChange={() => qc.invalidateQueries({ queryKey: ['media-task', id] })}
      />
    </div>
  );
}

function AssignmentBlock({
  task,
  videographers,
  editors,
  onChange,
}: {
  task: Task;
  videographers: UserRow[];
  editors: UserRow[];
  onChange: () => void;
}) {
  const mut = useMutation({
    mutationFn: (patch: { videographerId?: string | null; editorId?: string | null }) =>
      api.patch(`/media-tasks/${task.id}/assign`, patch),
    onSuccess: onChange,
  });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-2 gap-4">
      <label className="text-xs text-slate-600 flex flex-col">
        Videographer
        <select
          value={task.videographerId ?? ''}
          onChange={(e) => mut.mutate({ videographerId: e.target.value || null })}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {videographers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600 flex flex-col">
        Editor
        <select
          value={task.editorId ?? ''}
          onChange={(e) => mut.mutate({ editorId: e.target.value || null })}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {editors.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function UploadBlock({
  kind,
  title,
  task,
  existing,
  canUpload,
  onUploaded,
}: {
  kind: 'raw' | 'edit';
  title: string;
  task: Task;
  existing: MediaAsset | undefined;
  canUpload: boolean;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const created = await api.post<{
        kind: 'mux' | 'sandbox';
        uploadId: string;
        uploadUrl: string;
        storageKey?: string;
      }>('/media-uploads', {
        taskId: task.id,
        kind,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });

      if (created.kind === 'mux') {
        const put = await fetch(created.uploadUrl, { method: 'PUT', body: file });
        if (!put.ok) throw new Error(`Mux upload failed (${put.status})`);
        await api.post('/media-uploads/finish', {
          taskId: task.id,
          kind,
          muxUploadId: created.uploadId,
        });
      } else {
        const put = await fetch(created.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'content-type': file.type || 'application/octet-stream' },
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        await api.post('/media-uploads/finish', {
          taskId: task.id,
          kind,
          muxUploadId: created.uploadId,
          storageKey: created.storageKey,
        });
      }
      setFile(null);
      onUploaded();
    } catch (e: unknown) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {existing && <AssetPlayer assetId={existing.id} />}
      </div>
      {!existing && !canUpload && (
        <p className="text-sm text-slate-500">Awaiting upload.</p>
      )}
      {canUpload && !existing && (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            disabled={!file || busy}
            onClick={upload}
            className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}

function AssetPlayer({ assetId }: { assetId: string }) {
  const q = useQuery({
    queryKey: ['asset-playback', assetId],
    queryFn: () =>
      api.get<{ url: string; kind: 'mux' | 's3' | 'none' }>(`/media-assets/${assetId}/playback`),
  });
  if (!q.data?.url) return null;
  if (q.data.kind === 'mux') {
    return (
      <a
        href={q.data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-brand-500 hover:underline"
      >
        Play (HLS) →
      </a>
    );
  }
  if (q.data.kind === 's3') {
    return (
      <video src={q.data.url} controls className="rounded border border-slate-200 max-w-md" />
    );
  }
  return <span className="text-xs text-slate-500">Preview unavailable</span>;
}

function DecisionBlock({
  task,
  onDecided,
}: {
  task: Task;
  onDecided: () => void;
}) {
  const mut = useMutation({
    mutationFn: (input: { decision: 'approve' | 'revise' | 'publish'; note?: string }) =>
      api.post(`/media-tasks/${task.id}/decision`, input),
    onSuccess: onDecided,
  });
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium">Decision:</span>
      {task.status === 'EDIT_UPLOADED' && (
        <>
          <button
            onClick={() => {
              const note = prompt('What needs to change?') ?? '';
              if (!note) return;
              mut.mutate({ decision: 'revise', note });
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Request revision
          </button>
          <button
            onClick={() => mut.mutate({ decision: 'approve' })}
            className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
          >
            Approve
          </button>
        </>
      )}
      {task.status === 'APPROVED' && (
        <button
          onClick={() => mut.mutate({ decision: 'publish' })}
          className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700"
        >
          Publish to library
        </button>
      )}
    </div>
  );
}

function CommentsBlock({
  task,
  editAsset,
  onChange,
}: {
  task: Task;
  editAsset: MediaAsset | null;
  onChange: () => void;
}) {
  const [body, setBody] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const post = useMutation({
    mutationFn: () =>
      api.post('/review-comments', {
        taskId: task.id,
        assetId: editAsset?.id,
        body,
        timestampSec: timestamp ? Number(timestamp) : undefined,
      }),
    onSuccess: () => {
      setBody('');
      setTimestamp('');
      onChange();
    },
  });
  const resolve = useMutation({
    mutationFn: (id: string) => api.patch(`/review-comments/${id}/resolve`, {}),
    onSuccess: onChange,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold">Comments</h2>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="@ sec"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="Comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && body) post.mutate();
          }}
        />
        <button
          onClick={() => post.mutate()}
          disabled={!body || post.isPending}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          Post
        </button>
      </div>
      <ul className="divide-y divide-slate-100 text-sm">
        {task.comments.map((c) => (
          <li key={c.id} className="py-2 flex items-baseline justify-between">
            <span className={c.resolved ? 'text-slate-400 line-through' : ''}>
              {c.timestampSec != null && (
                <span className="text-xs font-mono bg-slate-100 rounded px-1.5 py-0.5 mr-2">
                  {Number(c.timestampSec).toFixed(0)}s
                </span>
              )}
              {c.body}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {new Date(c.createdAt).toLocaleString('en-IN')}
              </span>
              {!c.resolved && (
                <button
                  onClick={() => resolve.mutate(c.id)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Resolve
                </button>
              )}
            </span>
          </li>
        ))}
        {task.comments.length === 0 && (
          <li className="text-slate-500 py-4">No comments yet.</li>
        )}
      </ul>
    </div>
  );
}
