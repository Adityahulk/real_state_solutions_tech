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
  createDevItemSchema,
  updateDevItemSchema,
} from '@rest/shared-types/schemas';
import { DevItemsService } from './dev-items.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class DevItemsController {
  constructor(private readonly devItems: DevItemsService) {}

  @Get('sites/:siteId/dev-items')
  @CheckAbilities({ action: 'read', subject: 'DevelopmentItem' })
  list(@Param('siteId') siteId: string) {
    return this.devItems.listForSite(siteId);
  }

  @Get('sites/:siteId/dev-items.geojson')
  @CheckAbilities({ action: 'read', subject: 'DevelopmentItem' })
  geojson(@Param('siteId') siteId: string) {
    return this.devItems.siteFeatureCollection(siteId);
  }

  @Get('dev-items/:id')
  @CheckAbilities({ action: 'read', subject: 'DevelopmentItem' })
  get(@Param('id') id: string) {
    return this.devItems.getById(id);
  }

  @Post('dev-items')
  @CheckAbilities({ action: 'create', subject: 'DevelopmentItem' })
  create(@Body() body: unknown) {
    return this.devItems.create(createDevItemSchema.parse(body));
  }

  @Patch('dev-items/:id')
  @CheckAbilities({ action: 'update', subject: 'DevelopmentItem' })
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.devItems.update(id, updateDevItemSchema.parse(body));
  }
}
