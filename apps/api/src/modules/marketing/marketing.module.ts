import { Module } from '@nestjs/common';
import {
  MarketingController,
  MarketingWebhookController,
} from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MuxService } from './mux.service';

@Module({
  controllers: [MarketingController, MarketingWebhookController],
  providers: [MarketingService, MuxService],
  exports: [MarketingService],
})
export class MarketingModule {}
