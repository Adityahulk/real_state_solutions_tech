'use client';

/**
 * PlotInterior — auto-arranged SVG visualisation of a plot's construction
 * checklist. Each checklist *group* (Civil, Plumbing, Electrical, Painting,
 * Garden, Finishing…) is rendered as a clickable "zone" whose fill colour
 * gradates from grey (0%) → emerald (100%).
 *
 * The layout is deterministic: zones are packed into a 4-column grid sized
 * to the plot's aspect ratio. No real architectural drawing required — but
 * it gives the owner *and* the engineer a single glance "where are we on
 * this plot" picture that matches the checklist groups they actually use.
 */

interface Group {
  name: string;
  averagePercent: number;
  itemCount: number;
}

interface Props {
  groups: Group[];
  selected: string | null;
  onSelect: (group: string | null) => void;
  /** Aspect ratio override; defaults to 4:3. */
  aspect?: { w: number; h: number };
}

function colorFor(pct: number): string {
  // 0% slate-300 → 100% emerald-500 via a couple of stops
  const p = Math.max(0, Math.min(100, pct)) / 100;
  if (p < 0.25) return mix('#cbd5e1', '#fde68a', p / 0.25);
  if (p < 0.6) return mix('#fde68a', '#fdba74', (p - 0.25) / 0.35);
  return mix('#fdba74', '#10b981', (p - 0.6) / 0.4);
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | b2).toString(16).padStart(6, '0')}`;
}

export function PlotInterior({ groups, selected, onSelect, aspect = { w: 4, h: 3 } }: Props) {
  if (groups.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 grid place-items-center text-slate-400 text-sm">
        No checklist groups yet.
      </div>
    );
  }

  // Lay zones out as a grid that fits the aspect ratio. Calculate rows×cols
  // such that rows ≤ cols and (cols/rows) ≈ aspect.w/aspect.h.
  const n = groups.length;
  const targetRatio = aspect.w / aspect.h;
  let bestCols = 1;
  let bestRows = n;
  let bestDelta = Infinity;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const r = cols / rows;
    const d = Math.abs(r - targetRatio);
    if (d < bestDelta) {
      bestDelta = d;
      bestCols = cols;
      bestRows = rows;
    }
  }
  const cols = bestCols;
  const rows = bestRows;
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const padding = 1.2;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <svg viewBox="0 0 100 75" className="w-full" role="img" aria-label="Plot interior layout">
        {/* outer wall */}
        <rect x={0.5} y={0.5} width={99} height={74} rx={1.5} fill="#f8fafc" stroke="#94a3b8" strokeWidth={0.5} />
        {/* doorway tick */}
        <line x1={45} y1={74.5} x2={55} y2={74.5} stroke="#f8fafc" strokeWidth={1.5} />
        {/* zones */}
        {groups.map((g, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * cellW + padding;
          const y = (row * cellH * 75) / 100 + padding; // scale to viewBox height
          const w = cellW - padding * 2;
          const h = (cellH * 75) / 100 - padding * 2;
          const isSel = selected === g.name;
          const fill = colorFor(g.averagePercent);
          return (
            <g
              key={g.name}
              onClick={() => onSelect(isSel ? null : g.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(isSel ? null : g.name);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${g.name}: ${g.averagePercent.toFixed(0)}% complete, ${g.itemCount} ${g.itemCount === 1 ? 'item' : 'items'}`}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={1.2}
                fill={fill}
                opacity={isSel ? 1 : 0.85}
                stroke={isSel ? '#1d4ed8' : '#475569'}
                strokeWidth={isSel ? 0.6 : 0.25}
              />
              <text
                x={x + w / 2}
                y={y + h / 2 - 1.5}
                textAnchor="middle"
                fontSize={3.2}
                fontWeight={600}
                fill="#0f172a"
              >
                {g.name}
              </text>
              <text
                x={x + w / 2}
                y={y + h / 2 + 2.5}
                textAnchor="middle"
                fontSize={2.4}
                fill="#1e293b"
              >
                {g.averagePercent.toFixed(0)}% · {g.itemCount} item{g.itemCount === 1 ? '' : 's'}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span>Tap a zone to drill in.</span>
        <span className="flex items-center gap-1.5 ml-auto">
          0%
          <span className="inline-block w-20 h-2 rounded"
            style={{ background: 'linear-gradient(to right, #cbd5e1, #fde68a, #fdba74, #10b981)' }}
          />
          100%
        </span>
      </div>
    </div>
  );
}
