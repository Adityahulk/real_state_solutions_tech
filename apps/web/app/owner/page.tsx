'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '~/lib/api';
import { PlotPanel } from '~/components/cad-map/PlotPanel';

interface MyPlot {
  id: string;
  plotNumber: string;
  status: string;
  site: { id: string; name: string };
  allotments: { id: string }[];
}

export default function OwnerHome() {
  const q = useQuery({
    queryKey: ['me', 'plots'],
    queryFn: () => api.get<MyPlot[]>('/me/plots'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your plots</h1>
        <p className="text-sm text-slate-500">
          Everything in one place — allotment letter, payments, construction progress.
        </p>
      </div>

      {q.data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
          You don't own any plots on this account yet. If you've just been allotted one, ask the
          builder to link your user to the plot owner record.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {q.data?.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <PlotPanel plotId={p.id} audience="owner" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
        Need to update your KYC?{' '}
        <Link href="/owner/kyc" className="text-brand-500 hover:underline">
          Submit / update KYC →
        </Link>
      </div>
    </div>
  );
}
