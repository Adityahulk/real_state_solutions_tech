export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-600">
        Phase 0 scaffold. Sites, plots, allotments and other modules light up in subsequent phases.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-500">Plots</div>
          <div className="text-2xl font-semibold mt-1">—</div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-500">Active allotments</div>
          <div className="text-2xl font-semibold mt-1">—</div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-500">Construction progress</div>
          <div className="text-2xl font-semibold mt-1">—</div>
        </div>
      </div>
    </div>
  );
}
