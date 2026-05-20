import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DigioClient, type DigioSigner } from './digio.client';
import type { RequestEsignInput } from '@rest/shared-types';

@Injectable()
export class EsignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly digio: DigioClient,
  ) {}

  /**
   * Kick off e-sign on a Document. Stores signer roster + sign links back
   * on the Document so the UI can render per-signer state.
   */
  async request(input: RequestEsignInput) {
    const doc = await this.prisma.document.findUnique({ where: { id: input.documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const file = await this.storage.getObject(doc.storageKey);
    const signers: DigioSigner[] = input.signers.map((s) => ({
      identifier: s.email ?? s.phone ?? s.name,
      name: s.name,
      reason: s.role,
    }));

    const resp = await this.digio.createRequest({
      referenceId: doc.id,
      documentName: doc.kind,
      fileBase64: file.toString('base64'),
      mimeType: doc.mimeType,
      signers,
    });

    const signerRows = input.signers.map((s, i) => ({
      name: s.name,
      identifier: signers[i]!.identifier,
      role: s.role,
      status: 'pending',
      signLink: resp.signLinks.find((l) => l.identifier === signers[i]!.identifier)?.url ?? null,
    }));

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        signStatus: 'requested',
        signProvider: 'digio',
        signRefId: resp.id,
        signers: signerRows as unknown as Prisma.InputJsonValue,
      },
    });

    return { documentId: doc.id, signers: signerRows, simulated: resp.simulated };
  }

  /**
   * Mark a document's e-sign as failed so the UI can surface a retry CTA.
   */
  async markFailed(documentId: string, reason: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signStatus: 'failed',
        signers: [{ reason }] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Process a signer's signature event. Called from:
   *  - the real Digio webhook
   *  - the sandbox `/sandbox/esign/:docId/:identifier` route
   */
  async recordSignerSigned(documentId: string, identifier: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    const signers = (doc.signers as { identifier: string; status: string; signedAt?: string }[] | null) ?? [];
    const updated = signers.map((s) =>
      s.identifier === identifier
        ? { ...s, status: 'signed', signedAt: new Date().toISOString() }
        : s,
    );
    const allSigned = updated.length > 0 && updated.every((s) => s.status === 'signed');
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signers: updated as unknown as Prisma.InputJsonValue,
        signStatus: allSigned ? 'signed' : 'partially_signed',
      },
    });
    return { allSigned, documentId };
  }
}
