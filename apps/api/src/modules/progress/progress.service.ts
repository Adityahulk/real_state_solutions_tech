import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../../common/casl/ability.factory';
import type { CreateProgressUpdateInput } from '@rest/shared-types';
import type { RequestUser } from '../auth/current-user.decorator';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  /**
   * Records a progress event and updates the parent's denormalised
   * `percentComplete` + `status`. Both writes are atomic.
   */
  async record(input: CreateProgressUpdateInput, user: RequestUser) {
    if (input.workPackageId === undefined && input.plotChecklistItemId === undefined) {
      throw new BadRequestException('workPackageId or plotChecklistItemId required');
    }

    return this.prisma.$transaction(async (tx) => {
      // Authorisation: row-level enforcement against the parent entity.
      const ability = await this.abilityFactory.createForUser(user);

      if (input.workPackageId) {
        const wp = await tx.workPackage.findUnique({ where: { id: input.workPackageId } });
        if (!wp) throw new NotFoundException('Work package not found');
        if (!ability.can('update', 'WorkPackage', wp as never)) {
          throw new ForbiddenException('Not allowed to update this work package');
        }
        await tx.workPackage.update({
          where: { id: wp.id },
          data: {
            percentComplete: input.percentAfter,
            status: input.percentAfter >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
          },
        });
      } else if (input.plotChecklistItemId) {
        const item = await tx.plotChecklistItem.findUnique({
          where: { id: input.plotChecklistItemId },
        });
        if (!item) throw new NotFoundException('Checklist item not found');
        if (!ability.can('update', 'PlotConstruction', item as never)) {
          throw new ForbiddenException('Not allowed to update this item');
        }
        await tx.plotChecklistItem.update({
          where: { id: item.id },
          data: {
            percentComplete: input.percentAfter,
            status: input.percentAfter >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
          },
        });
      }

      return tx.progressUpdate.create({
        data: {
          workPackageId: input.workPackageId ?? null,
          plotChecklistItemId: input.plotChecklistItemId ?? null,
          authorId: user.id,
          percentAfter: input.percentAfter,
          note: input.note ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          photoDocIds: input.photoDocIds ?? [],
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
        },
      });
    });
  }

  listForWorkPackage(workPackageId: string) {
    return this.prisma.progressUpdate.findMany({
      where: { workPackageId },
      orderBy: { capturedAt: 'desc' },
      take: 200,
    });
  }

  listForChecklistItem(plotChecklistItemId: string) {
    return this.prisma.progressUpdate.findMany({
      where: { plotChecklistItemId },
      orderBy: { capturedAt: 'desc' },
      take: 200,
    });
  }
}
