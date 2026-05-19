import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createIssueSchema,
  resolveIssueSchema,
} from '@rest/shared-types/schemas';
import { IssuesService } from './issues.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Post('issues')
  @CheckAbilities({ action: 'create', subject: 'Issue' })
  create(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.issues.create(createIssueSchema.parse(body), me.id);
  }

  @Patch('issues/:id')
  @CheckAbilities({ action: 'update', subject: 'Issue' })
  resolve(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    return this.issues.resolve(id, resolveIssueSchema.parse(body), me.id);
  }

  @Get('issues')
  @CheckAbilities({ action: 'read', subject: 'Issue' })
  listOpen() {
    return this.issues.listOpen();
  }

  @Get('work-packages/:id/issues')
  @CheckAbilities({ action: 'read', subject: 'Issue' })
  forWp(@Param('id') id: string) {
    return this.issues.listForWorkPackage(id);
  }

  @Get('plot-checklist-items/:id/issues')
  @CheckAbilities({ action: 'read', subject: 'Issue' })
  forItem(@Param('id') id: string) {
    return this.issues.listForChecklistItem(id);
  }
}
