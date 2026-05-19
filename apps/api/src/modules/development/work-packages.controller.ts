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
  createWorkPackageSchema,
  updateWorkPackageSchema,
} from '@rest/shared-types/schemas';
import { WorkPackagesService } from './work-packages.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('work-packages')
export class WorkPackagesController {
  constructor(private readonly wp: WorkPackagesService) {}

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'WorkPackage' })
  get(@Param('id') id: string) {
    return this.wp.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'WorkPackage' })
  create(@Body() body: unknown) {
    return this.wp.create(createWorkPackageSchema.parse(body));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    // Row-level enforcement (site_engineer can only edit assigned packages).
    await this.wp.assertUpdatable(id, me);
    return this.wp.update(id, updateWorkPackageSchema.parse(body));
  }
}
