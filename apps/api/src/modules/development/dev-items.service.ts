import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateDevItemInput,
  UpdateDevItemInput,
} from '@rest/shared-types';

@Injectable()
export class DevItemsService {
  constructor(private readonly prisma: PrismaService) {}

  listForSite(siteId: string) {
    return this.prisma.developmentItem.findMany({
      where: { siteId },
      orderBy: [{ kind: 'asc' }, { label: 'asc' }],
      include: {
        workPackages: {
          orderBy: { createdAt: 'asc' },
          include: {
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * GeoJSON FeatureCollection of every dev item with geometry on this site.
   * Used by the Module 2 layer toggle.
   */
  async siteFeatureCollection(siteId: string) {
    const rows = await this.prisma.developmentItem.findMany({
      where: { siteId, NOT: { geometry: { equals: Prisma.DbNull } } },
      select: {
        id: true,
        kind: true,
        label: true,
        status: true,
        geometry: true,
      },
    });
    const features = rows.map((r) => ({
      type: 'Feature' as const,
      id: r.id,
      properties: {
        kind: r.kind,
        label: r.label,
        status: r.status,
      },
      geometry: r.geometry as unknown,
    }));
    return { type: 'FeatureCollection' as const, features };
  }

  async getById(id: string) {
    const item = await this.prisma.developmentItem.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, code: true } },
        workPackages: {
          orderBy: { createdAt: 'asc' },
          include: {
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Dev item not found');
    return item;
  }

  create(input: CreateDevItemInput) {
    return this.prisma.developmentItem.create({
      data: {
        siteId: input.siteId,
        kind: input.kind,
        label: input.label,
        geometry: (input.geometry ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        deadline: input.deadline ? new Date(input.deadline) : null,
      },
    });
  }

  update(id: string, input: UpdateDevItemInput) {
    return this.prisma.developmentItem.update({
      where: { id },
      data: {
        label: input.label,
        status: input.status,
        deadline: input.deadline === undefined ? undefined : input.deadline ? new Date(input.deadline) : null,
      },
    });
  }
}
