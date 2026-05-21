import type { ReactElement } from 'react';
import {
  LayoutGrid,
  Map,
  Hammer,
  FileSignature,
  Wallet,
  Bell,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

/**
 * Stylized "screenshot" of the Rest admin console. Uses pure CSS / SVG so
 * the hero looks like a real product preview without shipping image assets.
 */
export function DashboardPreview() {
  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-[#0b1224]/85 backdrop-blur-xl shadow-[0_50px_120px_-30px_rgba(0,0,0,0.7)] overflow-hidden"
      aria-label="Rest console preview — dashboard with site map, KPIs, AI alerts and live activity feed"
      role="img"
    >
      {/* Window chrome */}
      <div className="h-9 flex items-center gap-1.5 px-4 border-b border-white/5 bg-white/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-4 text-[11px] text-white/35 font-mono">
          rest.solutions/admin/sites/aurum-meadows
        </span>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-12 min-h-[440px] text-white">
        {/* Sidebar */}
        <aside className="col-span-2 hidden md:flex flex-col border-r border-white/5 bg-black/20 py-4 px-2">
          {[
            { icon: LayoutGrid, label: 'Overview', active: true },
            { icon: Map, label: 'Sites' },
            { icon: Hammer, label: 'Construction' },
            { icon: FileSignature, label: 'Allotments' },
            { icon: Wallet, label: 'Finance' },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs ${
                active
                  ? 'bg-white/8 text-white'
                  : 'text-white/55 hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Site overview
              </div>
              <div className="text-lg font-semibold">Aurum Meadows · Phase 2</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-300/90 bg-emerald-400/10 border border-emerald-400/15 px-2 py-1 rounded-full">
              <span className="relative w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-rest-ping" />
                <span className="relative block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Plots allotted" value="184 / 240" delta="+12 wk" />
            <KPI label="Collections (Q)" value="₹38.2 Cr" delta="+18%" />
            <KPI label="On-time milestones" value="94%" delta="+3 pp" />
          </div>

          {/* Map mock */}
          <div className="relative rounded-lg border border-white/10 bg-gradient-to-br from-[#0a1430] to-[#06112a] overflow-hidden h-[210px]">
            <PlotMapMock />
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-[10px] text-white/60">
              <Legend swatch="bg-emerald-400" label="Allotted" />
              <Legend swatch="bg-amber-400" label="Reserved" />
              <Legend swatch="bg-sky-400" label="Available" />
              <Legend swatch="bg-slate-400" label="Dev item" />
              <span className="ml-auto font-mono">EPSG:32643 · synced 2s ago</span>
            </div>
          </div>
        </main>

        {/* Right rail */}
        <aside className="col-span-12 md:col-span-3 border-l border-white/5 bg-black/10 p-4 space-y-4">
          {/* AI Insight card */}
          <div className="rounded-lg border border-brand-500/30 bg-gradient-to-br from-brand-500/15 to-indigo-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-brand-500/90">
              <Sparkles className="w-3 h-3" />
              <span className="text-sky-300">AI insight</span>
            </div>
            <div className="text-xs text-white/90 mt-1.5 leading-snug">
              Steel procurement is 11% above forecast for Tower-B foundation.
              Switching to <span className="text-sky-200">Vendor C</span> saves
              <span className="text-emerald-300"> ₹6.4 L</span> on this milestone.
            </div>
            <button className="mt-2 text-[10px] text-sky-300 inline-flex items-center gap-1">
              Review recommendation <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Activity feed */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/45 mb-2">
              <Bell className="w-3 h-3" />
              Activity
            </div>
            <ul className="space-y-2 text-[11px]">
              <Feed
                color="bg-emerald-400"
                title="Plot B-14 allotted"
                sub="Sterling Estates · 2 buyers · e-sign sent"
              />
              <Feed
                color="bg-sky-400"
                title="CAD v3 activated"
                sub="6 new plots, 2 dev items"
              />
              <Feed
                color="bg-amber-400"
                title="Payment overdue"
                sub="Plot A-7 · 4 days · auto reminder queued"
              />
              <Feed
                color="bg-indigo-400"
                title="RERA Q3 report compiled"
                sub="Ready to submit · MahaRERA format"
              />
            </ul>
          </div>

          {/* Forecast pill */}
          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            <span>
              Projected completion <span className="text-white">on schedule</span>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function KPI({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
          {delta}
        </span>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2 h-2 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

function Feed({ color, title, sub }: { color: string; title: string; sub: string }) {
  return (
    <li className="flex gap-2">
      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
      <div className="leading-snug">
        <div className="text-white/90">{title}</div>
        <div className="text-white/45 text-[10px]">{sub}</div>
      </div>
    </li>
  );
}

/** Hand-rolled SVG of a fake plot map. */
function PlotMapMock() {
  return (
    <svg viewBox="0 0 480 210" className="w-full h-full">
      {/* grid */}
      <defs>
        <pattern id="dotGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="rgba(148, 163, 184, 0.18)" />
        </pattern>
        <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="480" height="210" fill="url(#dotGrid)" />

      {/* roads */}
      <rect x="0" y="100" width="480" height="10" fill="url(#road)" />
      <rect x="230" y="0" width="10" height="210" fill="url(#road)" />

      {/* plots — top-left quadrant (allotted) */}
      {gridPlots(20, 20, 4, 3, '#10b981', 0.85)}
      {/* top-right (mixed reserved/available) */}
      {gridPlots(260, 20, 4, 3, '#0ea5e9', 0.7, [1, 4, 7])}
      {/* bottom-left (available) */}
      {gridPlots(20, 130, 4, 2, '#0ea5e9', 0.55)}
      {/* bottom-right (dev items — labelled R/P/G) */}
      <DevItem x={260} y={130} w={90} h={28} label="Road" />
      <DevItem x={360} y={130} w={100} h={28} label="Park" />
      <DevItem x={260} y={168} w={200} h={28} label="STP" />
    </svg>
  );
}

function gridPlots(
  x0: number,
  y0: number,
  cols: number,
  rows: number,
  fill: string,
  opacity: number,
  highlightAmber: number[] = [],
) {
  const w = 48;
  const h = 32;
  const out: ReactElement[] = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAmber = highlightAmber.includes(n);
      out.push(
        <rect
          key={`${x0}-${y0}-${r}-${c}`}
          x={x0 + c * (w + 4)}
          y={y0 + r * (h + 4)}
          width={w}
          height={h}
          rx={3}
          fill={isAmber ? '#f59e0b' : fill}
          fillOpacity={isAmber ? 0.85 : opacity}
          stroke="rgba(255,255,255,0.08)"
        />,
      );
      n++;
    }
  }
  return out;
}

function DevItem({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill="rgba(148, 163, 184, 0.18)"
        stroke="rgba(148, 163, 184, 0.3)"
        strokeDasharray="3 3"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 3}
        textAnchor="middle"
        fontSize="9"
        fill="rgba(226, 232, 240, 0.7)"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}
