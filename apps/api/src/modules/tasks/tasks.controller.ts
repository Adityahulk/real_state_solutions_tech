import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

interface UnifiedTask {
  kind: 'work_package' | 'plot_checklist_item';
  id: string;
  title: string;
  subtitle: string;
  percentComplete: number;
  status: string;
  deadline: Date | null;
  parentLink: string; // for navigation context
}

/**
 * Engineer-facing "my tasks today" — a unified list across both Module 2
 * (work packages on dev items / plots) and Module 3 (plot checklist items).
 */
@Controller('me')
export class TasksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tasks')
  async myTasks(@CurrentUser() me: RequestUser): Promise<UnifiedTask[]> {
    const [wps, items] = await Promise.all([
      this.prisma.workPackage.findMany({
        where: {
          assignedEngineerId: me.id,
          status: { in: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'] },
        },
        include: {
          devItem: { select: { id: true, label: true, siteId: true } },
        },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.plotChecklistItem.findMany({
        where: {
          assignedEngineerId: me.id,
          status: { in: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD'] },
        },
        include: {
          checklist: {
            include: { plot: { select: { id: true, plotNumber: true, siteId: true } } },
          },
        },
        orderBy: [{ position: 'asc' }, { group: 'asc' }],
      }),
    ]);

    const wpTasks: UnifiedTask[] = wps.map((w) => ({
      kind: 'work_package',
      id: w.id,
      title: w.name,
      subtitle: w.devItem ? `${w.devItem.label}` : 'Plot work',
      percentComplete: Number(w.percentComplete),
      status: w.status,
      deadline: w.deadline,
      parentLink: w.devItem ? `/admin/dev-items/${w.devItem.id}` : '',
    }));
    const itemTasks: UnifiedTask[] = items.map((i) => ({
      kind: 'plot_checklist_item',
      id: i.id,
      title: i.label,
      subtitle: `Plot ${i.checklist.plot.plotNumber} · ${i.group}`,
      percentComplete: Number(i.percentComplete),
      status: i.status,
      deadline: null,
      parentLink: `/admin/plots/${i.checklist.plot.id}/construction`,
    }));

    return [...wpTasks, ...itemTasks].sort((a, b) => {
      const ad = a.deadline ? a.deadline.getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.deadline ? b.deadline.getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
  }
}
