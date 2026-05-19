import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const QUEUE_NAMES = {
  cad: 'cad',
  notify: 'notify',
  document: 'document',
} as const;

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.cad },
      { name: QUEUE_NAMES.notify },
      { name: QUEUE_NAMES.document },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
