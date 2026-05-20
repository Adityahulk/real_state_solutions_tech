import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BootstrapPlotChecklistInput } from '@rest/shared-types';

@Injectable()
export class PlotConstructionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fork a ChecklistTemplate into a new PlotChecklist for a plot. If
   * `templateId` is omitted, the default template is used. Each template item
   * becomes a PlotChecklistItem at 0%.
   */
  async bootstrap(input: BootstrapPlotChecklistInput) {
    const plot = await this.prisma.plot.findUnique({ where: { id: input.plotId } });
    if (!plot) throw new NotFoundException('Plot not found');

    const existing = await this.prisma.plotChecklist.findUnique({
      where: { plotId: plot.id },
    });
    if (existing) {
      throw new BadRequestException('Plot already has a checklist');
    }

    const tpl = input.templateId
      ? await this.prisma.checklistTemplate.findUnique({
          where: { id: input.templateId },
          include: { items: true },
        })
      : await this.prisma.checklistTemplate.findFirst({
          where: { isDefault: true },
          include: { items: true },
        });

    if (!tpl) {
      throw new BadRequestException(
        'No template available. Create one (or set a default) and try again.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const checklist = await tx.plotChecklist.create({
        data: { plotId: plot.id, templateId: tpl.id },
      });
      await tx.plotChecklistItem.createMany({
        data: tpl.items.map((i) => ({
          checklistId: checklist.id,
          group: i.group,
          label: i.label,
          description: i.description,
          position: i.position,
        })),
      });
      await tx.plot.update({
        where: { id: plot.id },
        data: { status: 'UNDER_CONSTRUCTION' },
      });
      return tx.plotChecklist.findUnique({
        where: { id: checklist.id },
        include: { items: { orderBy: [{ group: 'asc' }, { position: 'asc' }] } },
      });
    });
  }

  async getByPlot(plotId: string) {
    const checklist = await this.prisma.plotChecklist.findUnique({
      where: { plotId },
      include: {
        items: { orderBy: [{ group: 'asc' }, { position: 'asc' }] },
        template: { select: { id: true, name: true } },
      },
    });
    return checklist; // may be null if not yet bootstrapped
  }

  async assignEngineer(itemId: string, engineerId: string | null) {
    return this.prisma.plotChecklistItem.update({
      where: { id: itemId },
      data: { assignedEngineerId: engineerId },
    });
  }
}
