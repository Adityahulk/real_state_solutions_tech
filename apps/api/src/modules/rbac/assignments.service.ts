import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AssignRoleInput } from '@rest/shared-types';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(input: AssignRoleInput, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = await this.prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const scope: Prisma.InputJsonValue | typeof Prisma.JsonNull = (input.scope ??
      Prisma.JsonNull) as unknown as Prisma.InputJsonValue;
    try {
      const assignment = await this.prisma.userRoleAssignment.create({
        data: {
          userId: input.userId,
          roleId: input.roleId,
          scope,
          createdBy: actorId,
        },
      });
      await this.prisma.roleAuditLog.create({
        data: {
          actorId,
          action: 'role.assign',
          targetUserId: input.userId,
          targetRoleId: input.roleId,
          payload: input.scope
            ? (input.scope as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
      return assignment;
    } catch (e: unknown) {
      if (typeof e === 'object' && e && (e as { code?: string }).code === 'P2002') {
        throw new ConflictException('User already has this role with this scope');
      }
      throw e;
    }
  }

  async unassign(assignmentId: string, actorId: string) {
    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Invariant: never remove the last super_admin from the system.
    if (assignment.role.key === 'super_admin') {
      const remaining = await this.prisma.userRoleAssignment.count({
        where: {
          role: { key: 'super_admin' },
          id: { not: assignmentId },
          user: { isActive: true },
        },
      });
      if (remaining === 0) {
        throw new BadRequestException(
          'Cannot remove the last super admin assignment.',
        );
      }
    }

    await this.prisma.userRoleAssignment.delete({ where: { id: assignmentId } });
    await this.prisma.roleAuditLog.create({
      data: {
        actorId,
        action: 'role.unassign',
        targetUserId: assignment.userId,
        targetRoleId: assignment.roleId,
      },
    });
  }
}
