import { Module } from '@nestjs/common';
import { ChecklistTemplatesController } from './checklist-templates.controller';
import { ChecklistTemplatesService } from './checklist-templates.service';
import { PlotConstructionController } from './plot-construction.controller';
import { PlotConstructionService } from './plot-construction.service';

@Module({
  controllers: [ChecklistTemplatesController, PlotConstructionController],
  providers: [ChecklistTemplatesService, PlotConstructionService],
  exports: [ChecklistTemplatesService, PlotConstructionService],
})
export class PlotConstructionModule {}
