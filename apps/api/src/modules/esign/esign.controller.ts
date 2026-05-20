import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { requestEsignSchema } from '@rest/shared-types';
import { EsignService } from './esign.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { Public } from '../auth/public.decorator';
import { SandboxOnlyGuard } from '../../common/sandbox.guard';
import type { Request } from 'express';

@UseGuards(AbilitiesGuard)
@Controller()
export class EsignController {
  constructor(private readonly esign: EsignService) {}

  @Post('esign/requests')
  @CheckAbilities({ action: 'create', subject: 'Document' })
  request(@Body() body: unknown) {
    return this.esign.request(requestEsignSchema.parse(body));
  }

  /**
   * Retry a previously-failed (or stuck) e-sign request. Takes the same body
   * as POST /esign/requests but reads `documentId` from the path.
   */
  @Post('esign/requests/:docId/retry')
  @CheckAbilities({ action: 'create', subject: 'Document' })
  retry(@Param('docId') docId: string, @Body() body: unknown) {
    const input = requestEsignSchema.parse({
      ...(body as object),
      documentId: docId,
    });
    return this.esign.request(input);
  }
}

/** Webhook endpoints — Public, signed where possible. */
@Controller('webhooks')
export class EsignWebhookController {
  constructor(private readonly esign: EsignService) {}

  @Public()
  @Post('digio')
  async digio(@Req() req: Request) {
    // Digio sends `entity_id` and `event` (document.signed, agreement.completed, etc.)
    const body = req.body as {
      event?: string;
      entity_id?: string;
      identifier?: string;
    };
    if (
      (body.event === 'document.signed' || body.event === 'agreement.signed') &&
      body.entity_id &&
      body.identifier
    ) {
      // entity_id corresponds to Document.id (we set referenceId = doc.id)
      await this.esign.recordSignerSigned(body.entity_id, body.identifier);
    }
    return { ok: true };
  }

  @Public()
  @UseGuards(SandboxOnlyGuard)
  @Get('sandbox/esign/:documentId/:identifier')
  async sandboxSign(
    @Param('documentId') documentId: string,
    @Param('identifier') identifier: string,
  ) {
    const result = await this.esign.recordSignerSigned(documentId, identifier);
    return {
      ok: true,
      message: result.allSigned
        ? 'All signers have signed. Close this tab.'
        : 'Signature recorded. Close this tab.',
    };
  }
}
