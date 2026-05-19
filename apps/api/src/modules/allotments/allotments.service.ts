import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { LetterRenderer } from '../documents/letter-renderer';
import { EsignService } from '../esign/esign.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateAllotmentInput } from '@rest/shared-types/schemas';

interface ShareCtx {
  name: string;
  panMasked?: string | null;
  sharePercent: number;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
}

@Injectable()
export class AllotmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly letters: LetterRenderer,
    private readonly esign: EsignService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateAllotmentInput, actorId: string) {
    const plot = await this.prisma.plot.findUnique({
      where: { id: input.plotId },
      include: { site: true, allotments: { where: { status: 'active' } } },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    if (plot.allotments.length > 0) {
      throw new BadRequestException(
        'Plot already has an active allotment. Use transfer instead.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve / create owners (Person rows for newPerson entries)
      const resolvedShares = await Promise.all(
        input.shares.map(async (s) => {
          let personId = s.personId ?? null;
          let companyId = s.companyId ?? null;
          let displayName = '';
          let panMasked: string | null = null;
          if (s.newPerson) {
            const p = await tx.person.create({ data: s.newPerson });
            personId = p.id;
            displayName = p.fullName;
            panMasked = p.panMasked ?? null;
          } else if (s.personId) {
            const p = await tx.person.findUnique({ where: { id: s.personId } });
            if (!p) throw new NotFoundException(`Person ${s.personId} not found`);
            displayName = p.fullName;
            panMasked = p.panMasked ?? null;
          } else if (s.companyId) {
            const c = await tx.company.findUnique({ where: { id: s.companyId } });
            if (!c) throw new NotFoundException(`Company ${s.companyId} not found`);
            displayName = c.legalName;
          }
          return {
            personId,
            companyId,
            sharePercent: s.sharePercent,
            nomineeName: s.nomineeName ?? null,
            nomineeRelation: s.nomineeRelation ?? null,
            displayName,
            panMasked,
          };
        }),
      );

      // 2. Allotment row
      const allotment = await tx.allotment.create({
        data: {
          plotId: plot.id,
          salePrice: input.salePrice,
          createdBy: actorId,
          ownerShares: {
            create: resolvedShares.map((s) => ({
              personId: s.personId,
              companyId: s.companyId,
              sharePercent: s.sharePercent,
              nomineeName: s.nomineeName,
              nomineeRelation: s.nomineeRelation,
            })),
          },
        },
      });

      // 3. Plot status flip
      await tx.plot.update({
        where: { id: plot.id },
        data: { status: 'ALLOTTED' },
      });

      // 4. Render allotment letter (PDF via Puppeteer; HTML fallback)
      const html = this.letters.renderAllotment({
        org: { name: process.env.ORG_NAME ?? 'The Builder' },
        site: plot.site,
        plot,
        allotment,
        shares: resolvedShares as ShareCtx[],
      });
      const doc = await this.documents.renderAndStore({
        kind: 'allotment_letter',
        html,
        uploadedBy: actorId,
        entityType: 'Allotment',
        entityId: allotment.id,
        allotmentId: allotment.id,
        prefix: `documents/allotments/${allotment.id}`,
      });
      await tx.allotment.update({
        where: { id: allotment.id },
        data: { allotmentLetterDocId: doc.id },
      });

      // 5. Kick off e-sign on the letter (builder + each owner)
      const signers = [
        { name: process.env.ORG_NAME ?? 'The Builder', email: process.env.ORG_EMAIL, role: 'builder' as const },
        ...resolvedShares
          .filter((s) => s.displayName)
          .map((s) => ({ name: s.displayName, role: 'buyer' as const })),
      ];
      try {
        await this.esign.request({ documentId: doc.id, signers });
      } catch (err) {
        // Don't fail the allotment if Digio is down — admin re-triggers via
        // the UI. Tag the document so it surfaces in the "Retry e-sign" CTA.
        const msg = err instanceof Error ? err.message : String(err);
        await this.esign.markFailed(doc.id, msg);
      }

      // 6. Notify owners (in-app + email).
      const ownerUserIds = await this.ownerUserIds(allotment.id, tx);
      if (ownerUserIds.length) {
        await this.notifications.notify({
          userIds: ownerUserIds,
          templateKey: 'plot.allotted',
          payload: { plotNumber: plot.plotNumber, allotmentId: allotment.id },
        });
      }

      return tx.allotment.findUnique({
        where: { id: allotment.id },
        include: {
          ownerShares: { include: { person: true, company: true } },
        },
      });
    });
  }

  private async ownerUserIds(
    allotmentId: string,
    tx: Pick<PrismaService, 'ownerShare'>,
  ): Promise<string[]> {
    const rows = await tx.ownerShare.findMany({
      where: { allotmentId },
      select: { person: { select: { user: { select: { id: true } } } } },
    });
    return rows.map((r) => r.person?.user?.id).filter((x): x is string => Boolean(x));
  }

  async getById(id: string) {
    const a = await this.prisma.allotment.findUnique({
      where: { id },
      include: {
        plot: { include: { site: true } },
        ownerShares: { include: { person: true, company: true } },
        payments: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!a) throw new NotFoundException('Allotment not found');
    return a;
  }

  async listForPlot(plotId: string) {
    return this.prisma.allotment.findMany({
      where: { plotId },
      orderBy: { allottedAt: 'desc' },
      include: {
        ownerShares: { include: { person: true, company: true } },
      },
    });
  }
}
