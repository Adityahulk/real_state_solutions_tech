import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateIssueInput,
  ResolveIssueInput,
} from '@rest/shared-types/schemas';

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateIssueInput, userId: string) {
    if (!input.workPackageId && !input.plotChecklistItemId) {
      throw new BadRequestException('workPackageId or plotChecklistItemId required');
    }
    return this.prisma.issue.create({
      data: {
        workPackageId: input.workPackageId ?? null,
        plotChecklistItemId: input.plotChecklistItemId ?? null,
        title: input.title,
        body: input.body ?? null,
        severity: input.severity,
        raisedById: userId,
        photoDocIds: input.photoDocIds ?? [],
      },
    });
  }

  async resolve(id: string, input: ResolveIssueInput, userId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Issue not found');
    return this.prisma.issue.update({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote ?? null,
        resolvedById: input.status === 'OPEN' ? null : userId,
        resolvedAt: input.status === 'OPEN' ? null : new Date(),
      },
    });
  }

  listOpen() {
    return this.prisma.issue.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        workPackage: { select: { id: true, name: true } },
        plotChecklistItem: { select: { id: true, label: true } },
      },
    });
  }

  listForWorkPackage(workPackageId: string) {
    return this.prisma.issue.findMany({
      where: { workPackageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForChecklistItem(itemId: string) {
    return this.prisma.issue.findMany({
      where: { plotChecklistItemId: itemId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
