import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { createUserSchema, updateUserSchema } from '@rest/shared-types/schemas';
import { UsersService } from './users.service';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'User' })
  list(@Query('q') q?: string, @Query('active') active?: string) {
    return this.users.list({ search: q, activeOnly: active !== 'false' });
  }

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'User' })
  get(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'User' })
  create(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.users.create(createUserSchema.parse(body), me.id);
  }

  @Patch(':id')
  @CheckAbilities({ action: 'update', subject: 'User' })
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.users.update(id, updateUserSchema.parse(body));
  }

  @Delete(':id')
  @CheckAbilities({ action: 'delete', subject: 'User' })
  @HttpCode(204)
  async deactivate(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    await this.users.deactivate(id, me.id);
  }
}
