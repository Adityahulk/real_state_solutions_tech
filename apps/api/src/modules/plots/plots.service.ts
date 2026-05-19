import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GeoJSON FeatureCollection of plots in the site, with status colour-coding.
   *
   * Server-side authorisation: if `restrictToOwnerUserId` is set (i.e. the
   * caller is a plot_owner without admin abilities), only their plots come
   * back. Without that filter, this previously returned every plot in the
   * site regardless of CASL conditions — a real data leak.
   */
  async siteFeatureCollection(
    siteId: string,
    opts: { restrictToOwnerUserId?: string } = {},
  ) {
    let rows: Array<{
      id: string;
      plot_number: string;
      status: string;
      area_sqft: number | null;
      geom: string | null;
    }>;

    if (opts.restrictToOwnerUserId) {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT p.id, p."plotNumber" as plot_number, p.status::text, p."areaSqft" as area_sqft,
                CASE WHEN p.geometry IS NULL THEN NULL ELSE ST_AsGeoJSON(p.geometry) END AS geom
         FROM "Plot" p
         WHERE p."siteId" = $1::uuid
           AND EXISTS (
             SELECT 1 FROM "Allotment" a
             JOIN "OwnerShare" os ON os."allotmentId" = a.id
             JOIN "Person" pe ON pe.id = os."personId"
             JOIN "User" u ON u."personId" = pe.id
             WHERE a."plotId" = p.id AND a.status = 'active' AND u.id = $2::uuid
           )`,
        siteId,
        opts.restrictToOwnerUserId,
      );
    } else {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT id, "plotNumber" as plot_number, status::text, "areaSqft" as area_sqft,
                CASE WHEN geometry IS NULL THEN NULL ELSE ST_AsGeoJSON(geometry) END AS geom
         FROM "Plot"
         WHERE "siteId" = $1::uuid`,
        siteId,
      );
    }

    const features = rows
      .filter((r) => r.geom)
      .map((r) => ({
        type: 'Feature' as const,
        id: r.id,
        properties: {
          plotNumber: r.plot_number,
          status: r.status,
          areaSqft: r.area_sqft,
        },
        geometry: JSON.parse(r.geom as string),
      }));

    return { type: 'FeatureCollection' as const, features };
  }

  async listForSite(
    siteId: string,
    opts: { restrictToOwnerUserId?: string } = {},
  ) {
    return this.prisma.plot.findMany({
      where: {
        siteId,
        ...(opts.restrictToOwnerUserId
          ? {
              allotments: {
                some: {
                  status: 'active',
                  ownerShares: {
                    some: { person: { user: { id: opts.restrictToOwnerUserId } } },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: { plotNumber: 'asc' },
      include: {
        allotments: {
          where: { status: 'active' },
          include: {
            ownerShares: {
              include: {
                person: { select: { id: true, fullName: true } },
                company: { select: { id: true, legalName: true } },
              },
            },
          },
        },
      },
    });
  }

  async getById(id: string) {
    const plot = await this.prisma.plot.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, code: true } },
        allotments: {
          orderBy: { allottedAt: 'desc' },
          include: {
            ownerShares: {
              include: {
                person: true,
                company: true,
              },
            },
            payments: { orderBy: { dueDate: 'asc' } },
          },
        },
        transfers: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    return plot;
  }

  /**
   * Plot timeline view — a derived stream from AuditLog filtered to this plot,
   * plus structured allotment/transfer/payment events for richer rendering.
   */
  async timeline(plotId: string) {
    const plot = await this.getById(plotId);
    const events: Array<{
      kind: string;
      at: Date;
      data: Record<string, unknown>;
    }> = [];

    for (const a of plot.allotments) {
      events.push({
        kind: a.status === 'active' ? 'allotment.active' : 'allotment.superseded',
        at: a.allottedAt,
        data: {
          allotmentId: a.id,
          salePrice: a.salePrice,
          shares: a.ownerShares.map((s) => ({
            name: s.person?.fullName ?? s.company?.legalName ?? 'Unknown',
            percent: s.sharePercent,
          })),
        },
      });
    }
    for (const t of plot.transfers) {
      events.push({
        kind: `transfer.${t.status}`,
        at: t.createdAt,
        data: { transferId: t.id, salePrice: t.salePrice },
      });
    }

    // Pull the system audit entries too
    const audit = await this.prisma.auditLog.findMany({
      where: { entityType: 'Plot', entityId: plotId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    for (const a of audit) {
      events.push({
        kind: `audit.${a.action}`,
        at: a.createdAt,
        data: { id: a.id, actorId: a.actorId },
      });
    }

    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return events;
  }

  /**
   * Returns the userIds that "own" this plot via the active allotment —
   * used by CASL conditions for the plot_owner role.
   */
  /**
   * Compact, single-call read model for the Site Console side panel. Returns
   * just enough data to render a plot card without further fetches: current
   * allotment with owners, payment status totals, e-sign summary, construction
   * % rollup. ~1 KB per plot — safe to fetch on every click.
   */
  async summary(plotId: string) {
    const plot = await this.prisma.plot.findUnique({
      where: { id: plotId },
      include: {
        site: { select: { id: true, name: true, code: true } },
        allotments: {
          where: { status: 'active' },
          include: {
            ownerShares: {
              include: {
                person: { select: { id: true, fullName: true } },
                company: { select: { id: true, legalName: true } },
              },
            },
            payments: { select: { amount: true, status: true } },
          },
        },
      },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    const a = plot.allotments[0];
    const checklist = await this.prisma.plotChecklist.findUnique({
      where: { plotId },
      include: { items: { select: { percentComplete: true } } },
    });
    let constructionPct: number | null = null;
    if (checklist && checklist.items.length > 0) {
      constructionPct =
        Math.round(
          (checklist.items.reduce((s, i) => s + Number(i.percentComplete), 0) /
            checklist.items.length) *
            10,
        ) / 10;
    }
    let totalDue = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    if (a) {
      for (const p of a.payments) {
        const amt = Number(p.amount);
        totalDue += amt;
        if (p.status === 'paid') totalPaid += amt;
        else if (p.status === 'overdue') overdueCount++;
      }
    }
    let signStatus: string | null = null;
    if (a?.allotmentLetterDocId) {
      const doc = await this.prisma.document.findUnique({
        where: { id: a.allotmentLetterDocId },
        select: { signStatus: true },
      });
      signStatus = doc?.signStatus ?? null;
    }
    return {
      id: plot.id,
      plotNumber: plot.plotNumber,
      site: plot.site,
      status: plot.status,
      areaSqft: plot.areaSqft ? Number(plot.areaSqft) : null,
      registryStatus: plot.registryStatus,
      allotment: a
        ? {
            id: a.id,
            salePrice: Number(a.salePrice),
            allottedAt: a.allottedAt,
            owners: a.ownerShares.map((s) => ({
              name: s.person?.fullName ?? s.company?.legalName ?? 'Unknown',
              sharePercent: Number(s.sharePercent),
            })),
            payments: { totalDue, totalPaid, overdueCount },
            allotmentLetterDocId: a.allotmentLetterDocId,
            signStatus,
          }
        : null,
      construction: {
        hasChecklist: !!checklist,
        averagePercent: constructionPct,
      },
    };
  }

  async listMine(userId: string) {
    return this.prisma.plot.findMany({
      where: {
        allotments: {
          some: {
            status: 'active',
            ownerShares: { some: { person: { user: { id: userId } } } },
          },
        },
      },
      orderBy: [{ site: { code: 'asc' } }, { plotNumber: 'asc' }],
      include: {
        site: { select: { id: true, name: true } },
        allotments: {
          where: { status: 'active' },
          include: {
            ownerShares: {
              include: { person: { select: { id: true, fullName: true } } },
            },
            payments: { orderBy: { dueDate: 'asc' } },
          },
        },
      },
    });
  }

  async ownerUserIds(plotId: string): Promise<string[]> {
    const rows = await this.prisma.ownerShare.findMany({
      where: { allotment: { plotId, status: 'active' } },
      include: { person: { include: { user: true } } },
    });
    return rows.map((r) => r.person?.user?.id).filter((x): x is string => Boolean(x));
  }
}
