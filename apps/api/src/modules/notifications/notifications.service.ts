import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue/queue.module';

export type NotificationKey =
  | 'plot.allotted'
  | 'plot.transferred'
  | 'payment.due'
  | 'payment.paid'
  | 'esign.requested'
  | 'kyc.verified'
  | 'kyc.rejected'
  | 'media.state_changed';

interface EnqueueOpts {
  userIds: string[];
  templateKey: NotificationKey;
  payload: Record<string, unknown>;
  channels?: ('email' | 'sms' | 'whatsapp' | 'push' | 'in_app')[];
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.notify) private readonly queue: Queue,
  ) {}

  /**
   * Fans out the notification to each user × channel. The processor handles
   * delivery; this returns the queued Notification ids.
   */
  async notify(opts: EnqueueOpts) {
    const channels = opts.channels ?? ['in_app', 'email'];
    const rows = await this.prisma.notification.createManyAndReturn({
      data: opts.userIds.flatMap((userId) =>
        channels.map((channel) => ({
          userId,
          channel,
          templateKey: opts.templateKey,
          payload: opts.payload as unknown as Prisma.InputJsonValue,
          status: 'queued',
        })),
      ),
    });
    for (const r of rows) {
      await this.queue.add('deliver', { notificationId: r.id });
    }
    return rows;
  }

  list(userId: string, opts: { unreadOnly?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        channel: 'in_app',
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }
}
