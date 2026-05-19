import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  approveTransferSchema,
  initiateTransferSchema,
} from '@rest/shared-types/schemas';
import { TransfersService } from './transfers.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class TransfersController {
  constructor(private readonly svc: TransfersService) {}

  @Post('transfers')
  @CheckAbilities({ action: 'transfer', subject: 'Plot' })
  initiate(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.initiate(initiateTransferSchema.parse(body), me.id);
  }

  @Post('transfers/:id/decision')
  @CheckAbilities({ action: 'approve', subject: 'Transfer' })
  decide(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    return this.svc.decide(id, approveTransferSchema.parse(body), me.id);
  }

  @Get('plots/:plotId/transfers')
  @CheckAbilities({ action: 'read', subject: 'Transfer' })
  listForPlot(@Param('plotId') plotId: string) {
    return this.svc.listForPlot(plotId);
  }
}
