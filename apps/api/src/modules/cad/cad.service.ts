import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QUEUE_NAMES } from '../queue/queue.module';
import type {
  CadActivateInput,
  CompleteCadUploadInput,
  PresignUploadInput,
} from '@rest/shared-types';
import type { ParsedEntity } from './cad.parser';

@Injectable()
export class CadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_NAMES.cad) private readonly cadQueue: Queue,
  ) {}

  presignUpload(siteId: string, input: PresignUploadInput) {
    return this.storage.presignUpload({
      prefix: `cad/${siteId}/raw`,
      filename: input.filename,
      contentType: input.contentType,
    });
  }

  async completeUpload(input: CompleteCadUploadInput, userId: string) {
    if (!(await this.storage.exists(input.storageKey))) {
      throw new BadRequestException('Upload not found at storageKey');
    }
    const site = await this.prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const nextVersion =
      (await this.prisma.cADDrawing.count({
        where: { siteId: input.siteId, scope: 'site' },
      })) + 1;

    const drawing = await this.prisma.cADDrawing.create({
      data: {
        siteId: input.siteId,
        scope: 'site',
        version: nextVersion,
        storageKey: input.storageKey,
        status: 'parsing',
        uploadedBy: userId,
      },
    });

    await this.cadQueue.add(
      'parse',
      { drawingId: drawing.id, filename: input.filename },
      { attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );

    return drawing;
  }

  async getDrawing(id: string) {
    const d = await this.prisma.cADDrawing.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Drawing not found');
    return d;
  }

  /**
   * Admin confirms the parsed entities. Creates Plot + DevelopmentItem rows,
   * marks drawing active, supersedes any earlier active drawing for this site.
   */
  async activate(drawingId: string, input: CadActivateInput) {
    const drawing = await this.getDrawing(drawingId);
    if (drawing.status !== 'review') {
      throw new BadRequestException(
        `Drawing is in ${drawing.status} — only "review" drawings can be activated.`,
      );
    }

    const accepted = input.items.filter((i) => i.action === 'accept');

    await this.prisma.$transaction(async (tx) => {
      // Supersede previous active drawing for this site (if any).
      if (drawing.siteId) {
        const previous = await tx.cADDrawing.findFirst({
          where: { siteId: drawing.siteId, status: 'active' },
        });
        if (previous) {
          await tx.cADDrawing.update({
            where: { id: previous.id },
            data: { status: 'superseded', supersededById: drawing.id },
          });
        }
      }

      // Plots
      for (const it of accepted.filter((x) => x.kind === 'plot')) {
        const geom = JSON.stringify(it.geometry);
        // Upsert by (siteId, plotNumber)
        const existing = await tx.plot.findUnique({
          where: {
            siteId_plotNumber: { siteId: drawing.siteId!, plotNumber: it.label },
          },
        });
        if (existing) {
          await tx.$executeRawUnsafe(
            `UPDATE "Plot" SET geometry = ST_SetSRID(ST_GeomFromGeoJSON($1), 0), "areaSqft" = $2 WHERE id = $3`,
            geom,
            it.areaSqft ?? null,
            existing.id,
          );
        } else {
          const created = await tx.plot.create({
            data: {
              siteId: drawing.siteId!,
              plotNumber: it.label,
              areaSqft: it.areaSqft ?? null,
            },
          });
          await tx.$executeRawUnsafe(
            `UPDATE "Plot" SET geometry = ST_SetSRID(ST_GeomFromGeoJSON($1), 0) WHERE id = $2`,
            geom,
            created.id,
          );
        }
      }

      // Dev items
      for (const it of accepted.filter((x) => x.kind === 'dev_item')) {
        await tx.developmentItem.create({
          data: {
            siteId: drawing.siteId!,
            kind: it.devKind ?? it.layer.toLowerCase(),
            label: it.label,
            geometry: it.geometry as object,
          },
        });
      }

      await tx.cADDrawing.update({
        where: { id: drawing.id },
        data: { status: 'active' },
      });
    });

    return { ok: true, plotsCreated: accepted.filter((x) => x.kind === 'plot').length };
  }

  async markParseFailed(drawingId: string, reason: string) {
    await this.prisma.cADDrawing.update({
      where: { id: drawingId },
      data: { status: 'failed', geojson: { error: reason } as object },
    });
  }

  async setReview(drawingId: string, entities: ParsedEntity[], svgKey?: string) {
    await this.prisma.cADDrawing.update({
      where: { id: drawingId },
      data: {
        status: 'review',
        geojson: { entities } as object,
        svgKey: svgKey ?? null,
      },
    });
  }
}
