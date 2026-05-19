import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../../common/casl/ability.factory';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class PermissionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  /** Catalogue of every (subject, action) the code knows about. */
  @Get('permissions')
  @CheckAbilities({ action: 'read', subject: 'Role' })
  catalogue() {
    return this.prisma.permission.findMany({
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
    });
  }

  /** Permission Inspector: resolved ability matrix for a target user. */
  @Get('users/:id/abilities')
  @CheckAbilities({ action: 'read', subject: 'Role' })
  async abilitiesForUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: { include: { role: true } } },
    });
    if (!user) return { matrix: [], roleKeys: [] };

    const ru: RequestUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roleKeys: user.roleAssignments.map((ra) => ra.role.key),
      assignments: user.roleAssignments.map((ra) => ({
        roleId: ra.roleId,
        roleKey: ra.role.key,
        scope: ra.scope as Record<string, unknown> | null,
      })),
    };
    return {
      roleKeys: ru.roleKeys,
      matrix: await this.abilityFactory.resolveMatrix(ru),
    };
  }

  /** "What can I do?" — quick endpoint for the current session. */
  @Get('me/abilities')
  async myAbilities(@CurrentUser() me: RequestUser) {
    return {
      user: { id: me.id, email: me.email, displayName: me.displayName },
      roleKeys: me.roleKeys,
      matrix: await this.abilityFactory.resolveMatrix(me),
      impersonatedBy: me.impersonatedBy ?? null,
    };
  }
}
