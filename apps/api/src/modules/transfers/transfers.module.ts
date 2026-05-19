import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { DocumentsModule } from '../documents/documents.module';
import { EsignModule } from '../esign/esign.module';

@Module({
  imports: [DocumentsModule, EsignModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
