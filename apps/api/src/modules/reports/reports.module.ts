import { Module } from '@nestjs/common';
import { ReraController } from './rera.controller';
import { ReraService } from './rera.service';
import { MahaReraAdapter } from './maharera.service';

@Module({
  controllers: [ReraController],
  providers: [ReraService, MahaReraAdapter],
})
export class ReportsModule {}
