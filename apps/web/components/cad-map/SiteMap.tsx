'use client';

import { useEffect, useMemo, useRef } from 'react';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
} from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * The shared map used by the Site Console, Module 2 Development, and the
 * read-only owner views. Single source-of-truth for status colours, hover
 * affordances, selection state, and filter dimming.
 *
 * Two layers:
 *  - Plots (Polygon) — primary; status-colour-coded
 *  - Dev items (Polygon / LineString / Point) — secondary; kind-colour-coded
 *
 * Click ↦ `onSelect({kind, id})`. Caller renders the side panel.
 */

export type PlotStatus =
  | 'UNSOLD'
  | 'RESERVED'
  | 'ALLOTTED'
  | 'UNDER_CONSTRUCTION'
  | 'COMPLETED'
  | 'REGISTERED';

export interface PlotFeatureProps {
  plotNumber: string;
  status: PlotStatus;
  areaSqft: number | null;
  [k: string]: unknown;
}

export interface DevFeatureProps {
  kind: string;
  label: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  [k: string]: unknown;
}

export interface MapSelection {
  kind: 'plot' | 'dev';
  id: string;
}

const STATUS_FILL: Record<PlotStatus, string> = {
  UNSOLD: '#cbd5e1',
  RESERVED: '#fde68a',
  ALLOTTED: '#93c5fd',
  UNDER_CONSTRUCTION: '#fdba74',
  COMPLETED: '#86efac',
  REGISTERED: '#a7f3d0',
};
const STATUS_BORDER: Record<PlotStatus, string> = {
  UNSOLD: '#64748b',
  RESERVED: '#b45309',
  ALLOTTED: '#1d4ed8',
  UNDER_CONSTRUCTION: '#c2410c',
  COMPLETED: '#15803d',
  REGISTERED: '#047857',
};
const DEV_COLOR: Record<string, string> = {
  road: '#737373',
  pole: '#a16207',
  club_house: '#7c3aed',
  water_line: '#0284c7',
  sewer_line: '#0f766e',
  park: '#16a34a',
  plantation: '#15803d',
  boundary: '#475569',
};

interface Props {
  plots: FeatureCollection<Polygon, PlotFeatureProps>;
  devItems?: FeatureCollection<Geometry, DevFeatureProps>;
  selection?: MapSelection | null;
  statusFilter?: PlotStatus[] | null;
  search?: string;
  showPlots?: boolean;
  showDevItems?: boolean;
  onSelect?: (sel: MapSelection) => void;
  onClear?: () => void;
  height?: number | string;
}

