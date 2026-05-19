import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ReraReport {
  meta: {
    site: { id: string; name: string; code: string; reraNumber: string | null };
    year: number;
    quarter: number;
    quarterStart: string;
    quarterEnd: string;
    generatedAt: string;
  };
  inventory: {
    totalPlots: number;
    statusCounts: Record<string, number>;
  };
  allotments: {
    inQuarter: number;
    cumulative: number;
    plotsAllotted: { plotId: string; plotNumber: string; allottedAt: string; salePrice: number }[];
  };
  transfers: {
    approvedInQuarter: number;
    rows: { plotId: string; plotNumber: string; approvedAt: string; salePrice: number }[];
  };
  financials: {
    collectedInQuarter: number;
    cumulativeCollected: number;
    overdue: { count: number; amount: number };
  };
  development: {
    items: {
      id: string;
      kind: string;
      label: string;
      status: string;
      averageProgress: number;
    }[];
    overallProgress: number;
  };
  construction: {
    plotsUnderConstruction: number;
    averageCompletion: number;
  };
}

function quarterBounds(year: number, q: number): { start: Date; end: Date } {
  const startMonth = (q - 1) * 3; // 0,3,6,9
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));
  return { start, end };
}

@Injectable()
export class ReraService {
  constructor(private readonly prisma: PrismaService) {}

  async build(siteId: string, year: number, quarter: number): Promise<ReraReport> {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');
    const { start, end } = quarterBounds(year, quarter);

    const [
      plots,
      allotmentsInQuarter,
      allotmentsCumulative,
      transfersInQuarter,
      paidInQuarter,
      paidCumulative,
      overdue,
      devItems,
      construction,
    ] = await Promise.all([
      this.prisma.plot.findMany({
        where: { siteId },
        select: { id: true, plotNumber: true, status: true },
      }),
      this.prisma.allotment.findMany({
        where: {
          plot: { siteId },
          allottedAt: { gte: start, lt: end },
        },
        include: { plot: { select: { id: true, plotNumber: true } } },
        orderBy: { allottedAt: 'asc' },
      }),
      this.prisma.allotment.count({
        where: { plot: { siteId }, allottedAt: { lt: end } },
      }),
      this.prisma.transfer.findMany({
        where: {
          plot: { siteId },
          status: 'approved',
          approvedAt: { gte: start, lt: end },
        },
        include: { plot: { select: { id: true, plotNumber: true } } },
      }),
      this.prisma.paymentSchedule.aggregate({
        _sum: { amount: true },
        where: {
          allotment: { plot: { siteId } },
          status: 'paid',
          paidAt: { gte: start, lt: end },
        },
      }),
      this.prisma.paymentSchedule.aggregate({
        _sum: { amount: true },
        where: {
          allotment: { plot: { siteId } },
          status: 'paid',
          paidAt: { lt: end },
        },
      }),
      this.prisma.paymentSchedule.aggregate({
        _sum: { amount: true },
        _count: true,
        where: {
          allotment: { plot: { siteId } },
          status: { not: 'paid' },
          dueDate: { lt: end },
        },
      }),
      this.prisma.developmentItem.findMany({
        where: { siteId },
        include: { workPackages: { select: { percentComplete: true } } },
      }),
      this.prisma.plotChecklist.findMany({
        where: { plot: { siteId } },
        include: { items: { select: { percentComplete: true } } },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const p of plots) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;

    const devItemsOut = devItems.map((d) => {
      const wps = d.workPackages;
      const avg =
        wps.length === 0
          ? 0
          : wps.reduce((s, w) => s + Number(w.percentComplete), 0) / wps.length;
      return {
        id: d.id,
        kind: d.kind,
        label: d.label,
        status: d.status,
        averageProgress: Math.round(avg * 100) / 100,
      };
    });
    const overallDev =
      devItemsOut.length === 0
        ? 0
        : devItemsOut.reduce((s, d) => s + d.averageProgress, 0) / devItemsOut.length;

    const plotProgressList = construction
      .map((c) =>
        c.items.length === 0
          ? null
          : c.items.reduce((s, i) => s + Number(i.percentComplete), 0) / c.items.length,
      )
      .filter((x): x is number => x != null);
    const avgPlotCompletion =
      plotProgressList.length === 0
        ? 0
        : plotProgressList.reduce((s, x) => s + x, 0) / plotProgressList.length;

    return {
      meta: {
        site: { id: site.id, name: site.name, code: site.code, reraNumber: site.reraNumber },
        year,
        quarter,
        quarterStart: start.toISOString(),
        quarterEnd: end.toISOString(),
        generatedAt: new Date().toISOString(),
      },
      inventory: { totalPlots: plots.length, statusCounts },
      allotments: {
        inQuarter: allotmentsInQuarter.length,
        cumulative: allotmentsCumulative,
        plotsAllotted: allotmentsInQuarter.map((a) => ({
          plotId: a.plot.id,
          plotNumber: a.plot.plotNumber,
          allottedAt: a.allottedAt.toISOString(),
          salePrice: Number(a.salePrice),
        })),
      },
      transfers: {
        approvedInQuarter: transfersInQuarter.length,
        rows: transfersInQuarter.map((t) => ({
          plotId: t.plot.id,
          plotNumber: t.plot.plotNumber,
          approvedAt: t.approvedAt!.toISOString(),
          salePrice: Number(t.salePrice),
        })),
      },
      financials: {
        collectedInQuarter: Number(paidInQuarter._sum.amount ?? 0),
        cumulativeCollected: Number(paidCumulative._sum.amount ?? 0),
        overdue: {
          count: overdue._count,
          amount: Number(overdue._sum.amount ?? 0),
        },
      },
      development: { items: devItemsOut, overallProgress: Math.round(overallDev * 100) / 100 },
      construction: {
        plotsUnderConstruction: plotProgressList.length,
        averageCompletion: Math.round(avgPlotCompletion * 100) / 100,
      },
    };
  }
}
