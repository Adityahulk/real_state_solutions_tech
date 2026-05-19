import { Module } from '@nestjs/common';
import { CadController } from './cad.controller';
import { CadService } from './cad.service';
import { CadProcessor } from './cad.processor';
import { CadParser } from './cad.parser';
import { ApsClient } from './aps.client';

@Module({
  controllers: [CadController],
  providers: [CadService, CadProcessor, CadParser, ApsClient],
  exports: [CadService],
})
export class CadModule {}
