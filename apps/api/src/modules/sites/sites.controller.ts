import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createSiteSchema } from '@rest/shared-types';
import { SitesService } from './sites.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

@UseGuards(AbilitiesGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'Site' })
  list() {
    return this.sites.list();
  }

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'Site' })
  get(@Param('id') id: string) {
    return this.sites.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'Site' })
  create(@Body() body: unknown) {
    return this.sites.create(createSiteSchema.parse(body));
  }
}
