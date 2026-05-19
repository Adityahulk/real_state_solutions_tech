'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';

interface SiteRow {
  id: string;
  name: string;
  reraNumber: string | null;
}

interface Report {
  meta: {
    site: { id: string; name: string; code: string; reraNumber: string | null };
    year: number;
    quarter: number;
    quarterStart: string;
    quarterEnd: string;
    generatedAt: string;
  };
  inventory: { totalPlots: number; statusCounts: Record<string, number> };
  allotments: {
    inQuarter: number;
    cumulative: number;
    plotsAllotted: { plotNumber: string; allottedAt: string; salePrice: number }[];
  };
  transfers: {
    approvedInQuarter: number;
    rows: { plotNumber: string; approvedAt: string; salePrice: number }[];
  };
  financials: {
    collectedInQuarter: number;
    cumulativeCollected: number;
    overdue: { count: number; amount: number };
  };
  development: {
    items: { kind: string; label: string; status: string; averageProgress: number }[];
    overallProgress: number;
  };
  construction: { plotsUnderConstruction: number; averageCompletion: number };
}

export default function ReraPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [siteId, setSiteId] = useState<string>('');

  const sitesQ = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<SiteRow[]>('/sites'),
  });

  const reportQ = useQuery({
    queryKey: ['rera', siteId, year, quarter],
    enabled: !!siteId,
    queryFn: () =>
      api.get<Report>(
        `/reports/rera?siteId=${siteId}&year=${year}&quarter=${quarter}`,
      ),
  });

  function download() {
    if (!reportQ.data) return;
    const blob = new Blob([JSON.stringify(reportQ.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rera-${reportQ.data.meta.site.code}-${year}-Q${quarter}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadMaha() {
    if (!siteId) return;
    const res = await fetch(
      `/api-proxy/reports/rera/maharera.csv?siteId=${siteId}&year=${year}&quarter=${quarter}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      alert(`MahaRERA CSV download failed (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maharera-Q${quarter}-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">RERA quarterly report</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-end gap-3 flex-wrap">
        <label className="text-xs text-slate-600 flex flex-col">
          Site
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">— pick a site —</option>
            {sitesQ.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.reraNumber ? ` (${s.reraNumber})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600 flex flex-col">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm w-24"
          />
        </label>
        <label className="text-xs text-slate-600 flex flex-col">
          Quarter
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={1}>Q1 (Jan–Mar)</option>
            <option value={2}>Q2 (Apr–Jun)</option>
            <option value={3}>Q3 (Jul–Sep)</option>
            <option value={4}>Q4 (Oct–Dec)</option>
          </select>
        </label>
        <button
          onClick={download}
          disabled={!reportQ.data}
          className="rounded-md bg-brand-500 text-white px-3 py-2 text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          Download JSON
        </button>
        <button
          onClick={downloadMaha}
          disabled={!siteId}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          title="MahaRERA-flavoured CSV for direct portal upload"
        >
          MahaRERA CSV
        </button>
      </div>

      {reportQ.data && (
        <div className="grid grid-cols-2 gap-4">
          <Card title="Inventory">
            <div>Total plots: <strong>{reportQ.data.inventory.totalPlots}</strong></div>
            <ul className="mt-2 text-xs space-y-0.5">
              {Object.entries(reportQ.data.inventory.statusCounts).map(([k, v]) => (
                <li key={k}>
                  {k}: <strong>{v}</strong>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Allotments">
            <div>This quarter: <strong>{reportQ.data.allotments.inQuarter}</strong></div>
            <div>Cumulative: <strong>{reportQ.data.allotments.cumulative}</strong></div>
            {reportQ.data.allotments.plotsAllotted.length > 0 && (
              <ul className="mt-2 text-xs space-y-0.5">
                {reportQ.data.allotments.plotsAllotted.map((a, i) => (
                  <li key={i}>
                    {a.plotNumber} · ₹{a.salePrice.toLocaleString('en-IN')}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Transfers approved">
            <div>This quarter: <strong>{reportQ.data.transfers.approvedInQuarter}</strong></div>
          </Card>

          <Card title="Financials">
            <div>
              Collected this quarter:{' '}
              <strong>₹{reportQ.data.financials.collectedInQuarter.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              Cumulative collected:{' '}
              <strong>₹{reportQ.data.financials.cumulativeCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div className="text-amber-700">
              Overdue: <strong>{reportQ.data.financials.overdue.count}</strong> · ₹
              {reportQ.data.financials.overdue.amount.toLocaleString('en-IN')}
            </div>
          </Card>

          <Card title="Site development">
            <div>
              Overall: <strong>{reportQ.data.development.overallProgress.toFixed(1)}%</strong>
            </div>
            <ul className="mt-2 text-xs space-y-0.5 max-h-40 overflow-y-auto">
              {reportQ.data.development.items.map((d, i) => (
                <li key={i}>
                  {d.label}: {d.averageProgress.toFixed(0)}% ({d.status})
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Construction">
            <div>
              Plots under construction:{' '}
              <strong>{reportQ.data.construction.plotsUnderConstruction}</strong>
            </div>
            <div>
              Avg. completion:{' '}
              <strong>{reportQ.data.construction.averageCompletion.toFixed(1)}%</strong>
            </div>
          </Card>
        </div>
      )}

      {!siteId && (
        <p className="text-slate-500 text-sm">Pick a site to preview a quarterly report.</p>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase text-slate-500 mb-2">{title}</div>
      <div className="text-sm text-slate-700 space-y-0.5">{children}</div>
    </div>
  );
}
