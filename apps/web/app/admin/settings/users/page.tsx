'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '~/lib/api';

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  roleAssignments: { role: { id: string; key: string; name: string } }[];
}

interface Role {
  id: string;
  key: string;
  name: string;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const usersQ = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get<UserRow[]>(`/users?q=${encodeURIComponent(search)}`),
  });
  const rolesQ = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/roles'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-brand-500 text-white px-3 py-1.5 text-sm hover:bg-brand-700"
        >
          New user
        </button>
      </div>

      <input
        placeholder="Search by email or name…"
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Roles</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usersQ.data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">{u.displayName}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {u.roleAssignments.map((ra) => (
                      <span
                        key={ra.role.id}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                      >
                        {ra.role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      u.isActive ? 'text-emerald-600 text-xs' : 'text-slate-400 text-xs'
                    }
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ImpersonateButton userId={u.id} />
                </td>
              </tr>
            ))}
            {usersQ.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && rolesQ.data && (
        <NewUserDialog
          roles={rolesQ.data}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}

function ImpersonateButton({ userId }: { userId: string }) {
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/impersonate-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (!res.ok) throw new Error(`Impersonate failed (${res.status})`);
    },
    onSuccess: () => {
      // Hard navigate so cookies are picked up on next request.
      window.location.href = '/';
    },
  });
  return (
    <button
      onClick={() => mut.mutate()}
      disabled={mut.isPending}
      className="text-xs text-brand-500 hover:underline disabled:opacity-60"
    >
      {mut.isPending ? 'Switching…' : 'Impersonate'}
    </button>
  );
}

function NewUserDialog({
  roles,
  onClose,
  onCreated,
}: {
  roles: Role[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      api.post('/users', { email, displayName, password, roleIds }),
    onSuccess: onCreated,
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New user"
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">New user</h2>
        <div className="space-y-3">
          <input
            placeholder="Email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Display name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            placeholder="Initial password"
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <div className="text-xs uppercase text-slate-500 mb-1">Roles</div>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <label
                  key={r.id}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    roleIds.includes(r.id)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={roleIds.includes(r.id)}
                    onChange={(e) =>
                      setRoleIds((prev) =>
                        e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id),
                      )
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300"
          >
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
