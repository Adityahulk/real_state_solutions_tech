import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';

function makePrisma(opts: {
  role?: Partial<{ id: string; isImmutable: boolean; isBuiltIn: boolean; _count: { userAssignments: number } }>;
}) {
  return {
    role: {
      findUnique: vi.fn().mockResolvedValue(opts.role ?? null),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    $transaction: vi.fn().mockImplementation(async (fn: never) => {
      // Pass-through transaction
      return (fn as unknown as (tx: unknown) => unknown)({
        role: { delete: vi.fn().mockResolvedValue(undefined) },
        roleAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
      });
    }),
  } as unknown as ConstructorParameters<typeof RolesService>[0];
}

describe('RolesService.delete invariants', () => {
  it('refuses to delete an immutable role (super_admin)', async () => {
    const svc = new RolesService(
      makePrisma({
        role: { id: 'r1', isImmutable: true, isBuiltIn: true, _count: { userAssignments: 0 } },
      }),
    );
    await expect(svc.delete('r1', 'actor')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to delete a built-in role even if mutable', async () => {
    const svc = new RolesService(
      makePrisma({
        role: { id: 'r2', isImmutable: false, isBuiltIn: true, _count: { userAssignments: 0 } },
      }),
    );
    await expect(svc.delete('r2', 'actor')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to delete a role that still has members', async () => {
    const svc = new RolesService(
      makePrisma({
        role: { id: 'r3', isImmutable: false, isBuiltIn: false, _count: { userAssignments: 3 } },
      }),
    );
    await expect(svc.delete('r3', 'actor')).rejects.toBeInstanceOf(BadRequestException);
  });
});
