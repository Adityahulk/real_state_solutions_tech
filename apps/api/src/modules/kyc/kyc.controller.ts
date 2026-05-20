import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  presignUploadSchema,
  submitKycSchema,
  verifyKycSchema,
} from '@rest/shared-types';
import { KycService } from './kyc.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

const kycPresignSchema = presignUploadSchema.extend({
  personId: z.string().uuid(),
});

@UseGuards(AbilitiesGuard)
@Controller()
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('kyc/presign')
  @CheckAbilities({ action: 'create', subject: 'KycSubmission' })
  presign(@Body() body: unknown) {
    const { personId, filename, contentType } = kycPresignSchema.parse(body);
    return this.kyc.presignKycUpload({ personId, filename, contentType });
  }

  @Post('kyc/submissions')
  @CheckAbilities({ action: 'create', subject: 'KycSubmission' })
  submit(@Body() body: unknown) {
    return this.kyc.submit(submitKycSchema.parse(body));
  }

  @Get('kyc/submissions')
  @CheckAbilities({ action: 'read', subject: 'KycSubmission' })
  list(@Query('status') status?: string) {
    return this.kyc.list({ status });
  }

  @Get('persons/:id/kyc')
  @CheckAbilities({ action: 'read', subject: 'KycSubmission' })
  forPerson(@Param('id') id: string) {
    return this.kyc.forPerson(id);
  }

  @Post('kyc/submissions/:id/decision')
  @CheckAbilities({ action: 'verify', subject: 'KycSubmission' })
  verify(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    return this.kyc.verify(id, verifyKycSchema.parse(body), me.id);
  }
}
