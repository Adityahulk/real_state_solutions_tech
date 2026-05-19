import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AbilityFactory } from '../../common/casl/ability.factory';
import { PdfRenderer } from './pdf-renderer';
import type { RequestUser } from '../auth/current-user.decorator';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly abilityFactory: AbilityFactory,
    private readonly pdf: PdfRenderer,
  ) {}

  async store(opts: {
    kind: string;
    body: string | Buffer;
    mimeType: string;
    uploadedBy: string;
    entityType: string;
    entityId: string;
    allotmentId?: string | null;
    prefix: string;
  }) {
    const ext = opts.mimeType === 'application/pdf' ? 'pdf' : 'html';
    const filename = `${opts.kind}.${ext}`;
    const key = `${opts.prefix}/${Date.now()}-${filename}`;
    await this.storage.putObject(key, opts.body, opts.mimeType);
    return this.prisma.document.create({
      data: {
        kind: opts.kind,
        storageKey: key,
        mimeType: opts.mimeType,
        uploadedBy: opts.uploadedBy,
        entityType: opts.entityType,
        entityId: opts.entityId,
        allotmentId: opts.allotmentId ?? null,
      },
    });
  }

  /**
   * Render HTML → PDF (with HTML fallback) and persist as a Document.
   */
  async renderAndStore(opts: {
    kind: string;
    html: string;
    uploadedBy: string;
    entityType: string;
    entityId: string;
    allotmentId?: string | null;
    prefix: string;
  }) {
    const { body, mimeType } = await this.pdf.renderHtml(opts.html);
    return this.store({
      kind: opts.kind,
      body,
      mimeType,
      uploadedBy: opts.uploadedBy,
      entityType: opts.entityType,
      entityId: opts.entityId,
      allotmentId: opts.allotmentId ?? null,
      prefix: opts.prefix,
    });
  }

  async getById(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  /** Resolve the set of userIds that own the allotment a Document belongs to. */
  async ownerUserIdsFor(doc: { allotmentId: string | null }): Promise<string[]> {
    if (!doc.allotmentId) return [];
    const shares = await this.prisma.ownerShare.findMany({
      where: { allotmentId: doc.allotmentId },
      select: { person: { select: { user: { select: { id: true } } } } },
    });
    return shares.map((s) => s.person?.user?.id).filter((x): x is string => Boolean(x));
  }

  /**
   * Authorisation-aware fetch — the CASL subject is the Document enriched
   * with `ownerUserIds`, so plot_owner row-level conditions can evaluate.
   */
  async readAuthorised(id: string, user: RequestUser) {
    const doc = await this.getById(id);
    const ownerUserIds = await this.ownerUserIdsFor(doc);
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', 'Document', { ...doc, ownerUserIds } as never)) {
      throw new ForbiddenException('Not allowed to read this document');
    }
    return doc;
  }

  async signedUrl(id: string, user: RequestUser) {
    const doc = await this.readAuthorised(id, user);
    return { url: await this.storage.signedGet(doc.storageKey), mimeType: doc.mimeType };
  }
}
