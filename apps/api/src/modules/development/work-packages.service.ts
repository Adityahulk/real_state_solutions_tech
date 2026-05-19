import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../../common/casl/ability.factory';
import type {
  CreateWorkPackageInput,
  UpdateWorkPackageInput,
} from '@rest/shared-types/schemas';
import type { RequestUser } from '../auth/current-user.decorator';

@Injectable()
export class WorkPackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async create(input: CreateWorkPackageInput) {
    if (input.devItemId) {
      const item = await this.prisma.developmentItem.findUnique({
        where: { id: input.devItemId },
      });
      if (!item) throw new NotFoundException('DevItem not found');
    }
    if (input.plotId) {
      const plot = await this.prisma.plot.findUnique({ where: { id: input.plotId } });
      if (!plot) throw new NotFoundException('Plot not found');
    }
    return this.prisma.workPackage.create({
      data: {
        devItemId: input.devItemId ?? null,
        plotId: input.plotId ?? null,
        name: input.name,
        vendorId: input.vendorId ?? null,
        assignedEngineerId: input.assignedEngineerId ?? null,
        budget: input.budget ?? null,
        deadline: input.deadline ? new Date(input.deadline) : null,
      },
    });
  }

  async update(id: string, input: UpdateWorkPackageInput) {
    const wp = await this.prisma.workPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException('Work package not found');
    return this.prisma.workPackage.update({
      where: { id },
      data: {
        name: input.name,
        vendorId: input.vendorId,
        assignedEngineerId: input.assignedEngineerId,
        budget: input.budget,
        deadline:
          input.deadline === undefined ? undefined : input.deadline ? new Date(input.deadline) : null,
        status: input.status,
      },
    });
  }

  async getById(id: string) {
    const wp = await this.prisma.workPackage.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true } },
        devItem: { select: { id: true, label: true, siteId: true } },
        progressUpdates: { orderBy: { capturedAt: 'desc' }, take: 50 },
        issues: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!wp) throw new NotFoundException('Work package not found');
    return wp;
  }

  /**
   * Ensures the requester (typically a site engineer) is allowed to *update*
   * this work package given row-level conditions.
   */
  async assertUpdatable(id: string, user: RequestUser) {
    const wp = await this.prisma.workPackage.findUnique({ where: { id } });
    if (!wp) throw new NotFoundException('Work package not found');
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('update', 'WorkPackage', wp as never)) {
      throw new ForbiddenException('Not allowed to update this work package');
    }
    return wp;
  }
}
