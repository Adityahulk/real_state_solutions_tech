import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../auth/auth.service';
import type {
  CreateUserInput,
  UpdateUserInput,
} from '@rest/shared-types/schemas';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: { search?: string; activeOnly?: boolean } = {}) {
    return this.prisma.user.findMany({
      where: {
        isActive: opts.activeOnly ? true : undefined,
        OR: opts.search
          ? [
              { email: { contains: opts.search, mode: 'insensitive' } },
              { displayName: { contains: opts.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        roleAssignments: {
          include: { role: { select: { id: true, key: true, name: true } } },
        },
      },
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roleAssignments: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(input: CreateUserInput, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = hashPassword(input.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          phone: input.phone ?? null,
          passwordHash,
        },
      });

      if (input.roleIds.length) {
        const roles = await tx.role.findMany({ where: { id: { in: input.roleIds } } });
        if (roles.length !== input.roleIds.length) {
          throw new BadRequestException('One or more roleIds do not exist');
        }
        await tx.userRoleAssignment.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
            createdBy: actorId,
          })),
        });
        for (const roleId of input.roleIds) {
          await tx.roleAuditLog.create({
            data: {
              actorId,
              action: 'role.assign',
              targetUserId: user.id,
              targetRoleId: roleId,
            },
          });
        }
      }
      return user;
    });
  }

  async update(id: string, input: UpdateUserInput) {
    await this.getById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        phone: input.phone,
        isActive: input.isActive,
      },
    });
  }

  /**
   * "Delete" = deactivate. Hard delete is intentionally not exposed.
   */
  async deactivate(id: string, actorId: string) {
    const user = await this.getById(id);

    // Refuse to deactivate the last active super admin.
    if (user.roleAssignments.some((ra) => ra.role.key === 'super_admin')) {
      const otherActiveSupers = await this.prisma.user.count({
        where: {
          id: { not: id },
          isActive: true,
          roleAssignments: { some: { role: { key: 'super_admin' } } },
        },
      });
      if (otherActiveSupers === 0) {
        throw new BadRequestException(
          'Cannot deactivate the last active super admin.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
