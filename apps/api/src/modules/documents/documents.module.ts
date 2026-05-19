import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { LetterRenderer } from './letter-renderer';
import { PdfRenderer } from './pdf-renderer';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, LetterRenderer, PdfRenderer],
  exports: [DocumentsService, LetterRenderer, PdfRenderer],
})
export class DocumentsModule {}
