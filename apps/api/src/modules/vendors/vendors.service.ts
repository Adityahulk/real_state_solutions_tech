import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateVendorInput } from '@rest/shared-types';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { workPackages: true } } },
    });
  }

  async getById(id: string) {
    const v = await this.prisma.vendor.findUnique({
      where: { id },
      include: { workPackages: { orderBy: { createdAt: 'desc' } } },
    });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  create(input: CreateVendorInput) {
    return this.prisma.vendor.create({ data: input });
  }

  update(id: string, input: Partial<CreateVendorInput>) {
    return this.prisma.vendor.update({ where: { id }, data: input });
  }
}
