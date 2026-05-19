import { Module } from '@nestjs/common';
import { DevItemsController } from './dev-items.controller';
import { DevItemsService } from './dev-items.service';
import { WorkPackagesController } from './work-packages.controller';
import { WorkPackagesService } from './work-packages.service';

@Module({
  controllers: [DevItemsController, WorkPackagesController],
  providers: [DevItemsService, WorkPackagesService],
  exports: [DevItemsService, WorkPackagesService],
})
export class DevelopmentModule {}
