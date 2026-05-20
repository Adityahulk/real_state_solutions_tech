import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createRoleSchema, updateRoleSchema } from '@rest/shared-types';
import { RolesService } from './roles.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'Role' })
  list() {
    return this.roles.list();
  }

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'Role' })
  get(@Param('id') id: string) {
    return this.roles.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'Role' })
  create(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.roles.create(createRoleSchema.parse(body), me.id);
  }

  @Patch(':id')
  @CheckAbilities({ action: 'update', subject: 'Role' })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() me: RequestUser,
  ) {
    return this.roles.update(id, updateRoleSchema.parse(body), me.id);
  }

  @Delete(':id')
  @CheckAbilities({ action: 'delete', subject: 'Role' })
  @HttpCode(204)
  async delete(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    await this.roles.delete(id, me.id);
  }
}
