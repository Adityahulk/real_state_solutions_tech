import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue/queue.module';

@Processor(QUEUE_NAMES.notify)
export class NotificationsProcessor extends WorkerHost {
  private readonly log = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ notificationId: string }>) {
    const n = await this.prisma.notification.findUnique({
      where: { id: job.data.notificationId },
    });
    if (!n) return;

    try {
      switch (n.channel) {
        case 'in_app':
          // No-op: in-app notifications are read directly from the table.
          break;
        case 'email':
          await this.sendEmail(n);
          break;
        case 'sms':
        case 'whatsapp':
          // MSG91 hook lands in Phase 3.
          this.log.debug(`[${n.channel}] template=${n.templateKey} skipped (no provider)`);
          break;
        case 'push':
          // FCM hook lands in Phase 3.
          this.log.debug(`[push] template=${n.templateKey} skipped (no provider)`);
          break;
      }
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Notification ${n.id} failed: ${msg}`);
      await this.prisma.notification.update({
        where: { id: n.id },
        data: { status: 'failed', error: msg },
      });
      throw e;
    }
  }

  private async sendEmail(n: { templateKey: string; payload: unknown; userId: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.log.debug(`[email] template=${n.templateKey} skipped (no RESEND_API_KEY)`);
      return;
    }
    const user = await this.prisma.user.findUnique({ where: { id: n.userId } });
    if (!user?.email) return;

    const subject = renderSubject(n.templateKey, n.payload as Record<string, unknown>);
    const html = renderEmailBody(n.templateKey, n.payload as Record<string, unknown>);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'no-reply@example.com',
        to: [user.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
  }
}

function renderSubject(key: string, payload: Record<string, unknown>): string {
  switch (key) {
    case 'plot.allotted':
      return `Your plot ${payload.plotNumber ?? ''} has been allotted`;
    case 'payment.due':
      return `Payment due: ${payload.label ?? 'installment'}`;
    case 'payment.paid':
      return `Receipt for your payment`;
    case 'esign.requested':
      return `Signature needed on your allotment letter`;
    case 'kyc.verified':
      return `KYC verified`;
    case 'kyc.rejected':
      return `KYC needs attention`;
    case 'media.state_changed':
      return `Marketing task ${payload.status ?? 'updated'}`;
    default:
      return key;
  }
}

function renderEmailBody(key: string, payload: Record<string, unknown>): string {
  return `<p>Notification: <strong>${key}</strong></p><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
