'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '~/lib/api';
import { MapToolbar } from '~/components/cad-map/MapToolbar';
import { SidePanel } from '~/components/cad-map/SidePanel';
import { PlotPanel } from '~/components/cad-map/PlotPanel';
import { DevItemPanel } from '~/components/cad-map/DevItemPanel';
import type { MapSelection, PlotStatus } from '~/components/cad-map/SiteMap';

const SiteMap = dynamic(
  () => import('~/components/cad-map/SiteMap').then((m) => m.SiteMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">
        Loading map…
      </div>
    ),
  },
);

interface SiteDetail {
  id: string;
  name: string;
  code: string;
  reraNumber: string | null;
  city: string | null;
  state: string | null;
  cadDrawings: { id: string; status: string; version: number }[];
  _count: { plots: number; developmentItems: number };
}

interface PlotFC {
  type: 'FeatureCollection';
  features: Array<{
    id: string;
    type: 'Feature';
    properties: { plotNumber: string; status: PlotStatus; areaSqft: number | null };
    geometry: { type: 'Polygon'; coordinates: number[][][] };
  }>;
}
interface DevFC {
  type: 'FeatureCollection';
  features: Array<{
    id: string;
    type: 'Feature';
    properties: {
      kind: string;
      label: string;
      status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
    };
    geometry: { type: string; coordinates: unknown };
  }>;
}

export default function SiteConsolePage() {
  const params = useParams<{ id: string }>();
  const siteId = params.id;

  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlotStatus[] | null>(null);
  const [search, setSearch] = useState('');
  const [showPlots, setShowPlots] = useState(true);
  const [showDev, setShowDev] = useState(true);

  const siteQ = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => api.get<SiteDetail>(`/sites/${siteId}`),
  });
  const plotsQ = useQuery({
    queryKey: ['site', siteId, 'plots.geojson'],
    queryFn: () => api.get<PlotFC>(`/sites/${siteId}/plots.geojson`),
    refetchInterval: 30_000,
  });
  const devQ = useQuery({
    queryKey: ['site', siteId, 'dev-items.geojson'],
    queryFn: () => api.get<DevFC>(`/sites/${siteId}/dev-items.geojson`),
    refetchInterval: 30_000,
  });

  const counts = useMemo(() => {
    const byStatus: Partial<Record<PlotStatus, number>> = {};
    for (const f of plotsQ.data?.features ?? []) {
      const s = f.properties.status;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
    return { total: plotsQ.data?.features.length ?? 0, byStatus };
  }, [plotsQ.data]);

  const toggleStatus = (s: PlotStatus) => {
    setStatusFilter((prev) => {
      const cur = new Set(prev ?? []);
      if (cur.has(s)) cur.delete(s);
      else cur.add(s);
      return cur.size === 0 ? null : [...cur];
    });
  };

  const latestDrawing = siteQ.data?.cadDrawings?.[0];
  const needsReview = latestDrawing?.status === 'review';
  const hasPlots = (plotsQ.data?.features.length ?? 0) > 0;

  return (
    <div className="-m-8 grid grid-rows-[auto_1fr] h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div>
          <Link href="/admin/sites" className="text-xs text-slate-500 hover:underline">
            ← All sites
          </Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            {siteQ.data?.name ?? 'Site'}
            <span className="text-xs font-mono text-slate-500">{siteQ.data?.code}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {counts.total} plots · {siteQ.data?._count.developmentItems ?? 0} dev items
            {siteQ.data?.reraNumber && (
              <>
                {' · '}
                <span className="text-slate-700">RERA {siteQ.data.reraNumber}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/sites/${siteId}/cad`}
            className={`text-sm rounded-md border px-3 py-1.5 ${
              needsReview
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            {needsReview ? 'Review CAD' : 'Upload CAD'}
          </Link>
          <Link
            href={`/admin/sites/${siteId}/development`}
            className="text-sm rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Development list
          </Link>
        </div>
      </div>

      <div className="relative">
        {!hasPlots && !plotsQ.isLoading && (
          <div className="absolute inset-0 z-[1000] grid place-items-center p-8 bg-slate-50">
            <div className="max-w-md text-center space-y-3">
              <h2 className="text-lg font-semibold">No plots yet</h2>
              <p className="text-sm text-slate-600">
                Upload a CAD file (DWG, DXF or GeoJSON) to bootstrap the plot inventory.
                Plots become clickable on the map as soon as you confirm the parsed entities.
              </p>
              <Link
                href={`/admin/sites/${siteId}/cad`}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 text-white px-3 py-2 text-sm hover:bg-brand-700"
              >
                <Upload className="w-4 h-4" />
                Upload CAD
              </Link>
            </div>
          </div>
        )}

        {hasPlots && (
          <>
            <SiteMap
              plots={plotsQ.data as never}
              devItems={devQ.data as never}
              selection={selection}
              statusFilter={statusFilter}
              search={search}
              showPlots={showPlots}
              showDevItems={showDev}
              onSelect={setSelection}
              onClear={() => setSelection(null)}
              height="100%"
            />
            <MapToolbar
              counts={counts}
              statusFilter={statusFilter}
              onToggleStatus={toggleStatus}
              onClearFilter={() => setStatusFilter(null)}
              search={search}
              onSearch={setSearch}
              showPlots={showPlots}
              showDevItems={showDev}
              onTogglePlots={() => setShowPlots((v) => !v)}
              onToggleDev={() => setShowDev((v) => !v)}
            />
          </>
        )}

        <SidePanel open={!!selection} onClose={() => setSelection(null)}>
          {selection?.kind === 'plot' && <PlotPanel plotId={selection.id} audience="admin" />}
          {selection?.kind === 'dev' && <DevItemPanel devItemId={selection.id} />}
        </SidePanel>
      </div>
    </div>
  );
}
