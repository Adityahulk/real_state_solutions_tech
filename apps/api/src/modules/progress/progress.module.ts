import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PhotosController } from './photos.controller';

@Module({
  controllers: [ProgressController, PhotosController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
