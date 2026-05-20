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
  createChecklistTemplateSchema,
  updateChecklistTemplateSchema,
} from '@rest/shared-types';
import { ChecklistTemplatesService } from './checklist-templates.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

@UseGuards(AbilitiesGuard)
@Controller('checklist-templates')
export class ChecklistTemplatesController {
  constructor(private readonly tpls: ChecklistTemplatesService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'ChecklistTemplate' })
  list() {
    return this.tpls.list();
  }

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'ChecklistTemplate' })
  get(@Param('id') id: string) {
    return this.tpls.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'ChecklistTemplate' })
  create(@Body() body: unknown) {
    return this.tpls.create(createChecklistTemplateSchema.parse(body));
  }

  @Patch(':id')
  @CheckAbilities({ action: 'update', subject: 'ChecklistTemplate' })
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.tpls.update(id, updateChecklistTemplateSchema.parse(body));
  }
}
