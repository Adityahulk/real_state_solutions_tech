'use client';

import { Layers, Search, X } from 'lucide-react';
import {
  PLOT_STATUSES,
  type PlotStatus,
  statusColor,
  statusLabel,
} from './SiteMap';

interface Counts {
  total: number;
  byStatus: Partial<Record<PlotStatus, number>>;
}

interface Props {
  counts: Counts;
  statusFilter: PlotStatus[] | null;
  onToggleStatus: (s: PlotStatus) => void;
  onClearFilter: () => void;
  search: string;
  onSearch: (s: string) => void;
  showPlots: boolean;
  showDevItems: boolean;
  onTogglePlots: () => void;
  onToggleDev: () => void;
}

export function MapToolbar({
  counts,
  statusFilter,
  onToggleStatus,
  onClearFilter,
  search,
  onSearch,
  showPlots,
  showDevItems,
  onTogglePlots,
  onToggleDev,
}: Props) {
  const activeSet = new Set(statusFilter ?? []);
  return (
    <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex justify-between items-start gap-2">
      <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl shadow-sm border border-slate-200 p-2 flex flex-wrap items-center gap-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search plot #"
            className="pl-8 pr-7 py-1.5 text-sm rounded-md border border-slate-200 w-48 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-slate-400 px-1">|</span>
        <div className="flex flex-wrap items-center gap-1">
          {PLOT_STATUSES.map((s) => {
            const n = counts.byStatus[s] ?? 0;
            const active = activeSet.has(s);
            return (
              <button
                key={s}
                onClick={() => onToggleStatus(s)}
                className={`flex items-center gap-1.5 text-xs rounded-full px-2 py-1 border transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm border border-slate-400"
                  style={{ background: statusColor(s) }}
                />
                {statusLabel(s)}
                <span className={active ? 'text-slate-200' : 'text-slate-400'}>{n}</span>
              </button>
            );
          })}
          {statusFilter && (
            <button
              onClick={onClearFilter}
              className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl shadow-sm border border-slate-200 p-1 flex items-center gap-1">
        <span className="px-2 text-xs text-slate-500 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          Layers
        </span>
        <LayerToggle label="Plots" on={showPlots} onClick={onTogglePlots} />
        <LayerToggle label="Development" on={showDevItems} onClick={onToggleDev} />
      </div>
    </div>
  );
}

function LayerToggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-md px-2 py-1 border transition ${
        on
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