export function SiteMap({
  plots,
  devItems,
  selection,
  statusFilter,
  search,
  showPlots = true,
  showDevItems = true,
  onSelect,
  onClear,
  height = '100%',
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const plotLayerRef = useRef<L.GeoJSON<PlotFeatureProps> | null>(null);
  const devLayerRef = useRef<L.GeoJSON<DevFeatureProps> | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 5,
      zoomControl: false,
      attributionControl: false,
    }).setView([0, 0], 0);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click', (e) => {
      // Clicks on a polygon path bubble here too; ignore them, only clear on
      // background click.
      if ((e.originalEvent.target as HTMLElement).tagName === 'path') return;
      onClear?.();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc clears selection
  useEffect(() => {
    if (!onClear) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClear]);

  const filterSet = useMemo(
    () => (statusFilter ? new Set(statusFilter) : null),
    [statusFilter],
  );
  const searchLc = (search ?? '').trim().toLowerCase();

  const plotStyle = useMemo(
    () => (feat?: Feature<Polygon, PlotFeatureProps>) => {
      const id = String(feat?.id ?? '');
      const status = feat?.properties?.status ?? 'UNSOLD';
      const isSel = selection?.kind === 'plot' && selection.id === id;
      const filteredOut =
        (filterSet && !filterSet.has(status)) ||
        (searchLc && !feat?.properties?.plotNumber?.toLowerCase().includes(searchLc));
      const fillOpacity = filteredOut ? 0.12 : isSel ? 0.92 : 0.78;
      const weight = isSel ? 4 : 1.25;
      return {
        color: isSel ? '#1d4ed8' : STATUS_BORDER[status as PlotStatus] ?? '#475569',
        weight,
        fillColor: STATUS_FILL[status as PlotStatus] ?? '#cbd5e1',
        fillOpacity,
      };
    },
    [filterSet, searchLc, selection],
  );

  const devStyle = useMemo(
    () => (feat?: Feature<Geometry, DevFeatureProps>) => {
      const id = String(feat?.id ?? '');
      const kind = feat?.properties?.kind ?? 'road';
      const color = DEV_COLOR[kind] ?? '#0ea5e9';
      const isSel = selection?.kind === 'dev' && selection.id === id;
      return {
        color: isSel ? '#1d4ed8' : color,
        weight: isSel ? 4 : 2.5,
        fillColor: color,
        fillOpacity: 0.25,
        opacity: 0.9,
      };
    },
    [selection],
  );

  // Plots layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    plotLayerRef.current?.remove();
    if (!showPlots) {
      plotLayerRef.current = null;
      return;
    }
    const layer = L.geoJSON(plots as never, {
      style: plotStyle as never,
      onEachFeature: (feature, lyr) => {
        const props = feature.properties as PlotFeatureProps | undefined;
        if (!props) return;
        const tooltipHtml = `
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.35">
            <div style="font-weight:600;font-size:13px">Plot ${escapeHtml(props.plotNumber)}</div>
            <div style="color:#475569">${humanStatus(props.status)}</div>
            ${props.areaSqft ? `<div style="color:#64748b">${props.areaSqft} sqft</div>` : ''}
            <div style="color:#94a3b8;margin-top:2px">Click for details</div>
          </div>`;
        lyr.bindTooltip(tooltipHtml, { sticky: true, direction: 'top', offset: [0, -4] });
        lyr.on('click', () => {
          if (feature.id) onSelect?.({ kind: 'plot', id: String(feature.id) });
        });
        lyr.on('mouseover', () => (lyr as L.Path).setStyle({ weight: 3 }));
        lyr.on('mouseout', () => layer.resetStyle(lyr));
      },
    });
    layer.addTo(map);
    plotLayerRef.current = layer;
    const bounds = layer.getBounds();
    if (bounds.isValid() && map.getZoom() === 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 2 });
    }
  }, [plots, plotStyle, onSelect, showPlots]);

  // Dev items layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    devLayerRef.current?.remove();
    if (!showDevItems || !devItems || devItems.features.length === 0) {
      devLayerRef.current = null;
      return;
    }
    const layer = L.geoJSON(devItems as never, {
      style: devStyle as never,
      pointToLayer: (_f, latlng) =>
        L.circleMarker(latlng, {
          radius: 6,
          color: '#0ea5e9',
          weight: 2,
          fillColor: '#0ea5e9',
          fillOpacity: 0.8,
        }),
      onEachFeature: (feature, lyr) => {
        const props = feature.properties as DevFeatureProps | undefined;
        if (!props) return;
        lyr.bindTooltip(
          `<div style="font-size:12px"><strong>${escapeHtml(
            props.label,
          )}</strong><br/><span style="color:#64748b">${escapeHtml(props.kind)}</span></div>`,
          { sticky: true, direction: 'top' },
        );
        lyr.on('click', () => {
          if (feature.id) onSelect?.({ kind: 'dev', id: String(feature.id) });
        });
      },
    });
    layer.addTo(map);
    devLayerRef.current = layer;
  }, [devItems, devStyle, onSelect, showDevItems]);

  // Re-style on selection / filter without rebuilding the layer
  useEffect(() => {
    plotLayerRef.current?.setStyle(plotStyle as never);
    devLayerRef.current?.setStyle(devStyle as never);
  }, [plotStyle, devStyle]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-100"
      style={{ height, position: 'relative' }}
    />
  );
}

// ---------- helpers ----------

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function humanStatus(s: PlotStatus): string {
  switch (s) {
    case 'UNSOLD':
      return 'Unsold';
    case 'RESERVED':
      return 'Reserved';
    case 'ALLOTTED':
      return 'Allotted';
    case 'UNDER_CONSTRUCTION':
      return 'Under construction';
    case 'COMPLETED':
      return 'Completed';
    case 'REGISTERED':
      return 'Registered';
  }
}

// ---------- shared status helpers ----------

export const PLOT_STATUSES: PlotStatus[] = [
  'UNSOLD',
  'RESERVED',
  'ALLOTTED',
  'UNDER_CONSTRUCTION',
  'COMPLETED',
  'REGISTERED',
];

export function statusColor(s: PlotStatus): string {
  return STATUS_FILL[s];
}
export function statusBorder(s: PlotStatus): string {
  return STATUS_BORDER[s];
}
export function statusLabel(s: PlotStatus): string {
  return humanStatus(s);
}
