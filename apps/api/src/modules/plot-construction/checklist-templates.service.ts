import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateChecklistTemplateInput,
  UpdateChecklistTemplateInput,
} from '@rest/shared-types';

@Injectable()
export class ChecklistTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.checklistTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { items: true, instances: true } } },
    });
  }

  async getById(id: string) {
    const t = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: [{ group: 'asc' }, { position: 'asc' }] } },
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(input: CreateChecklistTemplateInput) {
    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.checklistTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      const tpl = await tx.checklistTemplate.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault,
          items: { create: input.items },
        },
      });
      return tpl;
    });
  }

  async update(id: string, input: UpdateChecklistTemplateInput) {
    const existing = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.checklistTemplate.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      const tpl = await tx.checklistTemplate.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          isDefault: input.isDefault,
        },
      });
      if (input.items) {
        await tx.checklistTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.checklistTemplateItem.createMany({
          data: input.items.map((i) => ({ ...i, templateId: id })),
        });
      }
      return tpl;
    });
  }
}
