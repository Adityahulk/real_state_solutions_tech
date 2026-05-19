import { describe, expect, it, vi } from 'vitest';
import { AbilityFactory } from './ability.factory';
import type { RequestUser } from '../../modules/auth/current-user.decorator';

const makeFactory = (rolePerms: unknown[] = []) => {
  const prisma = {
    rolePermission: { findMany: vi.fn().mockResolvedValue(rolePerms) },
  } as unknown as ConstructorParameters<typeof AbilityFactory>[0];
  return new AbilityFactory(prisma);
};

const user = (overrides: Partial<RequestUser> = {}): RequestUser => ({
  id: 'u1',
  email: 'a@b.c',
  displayName: 'A',
  roleKeys: [],
  assignments: [],
  ...overrides,
});

describe('AbilityFactory', () => {
  it('super_admin can do anything without DB hits', async () => {
    const factory = makeFactory();
    const a = await factory.createForUser(user({ roleKeys: ['super_admin'] }));
    expect(a.can('manage', 'all')).toBe(true);
    expect(a.can('delete', 'Plot')).toBe(true);
    expect(a.can('export', 'Site.RERAExport')).toBe(true);
  });

  it('grants flat permissions without conditions', async () => {
    const factory = makeFactory([
      {
        roleId: 'r1',
        conditions: null,
        permission: { subject: 'Plot', action: 'read' },
      },
    ]);
    const a = await factory.createForUser(
      user({
        roleKeys: ['admin'],
        assignments: [{ roleId: 'r1', roleKey: 'admin', scope: null }],
      }),
    );
    expect(a.can('read', 'Plot')).toBe(true);
    expect(a.can('delete', 'Plot')).toBe(false);
  });

  it('applies row-level conditions with $user substitution', async () => {
    const factory = makeFactory([
      {
        roleId: 'r1',
        conditions: { ownerUserIds: { $contains: '$user.id' } },
        permission: { subject: 'Plot', action: 'read' },
      },
    ]);
    const a = await factory.createForUser(
      user({
        id: 'u1',
        roleKeys: ['plot_owner'],
        assignments: [{ roleId: 'r1', roleKey: 'plot_owner', scope: null }],
      }),
    );
    const mine = { ownerUserIds: ['u1', 'u2'] };
    const not_mine = { ownerUserIds: ['u3'] };
    expect(a.can('read', 'Plot', mine as never)).toBe(true);
    expect(a.can('read', 'Plot', not_mine as never)).toBe(false);
  });
});
