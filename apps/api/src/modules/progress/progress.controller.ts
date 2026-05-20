import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createProgressUpdateSchema } from '@rest/shared-types';
import { ProgressService } from './progress.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post('progress-updates')
  @CheckAbilities({ action: 'create', subject: 'ProgressUpdate' })
  record(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.progress.record(createProgressUpdateSchema.parse(body), me);
  }

  @Get('work-packages/:id/progress-updates')
  @CheckAbilities({ action: 'read', subject: 'ProgressUpdate' })
  listForWp(@Param('id') id: string) {
    return this.progress.listForWorkPackage(id);
  }

  @Get('plot-checklist-items/:id/progress-updates')
  @CheckAbilities({ action: 'read', subject: 'ProgressUpdate' })
  listForItem(@Param('id') id: string) {
    return this.progress.listForChecklistItem(id);
  }
}
