import { Module } from '@nestjs/common';
import { AllotmentsController } from './allotments.controller';
import { AllotmentsService } from './allotments.service';
import { DocumentsModule } from '../documents/documents.module';
import { EsignModule } from '../esign/esign.module';

@Module({
  imports: [DocumentsModule, EsignModule],
  controllers: [AllotmentsController],
  providers: [AllotmentsService],
  exports: [AllotmentsService],
})
export class AllotmentsModule {}
