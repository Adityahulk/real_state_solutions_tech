'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '~/lib/api';

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  isImmutable: boolean;
  _count: { userAssignments: number; rolePermissions: number };
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rolesQ = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<RoleRow[]>('/roles'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Roles</h1>
          <button
            onClick={() => setCreating(true)}
            className="text-sm rounded-md bg-brand-500 text-white px-2.5 py-1 hover:bg-brand-700"
          >
            New
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {rolesQ.data?.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                selectedId === r.id ? 'bg-slate-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{r.name}</div>
                {r.isImmutable && (
                  <span className="text-[10px] bg-slate-200 text-slate-700 rounded px-1.5 py-0.5">
                    LOCKED
                  </span>
                )}
                {r.isBuiltIn && !r.isImmutable && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                    BUILT-IN
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {r._count.userAssignments} member{r._count.userAssignments !== 1 ? 's' : ''} ·{' '}
                {r._count.rolePermissions} permission
                {r._count.rolePermissions !== 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        {selectedId ? (
          <RoleEditor
            roleId={selectedId}
            onDelete={(id) => {
              if (!confirm('Delete this role?')) return;
              deleteMut.mutate(id, {
                onSuccess: () => setSelectedId(null),
                onError: (e) => alert((e as Error).message),
              });
            }}
          />
        ) : (
          <div className="text-slate-500 text-sm">Select a role to view permissions.</div>
        )}
      </div>

      {creating && (
        <NewRoleDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['roles'] });
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

interface PermissionRow {
  id: string;
  subject: string;
  action: string;
  label: string;
  description: string | null;
}

interface RoleDetail extends RoleRow {
  rolePermissions: { permission: PermissionRow; conditions: unknown }[];
  userAssignments: { user: { id: string; email: string; displayName: string } }[];
}

function RoleEditor({
  roleId,
  onDelete,
}: {
  roleId: string;
  onDelete: (id: string) => void;
}) {
  const qc = useQueryClient();
  const roleQ = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => api.get<RoleDetail>(`/roles/${roleId}`),
  });
  const catalogueQ = useQuery({
    queryKey: ['permission-catalogue'],
    queryFn: () => api.get<PermissionRow[]>('/permissions'),
  });

  const [granted, setGranted] = useState<Set<string> | null>(null);
  const key = (s: string, a: string) => `${s}::${a}`;

  const currentGranted = useMemo(() => {
    if (granted) return granted;
    if (!roleQ.data) return new Set<string>();
    return new Set(
      roleQ.data.rolePermissions.map((rp) => key(rp.permission.subject, rp.permission.action)),
    );
  }, [granted, roleQ.data]);

  const grouped = useMemo(() => {
    if (!catalogueQ.data) return new Map<string, PermissionRow[]>();
    const map = new Map<string, PermissionRow[]>();
    for (const p of catalogueQ.data) {
      const arr = map.get(p.subject) ?? [];
      arr.push(p);
      map.set(p.subject, arr);
    }
    return map;
  }, [catalogueQ.data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const perms = catalogueQ.data!
        .filter((p) => currentGranted.has(key(p.subject, p.action)))
        .map((p) => ({ subject: p.subject, action: p.action }));
      return api.patch(`/roles/${roleId}`, { permissions: perms });
    },
    onSuccess: () => {
      setGranted(null);
      qc.invalidateQueries({ queryKey: ['role', roleId] });
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e) => alert((e as Error).message),
  });

  if (!roleQ.data || !catalogueQ.data) return <div className="text-slate-500 text-sm">Loading…</div>;

  const role = roleQ.data;
  const isDirty = granted !== null;
  const editable = !role.isImmutable;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{role.name}</h2>
          <div className="text-xs text-slate-500">{role.key}</div>
          {role.description && (
            <div className="text-sm text-slate-600 mt-1 max-w-xl">{role.description}</div>
          )}
        </div>
        <div className="flex gap-2">
          {editable && isDirty && (
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="text-sm rounded-md bg-brand-500 text-white px-3 py-1.5 hover:bg-brand-700"
            >
              {saveMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          )}
          {editable && !role.isBuiltIn && (
            <button
              onClick={() => onDelete(role.id)}
              className="text-sm rounded-md border border-red-300 text-red-700 px-3 py-1.5 hover:bg-red-50"
            >
              Delete role
            </button>
          )}
        </div>
      </div>

      {!editable && (
        <div className="rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-3 py-2 text-sm">
          This is the immutable Super Admin role — it has unconditional access and
          cannot be edited or deleted.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium">Permissions</div>
        <div className="divide-y divide-slate-100">
          {[...grouped.entries()].map(([subject, perms]) => (
            <div key={subject} className="px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{subject}</div>
              <div className="flex flex-wrap gap-2">
                {perms.map((p) => {
                  const k = key(p.subject, p.action);
                  const on = currentGranted.has(k);
                  return (
                    <label
                      key={k}
                      title={p.description ?? undefined}
                      className={`text-xs px-2 py-1 rounded-full cursor-pointer border select-none ${
                        on
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'border-slate-300 text-slate-700 bg-white'
                      } ${editable ? '' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        disabled={!editable}
                        checked={on}
                        onChange={(e) => {
                          if (!editable) return;
                          const next = new Set(currentGranted);
                          if (e.target.checked) next.add(k);
                          else next.delete(k);
                          setGranted(next);
                        }}
                      />
                      {p.action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-medium">
          Members ({role.userAssignments.length})
        </div>
        <ul className="divide-y divide-slate-100">
          {role.userAssignments.map((ua) => (
            <li key={ua.user.id} className="px-4 py-2 text-sm">
              <span className="font-medium">{ua.user.displayName}</span>{' '}
              <span className="text-slate-500">{ua.user.email}</span>
            </li>
          ))}
          {role.userAssignments.length === 0 && (
            <li className="px-4 py-4 text-sm text-slate-500">No members yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function NewRoleDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/roles', { key, name, description, permissions: [] }),
    onSuccess: (r) => onCreated(r.id),
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New role"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">New role</h2>
        <div className="space-y-3">
          <input
            placeholder="Key (e.g. site_accountant)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <input
            placeholder="Display name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-300">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
