import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { bootstrapPlotChecklistSchema } from '@rest/shared-types/schemas';
import { PlotConstructionService } from './plot-construction.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

const assignSchema = z.object({
  engineerId: z.string().uuid().nullable(),
});

@UseGuards(AbilitiesGuard)
@Controller()
export class PlotConstructionController {
  constructor(private readonly svc: PlotConstructionService) {}

  @Post('plot-checklists')
  @CheckAbilities({ action: 'create', subject: 'PlotConstruction' })
  bootstrap(@Body() body: unknown) {
    return this.svc.bootstrap(bootstrapPlotChecklistSchema.parse(body));
  }

  @Get('plots/:id/checklist')
  @CheckAbilities({ action: 'read', subject: 'PlotConstruction' })
  forPlot(@Param('id') id: string) {
    return this.svc.getByPlot(id);
  }

  @Patch('plot-checklist-items/:id/assign')
  @CheckAbilities({ action: 'update', subject: 'PlotConstruction' })
  assign(@Param('id') id: string, @Body() body: unknown) {
    const { engineerId } = assignSchema.parse(body);
    return this.svc.assignEngineer(id, engineerId);
  }
}
