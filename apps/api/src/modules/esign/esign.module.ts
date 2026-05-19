import { Module } from '@nestjs/common';
import { EsignController, EsignWebhookController } from './esign.controller';
import { EsignService } from './esign.service';
import { DigioClient } from './digio.client';

@Module({
  controllers: [EsignController, EsignWebhookController],
  providers: [EsignService, DigioClient],
  exports: [EsignService],
})
export class EsignModule {}
