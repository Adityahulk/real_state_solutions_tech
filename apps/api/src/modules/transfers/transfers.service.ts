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
import type {
  ApproveTransferInput,
  InitiateTransferInput,
} from '@rest/shared-types/schemas';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly letters: LetterRenderer,
    private readonly esign: EsignService,
    private readonly notifications: NotificationsService,
  ) {}

  async initiate(input: InitiateTransferInput, actorId: string) {
    const plot = await this.prisma.plot.findUnique({
      where: { id: input.plotId },
      include: {
        site: true,
        allotments: {
          where: { status: 'active' },
          include: {
            ownerShares: { include: { person: true, company: true } },
          },
        },
      },
    });
    if (!plot) throw new NotFoundException('Plot not found');
    const current = plot.allotments[0];
    if (!current) {
      throw new BadRequestException('Plot has no active allotment to transfer.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Build new shares
      const newShares = await Promise.all(
        input.newShares.map(async (s) => {
          let personId = s.personId ?? null;
          let companyId = s.companyId ?? null;
          let displayName = '';
          if (s.newPerson) {
            const p = await tx.person.create({ data: s.newPerson });
            personId = p.id;
            displayName = p.fullName;
          } else if (s.personId) {
            const p = await tx.person.findUnique({ where: { id: s.personId } });
            if (!p) throw new NotFoundException(`Person ${s.personId} not found`);
            displayName = p.fullName;
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
          };
        }),
      );

      // 2. Create the "to" allotment in superseded state — activates on approval.
      const newAllotment = await tx.allotment.create({
        data: {
          plotId: plot.id,
          status: 'superseded', // will flip to active on approval
          salePrice: input.salePrice,
          createdBy: actorId,
          ownerShares: {
            create: newShares.map((s) => ({
              personId: s.personId,
              companyId: s.companyId,
              sharePercent: s.sharePercent,
              nomineeName: s.nomineeName,
              nomineeRelation: s.nomineeRelation,
            })),
          },
        },
      });

      // 3. Transfer record (draft)
      const transfer = await tx.transfer.create({
        data: {
          plotId: plot.id,
          fromAllotmentId: current.id,
          toAllotmentId: newAllotment.id,
          salePrice: input.salePrice,
          initiatedBy: actorId,
          status: 'draft',
        },
      });

      // 4. Render transfer letter
      const html = this.letters.renderTransfer({
        org: { name: process.env.ORG_NAME ?? 'The Builder' },
        site: plot.site,
        plot,
        transfer,
        fromShares: current.ownerShares.map((s) => ({
          name: s.person?.fullName ?? s.company?.legalName ?? 'Unknown',
          sharePercent: s.sharePercent,
        })),
        toShares: newShares.map((s) => ({ name: s.displayName, sharePercent: s.sharePercent })),
      });
      const doc = await this.documents.renderAndStore({
        kind: 'transfer_letter',
        html,
        uploadedBy: actorId,
        entityType: 'Transfer',
        entityId: transfer.id,
        allotmentId: newAllotment.id,
        prefix: `documents/transfers/${transfer.id}`,
      });
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { transferLetterDocId: doc.id },
      });

      // E-sign by current owners + new owners + builder
      const signers = [
        { name: process.env.ORG_NAME ?? 'The Builder', role: 'builder' as const },
        ...current.ownerShares.map((s) => ({
          name: s.person?.fullName ?? s.company?.legalName ?? 'Owner',
          role: 'seller' as const,
        })),
        ...newShares.map((s) => ({ name: s.displayName, role: 'buyer' as const })),
      ];
      try {
        await this.esign.request({ documentId: doc.id, signers });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.esign.markFailed(doc.id, msg);
      }

      return tx.transfer.findUnique({ where: { id: transfer.id } });
    });
  }

  async decide(transferId: string, input: ApproveTransferInput, actorId: string) {
    const transfer = await this.prisma.transfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === 'approved' || transfer.status === 'rejected') {
      throw new BadRequestException(`Transfer is already ${transfer.status}`);
    }

    if (input.decision === 'reject') {
      return this.prisma.$transaction(async (tx) => {
        await tx.allotment.update({
          where: { id: transfer.toAllotmentId },
          data: { status: 'cancelled' },
        });
        return tx.transfer.update({
          where: { id: transferId },
          data: { status: 'rejected', approvedBy: actorId, approvedAt: new Date() },
        });
      });
    }

    // approve
    const approved = await this.prisma.$transaction(async (tx) => {
      await tx.allotment.update({
        where: { id: transfer.fromAllotmentId },
        data: {
          status: 'superseded',
          supersededAt: new Date(),
          supersededByTransferId: transfer.id,
        },
      });
      await tx.allotment.update({
        where: { id: transfer.toAllotmentId },
        data: { status: 'active' },
      });
      return tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'approved',
          approvedBy: actorId,
          approvedAt: new Date(),
          signedAt: transfer.signedAt ?? new Date(),
        },
      });
    });

    // Notify new owners (whoever has User accounts via their Person link)
    const newOwnerIds = await this.prisma.ownerShare.findMany({
      where: { allotmentId: transfer.toAllotmentId },
      select: { person: { select: { user: { select: { id: true } } } } },
    });
    const userIds = newOwnerIds
      .map((r) => r.person?.user?.id)
      .filter((x): x is string => Boolean(x));
    if (userIds.length) {
      await this.notifications.notify({
        userIds,
        templateKey: 'plot.transferred',
        payload: { transferId: transfer.id, plotId: transfer.plotId },
      });
    }
    return approved;
  }

  listForPlot(plotId: string) {
    return this.prisma.transfer.findMany({
      where: { plotId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
