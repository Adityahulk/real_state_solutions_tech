import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  assignMediaTaskSchema,
  createMediaTaskSchema,
  createMediaUploadSchema,
  finishMediaUploadSchema,
  mediaTaskDecisionSchema,
  reviewCommentSchema,
} from '@rest/shared-types';
import { MarketingService } from './marketing.service';
import { MuxService } from './mux.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class MarketingController {
  constructor(private readonly svc: MarketingService) {}

  @Get('media-library')
  @CheckAbilities({ action: 'read', subject: 'MediaTask' })
  library() {
    return this.svc.listPublished();
  }

  // Tasks
  @Get('media-tasks')
  @CheckAbilities({ action: 'read', subject: 'MediaTask' })
  list(
    @CurrentUser() me: RequestUser,
    @Query('status') status?: string,
    @Query('mine') mine?: string,
  ) {
    return this.svc.list({ status, mineOnly: mine === 'true', userId: me.id });
  }

  @Get('media-tasks/:id')
  @CheckAbilities({ action: 'read', subject: 'MediaTask' })
  get(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    return this.svc.getById(id, me);
  }

  @Post('media-tasks')
  @CheckAbilities({ action: 'create', subject: 'MediaTask' })
  create(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.create(createMediaTaskSchema.parse(body), me.id);
  }

  @Patch('media-tasks/:id/assign')
  @CheckAbilities({ action: 'assign', subject: 'MediaTask' })
  assign(@Param('id') id: string, @Body() body: unknown) {
    return this.svc.assign(id, assignMediaTaskSchema.parse(body));
  }

  @Post('media-tasks/:id/decision')
  @CheckAbilities({ action: 'approve', subject: 'MediaTask' })
  decision(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    return this.svc.decision(id, mediaTaskDecisionSchema.parse(body), me);
  }

  // Uploads
  @Post('media-uploads')
  @CheckAbilities({ action: 'create', subject: 'MediaAsset' })
  createUpload(@Body() body: unknown) {
    return this.svc.createUpload(createMediaUploadSchema.parse(body));
  }

  @Post('media-uploads/finish')
  @CheckAbilities({ action: 'create', subject: 'MediaAsset' })
  finishUpload(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.finishUpload(finishMediaUploadSchema.parse(body), me.id);
  }

  @Get('media-assets/:id/playback')
  @CheckAbilities({ action: 'read', subject: 'MediaAsset' })
  playback(@Param('id') id: string) {
    return this.svc.playbackUrl(id);
  }

  // Comments
  @Post('review-comments')
  @CheckAbilities({ action: 'create', subject: 'ReviewComment' })
  comment(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.addComment(reviewCommentSchema.parse(body), me.id);
  }

  @Patch('review-comments/:id/resolve')
  @CheckAbilities({ action: 'update', subject: 'ReviewComment' })
  resolveComment(@Param('id') id: string) {
    return this.svc.resolveComment(id);
  }
}

@Controller('webhooks')
export class MarketingWebhookController {
  constructor(
    private readonly svc: MarketingService,
    private readonly mux: MuxService,
  ) {}

  @Public()
  @Post('mux')
  async muxWebhook(@Req() req: Request) {
    const raw = JSON.stringify(req.body);
    const sig = req.headers['mux-signature']?.toString();
    if (!this.mux.verifyWebhook(raw, sig)) {
      return { ok: false, reason: 'invalid signature' };
    }
    const event = req.body as {
      type: string;
      data: {
        id: string;
        playback_ids?: { id: string; policy: string }[];
        passthrough?: string;
      };
    };
    if (event.type === 'video.asset.ready' && event.data.passthrough) {
      await this.svc.onMuxAssetReady({
        assetId: event.data.id,
        playbackId: event.data.playback_ids?.[0]?.id ?? null,
        passthrough: event.data.passthrough,
      });
    }
    return { ok: true };
  }
}
