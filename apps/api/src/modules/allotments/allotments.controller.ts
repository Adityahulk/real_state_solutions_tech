import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createAllotmentSchema } from '@rest/shared-types/schemas';
import { AllotmentsService } from './allotments.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class AllotmentsController {
  constructor(private readonly svc: AllotmentsService) {}

  @Post('allotments')
  @CheckAbilities({ action: 'allot', subject: 'Plot' })
  create(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.create(createAllotmentSchema.parse(body), me.id);
  }

  @Get('allotments/:id')
  @CheckAbilities({ action: 'read', subject: 'Allotment' })
  get(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  @Get('plots/:plotId/allotments')
  @CheckAbilities({ action: 'read', subject: 'Allotment' })
  listForPlot(@Param('plotId') plotId: string) {
    return this.svc.listForPlot(plotId);
  }
}
