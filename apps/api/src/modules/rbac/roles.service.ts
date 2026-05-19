import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from '@rest/shared-types/schemas';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { userAssignments: true, rolePermissions: true } },
      },
    });
  }

  async getById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        userAssignments: {
          include: { user: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(input: CreateRoleInput, actorId: string) {
    const existing = await this.prisma.role.findUnique({ where: { key: input.key } });
    if (existing) throw new ConflictException('Role key already exists');

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          isBuiltIn: false,
          isImmutable: false,
          createdById: actorId,
        },
      });
      await this.replacePermissions(tx, role.id, input.permissions);
      await tx.roleAuditLog.create({
        data: {
          actorId,
          action: 'role.create',
          targetRoleId: role.id,
          payload: { key: role.key, name: role.name },
        },
      });
      return role;
    });
  }

  async update(id: string, input: UpdateRoleInput, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isImmutable) {
      throw new ForbiddenException('This role is immutable and cannot be edited.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
        },
      });
      if (input.permissions) {
        await this.replacePermissions(tx, id, input.permissions);
      }
      await tx.roleAuditLog.create({
        data: {
          actorId,
          action: 'role.update',
          targetRoleId: id,
          payload: input as object,
        },
      });
      return updated;
    });
  }

  async delete(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userAssignments: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isImmutable) {
      throw new ForbiddenException('This role is immutable and cannot be deleted.');
    }
    if (role.isBuiltIn) {
      throw new ForbiddenException(
        'Built-in roles cannot be deleted. Edit permissions instead.',
      );
    }
    if (role._count.userAssignments > 0) {
      throw new BadRequestException(
        'Cannot delete a role that still has members. Re-assign them first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { id } });
      await tx.roleAuditLog.create({
        data: { actorId, action: 'role.delete', targetRoleId: id },
      });
    });
  }

  private async replacePermissions(
    tx: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    roleId: string,
    perms: { subject: string; action: string; conditions?: Record<string, unknown> | null }[],
  ) {
    // resolve subject/action to permissionId
    const dbPerms = await (tx as PrismaService).permission.findMany({
      where: {
        OR: perms.map((p) => ({ subject: p.subject, action: p.action })),
      },
    });
    const keyOf = (s: string, a: string) => `${s}::${a}`;
    const byKey = new Map(dbPerms.map((p) => [keyOf(p.subject, p.action), p]));

    const missing = perms.filter((p) => !byKey.has(keyOf(p.subject, p.action)));
    if (missing.length) {
      throw new BadRequestException(
        `Unknown permissions: ${missing.map((m) => `${m.subject}:${m.action}`).join(', ')}`,
      );
    }

    await (tx as PrismaService).rolePermission.deleteMany({ where: { roleId } });
    if (perms.length) {
      await (tx as PrismaService).rolePermission.createMany({
        data: perms.map((p) => ({
          roleId,
          permissionId: byKey.get(keyOf(p.subject, p.action))!.id,
          conditions: (p.conditions ?? null) as object | null,
        })),
      });
    }
  }
}
