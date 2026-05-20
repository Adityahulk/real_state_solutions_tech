import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { LetterRenderer } from '../documents/letter-renderer';
import { RazorpayService } from './razorpay.service';
import { buildSchedule } from './payment-templates';
import { AbilityFactory } from '../../common/casl/ability.factory';
import type {
  CreateScheduleInput,
  MarkPaidInput,
} from '@rest/shared-types';
import type { RequestUser } from '../auth/current-user.decorator';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly letters: LetterRenderer,
    private readonly razorpay: RazorpayService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async createSchedule(input: CreateScheduleInput, actorId: string) {
    const allotment = await this.prisma.allotment.findUnique({
      where: { id: input.allotmentId },
      include: { payments: true },
    });
    if (!allotment) throw new NotFoundException('Allotment not found');
    if (allotment.payments.length > 0) {
      throw new BadRequestException('Schedule already exists for this allotment');
    }

    const items = buildSchedule(
      input.template,
      Number(allotment.salePrice),
      new Date(input.startDate),
    );
    await this.prisma.paymentSchedule.createMany({
      data: items.map((i) => ({
        allotmentId: allotment.id,
        label: i.label,
        amount: i.amount,
        dueDate: i.dueDate,
      })),
    });
    return this.listForAllotment(allotment.id);
  }

  listForAllotment(allotmentId: string) {
    return this.prisma.paymentSchedule.findMany({
      where: { allotmentId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getOwnerUserIds(allotmentId: string): Promise<string[]> {
    const shares = await this.prisma.ownerShare.findMany({
      where: { allotmentId },
      select: { person: { select: { user: { select: { id: true } } } } },
    });
    return shares.map((s) => s.person?.user?.id).filter((x): x is string => Boolean(x));
  }

  /**
   * Mints a Razorpay payment link for an installment (or returns existing).
   * Plot owner is the typical caller; ability is checked row-level.
   */
  async createPaymentLink(installmentId: string, user: RequestUser) {
    const inst = await this.prisma.paymentSchedule.findUnique({
      where: { id: installmentId },
      include: {
        allotment: { include: { plot: true } },
      },
    });
    if (!inst) throw new NotFoundException('Installment not found');
    if (inst.status === 'paid') throw new BadRequestException('Already paid');

    const ownerUserIds = await this.getOwnerUserIds(inst.allotmentId);
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('pay', 'Payment', { ownerUserIds } as never)) {
      throw new ForbiddenException('Not allowed to pay this installment');
    }

    if (inst.razorpayLinkId && !inst.razorpayLinkId.startsWith('sandbox_')) {
      // Existing live link — reuse
      return { paymentLinkId: inst.razorpayLinkId, simulated: false };
    }

    const link = await this.razorpay.createPaymentLink({
      amountInPaise: Math.round(Number(inst.amount) * 100),
      description: `${inst.label} — Plot ${inst.allotment.plot.plotNumber}`,
      referenceId: inst.id,
      notes: { allotmentId: inst.allotmentId, plotId: inst.allotment.plot.id },
    });
    await this.prisma.paymentSchedule.update({
      where: { id: inst.id },
      data: { razorpayLinkId: link.id },
    });
    return { paymentLinkId: link.id, shortUrl: link.shortUrl, simulated: link.simulated };
  }

  /**
   * Mark an installment paid. Generates a receipt PDF. Used by:
   *  - Razorpay webhook (server)
   *  - Sandbox auto-pay
   *  - Admin manual override (Mark as paid offline)
   */
  async markPaid(
    installmentId: string,
    actorId: string,
    opts: { reference?: string } = {},
  ) {
    const inst = await this.prisma.paymentSchedule.findUnique({
      where: { id: installmentId },
      include: {
        allotment: {
          include: {
            plot: { include: { site: true } },
            ownerShares: { include: { person: true, company: true } },
          },
        },
      },
    });
    if (!inst) throw new NotFoundException('Installment not found');
    if (inst.status === 'paid') return inst;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentSchedule.update({
        where: { id: installmentId },
        data: { status: 'paid', paidAt: new Date() },
      });

      // Receipt PDF
      const html = this.letters.renderReceipt({
        org: { name: process.env.ORG_NAME ?? 'The Builder' },
        site: inst.allotment.plot.site,
        plot: inst.allotment.plot,
        installment: { ...inst, reference: opts.reference ?? '' },
        owners: inst.allotment.ownerShares.map((s) => ({
          name: s.person?.fullName ?? s.company?.legalName ?? 'Unknown',
          sharePercent: s.sharePercent,
        })),
        paidAt: new Date(),
      });
      const doc = await this.documents.renderAndStore({
        kind: 'receipt',
        html,
        uploadedBy: actorId,
        entityType: 'PaymentSchedule',
        entityId: inst.id,
        allotmentId: inst.allotmentId,
        prefix: `documents/receipts/${inst.id}`,
      });
      await tx.paymentSchedule.update({
        where: { id: inst.id },
        data: { receiptDocId: doc.id },
      });
      return updated;
    });
  }
}
