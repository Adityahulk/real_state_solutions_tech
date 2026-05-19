import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.module';
import { CadService } from './cad.service';
import { CadParser } from './cad.parser';
import { StorageService } from '../storage/storage.service';

interface ParseJob {
  drawingId: string;
  filename: string;
}

@Processor(QUEUE_NAMES.cad)
export class CadProcessor extends WorkerHost {
  private readonly log = new Logger(CadProcessor.name);

  constructor(
    private readonly cad: CadService,
    private readonly parser: CadParser,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<ParseJob>) {
    const { drawingId, filename } = job.data;
    this.log.log(`Parsing drawing ${drawingId}`);
    try {
      const drawing = await this.cad.getDrawing(drawingId);
      const buf = await this.storage.getObject(drawing.storageKey);
      const parsed = await this.parser.parse(buf, filename);
      await this.cad.setReview(drawingId, parsed.entities);
      this.log.log(`Drawing ${drawingId} → review (${parsed.entities.length} entities)`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Drawing ${drawingId} failed: ${msg}`);
      await this.cad.markParseFailed(drawingId, msg);
      throw e;
    }
  }
}
