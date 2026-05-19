import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { PlotsService } from './plots.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { AbilityFactory } from '../../common/casl/ability.factory';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class PlotsController {
  constructor(
    private readonly plots: PlotsService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  @Get('sites/:siteId/plots')
  @CheckAbilities({ action: 'read', subject: 'Plot' })
  list(@Param('siteId') siteId: string, @CurrentUser() me: RequestUser) {
    const restrict = ownerScopedUserId(me);
    return this.plots.listForSite(siteId, restrict ? { restrictToOwnerUserId: restrict } : {});
  }

  @Get('sites/:siteId/plots.geojson')
  @CheckAbilities({ action: 'read', subject: 'Plot' })
  geojson(@Param('siteId') siteId: string, @CurrentUser() me: RequestUser) {
    // Plot owners get filtered to their own plots only; everyone else sees all.
    const restrict = ownerScopedUserId(me);
    return this.plots.siteFeatureCollection(
      siteId,
      restrict ? { restrictToOwnerUserId: restrict } : {},
    );
  }

  @Get('plots/:id')
  @CheckAbilities({ action: 'read', subject: 'Plot' })
  async get(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    // Row-level check: enforce plot_owner condition.
    const plot = await this.plots.getById(id);
    const ability = await this.abilityFactory.createForUser(me);
    const ownerUserIds = await this.plots.ownerUserIds(id);
    const subject = { ...plot, ownerUserIds } as unknown as Record<string, unknown>;
    if (!ability.can('read', 'Plot', subject as never)) {
      throw new ForbiddenException('Not allowed to read this plot');
    }
    return plot;
  }

  @Get('plots/:id/timeline')
  @CheckAbilities({ action: 'read', subject: 'Plot' })
  async timeline(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    const ability = await this.abilityFactory.createForUser(me);
    const ownerUserIds = await this.plots.ownerUserIds(id);
    if (!ability.can('read', 'Plot', { id, ownerUserIds } as never)) {
      throw new ForbiddenException();
    }
    return this.plots.timeline(id);
  }

  @Get('me/plots')
  myPlots(@CurrentUser() me: RequestUser) {
    return this.plots.listMine(me.id);
  }

  @Get('plots/:id/summary')
  @CheckAbilities({ action: 'read', subject: 'Plot' })
  async summary(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    const ability = await this.abilityFactory.createForUser(me);
    const ownerUserIds = await this.plots.ownerUserIds(id);
    if (!ability.can('read', 'Plot', { id, ownerUserIds } as never)) {
      throw new ForbiddenException();
    }
    return this.plots.summary(id);
  }
}

/**
 * If the user is *only* a plot_owner (no admin-ish role), restrict any
 * site-scoped list endpoint to their own plots. Returns the userId to pass to
 * the service, or null when no restriction is needed.
 */
function ownerScopedUserId(me: RequestUser): string | null {
  const isOwner = me.roleKeys.includes('plot_owner');
  const hasAdminish = me.roleKeys.some((k) =>
    ['super_admin', 'admin', 'site_engineer', 'marketing_head'].includes(k),
  );
  return isOwner && !hasAdminish ? me.id : null;
}
