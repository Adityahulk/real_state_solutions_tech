import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createScheduleSchema,
  markPaidSchema,
  payInstallmentSchema,
} from '@rest/shared-types';
import { PaymentsService } from './payments.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { SandboxOnlyGuard } from '../../common/sandbox.guard';
import { RazorpayService } from './razorpay.service';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(AbilitiesGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly razorpay: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  // --- Admin endpoints ---

  @Post('payments/schedules')
  @CheckAbilities({ action: 'create', subject: 'Payment' })
  createSchedule(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.payments.createSchedule(createScheduleSchema.parse(body), me.id);
  }

  @Get('allotments/:id/payments')
  @CheckAbilities({ action: 'read', subject: 'Payment' })
  listForAllotment(@Param('id') id: string) {
    return this.payments.listForAllotment(id);
  }

  @Post('payments/mark-paid')
  @CheckAbilities({ action: 'approve', subject: 'Payment' })
  markPaidOffline(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    const { installmentId, reference } = markPaidSchema.parse(body);
    return this.payments.markPaid(installmentId, me.id, { reference });
  }

  // --- Owner endpoints ---

  @Post('payments/links')
  @CheckAbilities({ action: 'pay', subject: 'Payment' })
  createLink(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    const { installmentId } = payInstallmentSchema.parse(body);
    return this.payments.createPaymentLink(installmentId, me);
  }
}

/**
 * Webhook endpoints — public, signature-validated.
 */
@Controller('webhooks')
export class PaymentsWebhookController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly razorpay: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('razorpay')
  async razorpayWebhook(@Req() req: Request) {
    const raw = JSON.stringify(req.body);
    const sig = req.headers['x-razorpay-signature']?.toString();
    if (!this.razorpay.verifyWebhook(raw, sig)) {
      return { ok: false, reason: 'invalid signature' };
    }
    const event = req.body as {
      event: string;
      payload: { payment_link?: { entity: { reference_id?: string; status: string } } };
    };
    const link = event.payload?.payment_link?.entity;
    if (event.event === 'payment_link.paid' && link?.reference_id) {
      // reference_id is the installmentId we set when creating the link
      await this.payments.markPaid(link.reference_id, SYSTEM_ACTOR_ID, {
        reference: 'razorpay',
      });
    }
    return { ok: true };
  }

  /** Sandbox auto-pay — visited by the browser when Razorpay isn't configured. */
  @Public()
  @UseGuards(SandboxOnlyGuard)
  @Get('sandbox/pay/:installmentId')
  async sandboxPay(@Param('installmentId') installmentId: string) {
    await this.payments.markPaid(installmentId, SYSTEM_ACTOR_ID, { reference: 'sandbox' });
    return { ok: true, message: 'Sandbox payment recorded. Close this tab.' };
  }
}

/** Placeholder UUID used as the actor on system-driven mutations (webhooks). */
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
