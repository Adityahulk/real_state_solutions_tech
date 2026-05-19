'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '~/lib/api';

interface CADDrawing {
  id: string;
  status: 'parsing' | 'review' | 'active' | 'superseded' | 'failed';
  version: number;
  geojson: { entities?: ReviewEntity[]; error?: string } | null;
}

interface ReviewEntity {
  layer: string;
  label: string;
  kind: 'plot' | 'dev_item';
  devKind?: string;
  geometry: unknown;
  areaSqft?: number;
}

interface ReviewRow extends ReviewEntity {
  action: 'accept' | 'skip';
}

export default function CadPage() {
  const { id: siteId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Find the latest drawing for this site via the parent site detail
  const siteQ = useQuery({
    queryKey: ['site', siteId],
    queryFn: () =>
      api.get<{ cadDrawings: { id: string; status: string; version: number }[] }>(`/sites/${siteId}`),
    refetchInterval: 3000,
  });

  const latest = siteQ.data?.cadDrawings?.[0];

  const drawingQ = useQuery({
    queryKey: ['cad', latest?.id],
    enabled: !!latest && latest.status !== 'active',
    queryFn: () => api.get<CADDrawing>(`/cad/${latest!.id}`),
    refetchInterval: (q) =>
      (q.state.data as CADDrawing | undefined)?.status === 'parsing' ? 2000 : false,
  });

  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const initialRows = useMemo<ReviewRow[]>(() => {
    if (!drawingQ.data?.geojson?.entities) return [];
    return drawingQ.data.geojson.entities.map((e) => ({ ...e, action: 'accept' }));
  }, [drawingQ.data]);

  const editedRows = rows ?? initialRows;

  const activate = useMutation({
    mutationFn: () =>
      api.post(`/cad/${latest!.id}/activate`, {
        items: editedRows.map((r) => ({
          layer: r.layer,
          label: r.label,
          kind: r.kind,
          devKind: r.devKind,
          action: r.action,
          areaSqft: r.areaSqft ?? null,
          geometry: r.geometry,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site', siteId] });
      qc.invalidateQueries({ queryKey: ['site', siteId, 'geojson'] });
      router.push(`/admin/sites/${siteId}`);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">CAD upload</h1>
      <CadUploader siteId={siteId} />

      {latest && latest.status === 'parsing' && (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm">
          Drawing v{latest.version} is being parsed…
        </div>
      )}
      {latest && latest.status === 'failed' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Parsing failed: {drawingQ.data?.geojson?.error ?? 'unknown'}
        </div>
      )}

      {latest && latest.status === 'review' && drawingQ.data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Review parsed entities ({editedRows.length})
            </h2>
            <button
              disabled={activate.isPending}
              onClick={() => activate.mutate()}
              className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
            >
              {activate.isPending ? 'Activating…' : 'Confirm and activate'}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Layer</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Area (sqft)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {editedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select
                        value={r.action}
                        onChange={(e) =>
                          setRows((prev) => {
                            const base = [...(prev ?? initialRows)];
                            base[i] = { ...base[i]!, action: e.target.value as 'accept' | 'skip' };
                            return base;
                          })
                        }
                        className="text-xs border border-slate-300 rounded px-2 py-1"
                      >
                        <option value="accept">Accept</option>
                        <option value="skip">Skip</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.layer}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.kind === 'plot' ? 'Plot' : r.devKind ?? 'Dev item'}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.label}
                        onChange={(e) =>
                          setRows((prev) => {
                            const base = [...(prev ?? initialRows)];
                            base[i] = { ...base[i]!, label: e.target.value };
                            return base;
                          })
                        }
                        className="text-sm border border-slate-300 rounded px-2 py-1 w-32"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">{r.areaSqft ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {latest && latest.status === 'active' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Active drawing (v{latest.version}). Upload a new file above to re-version.
        </div>
      )}
    </div>
  );
}

function CadUploader({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    setProgress('Requesting upload URL…');
    const presign = await api.post<{ url: string; key: string }>(
      `/sites/${siteId}/cad/presign`,
      { filename: file.name, contentType: file.type || 'application/octet-stream' },
    );

    setProgress('Uploading to storage…');
    const put = await fetch(presign.url, {
      method: 'PUT',
      body: file,
      headers: { 'content-type': file.type || 'application/octet-stream' },
    });
    if (!put.ok) {
      setProgress(`Upload failed (${put.status})`);
      return;
    }

    setProgress('Registering drawing…');
    await api.post('/cad/uploads', {
      siteId,
      storageKey: presign.key,
      filename: file.name,
    });

    setProgress('Queued for parsing.');
    setFile(null);
    qc.invalidateQueries({ queryKey: ['site', siteId] });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".dwg,.dxf,.geojson,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={onUpload}
          disabled={!file}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          Upload
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Accepts DWG / DXF (parsed via APS when wired) and GeoJSON (used directly — handy for dev).
      </p>
      {progress && <p className="text-xs text-slate-600">{progress}</p>}
    </div>
  );
}
