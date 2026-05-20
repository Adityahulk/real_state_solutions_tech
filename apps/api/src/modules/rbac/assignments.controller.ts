import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { assignRoleSchema } from '@rest/shared-types';
import { AssignmentsService } from './assignments.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('role-assignments')
export class AssignmentsController {
  constructor(private readonly svc: AssignmentsService) {}

  @Post()
  @CheckAbilities({ action: 'assign', subject: 'Role' })
  assign(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.svc.assign(assignRoleSchema.parse(body), me.id);
  }

  @Delete(':id')
  @CheckAbilities({ action: 'assign', subject: 'Role' })
  @HttpCode(204)
  async unassign(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    await this.svc.unassign(id, me.id);
  }
}
