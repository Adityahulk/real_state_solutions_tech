import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSiteInput } from '@rest/shared-types';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.site.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { plots: true, developmentItems: true } },
      },
    });
  }

  async getById(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        cadDrawings: { orderBy: { version: 'desc' } },
        _count: { select: { plots: true, developmentItems: true } },
      },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async create(input: CreateSiteInput) {
    const dupe = await this.prisma.site.findUnique({ where: { code: input.code } });
    if (dupe) throw new ConflictException('Site code already in use');
    return this.prisma.site.create({ data: input });
  }
}
