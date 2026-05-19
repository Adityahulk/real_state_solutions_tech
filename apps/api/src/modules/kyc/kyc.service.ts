import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { SubmitKycInput, VerifyKycInput } from '@rest/shared-types/schemas';

function maskPan(pan: string): string {
  if (!pan || pan.length !== 10) return '****';
  return `${pan.slice(0, 5)}****${pan.slice(9)}`;
}
function hashPan(pan: string): string {
  return createHash('sha256').update(pan.toUpperCase()).digest('hex');
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  presignKycUpload(opts: { personId: string; filename: string; contentType: string }) {
    return this.storage.presignUpload({
      prefix: `kyc/${opts.personId}`,
      filename: opts.filename,
      contentType: opts.contentType,
    });
  }

  async submit(input: SubmitKycInput) {
    const person = await this.prisma.person.findUnique({ where: { id: input.personId } });
    if (!person) throw new NotFoundException('Person not found');

    const panHash = input.pan ? hashPan(input.pan) : null;
    const panMasked = input.pan ? maskPan(input.pan.toUpperCase()) : null;

    // Optional uniqueness check — same PAN linked to two different persons is suspicious.
    if (panHash) {
      const dupe = await this.prisma.kycSubmission.findFirst({
        where: { panHash, personId: { not: input.personId } },
      });
      if (dupe) {
        throw new BadRequestException(
          'This PAN is already on file under a different person.',
        );
      }
    }

    const submission = await this.prisma.kycSubmission.create({
      data: {
        personId: input.personId,
        panHash,
        panMasked,
        aadhaarLast4: input.aadhaarLast4 ?? null,
        panDocKey: input.panDocKey ?? null,
        aadhaarDocKey: input.aadhaarDocKey ?? null,
        addressDocKey: input.addressDocKey ?? null,
        status: 'SUBMITTED',
      },
    });

    // Mirror onto Person for quick reads (masked only).
    await this.prisma.person.update({
      where: { id: input.personId },
      data: {
        panMasked: panMasked ?? person.panMasked,
        aadhaarLast4: input.aadhaarLast4 ?? person.aadhaarLast4,
      },
    });

    return submission;
  }

  async verify(submissionId: string, input: VerifyKycInput, actorId: string) {
    const sub = await this.prisma.kycSubmission.findUnique({ where: { id: submissionId } });
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.status === 'VERIFIED') return sub;

    return this.prisma.kycSubmission.update({
      where: { id: submissionId },
      data: {
        status: input.decision === 'verify' ? 'VERIFIED' : 'REJECTED',
        verifiedAt: input.decision === 'verify' ? new Date() : null,
        verifiedBy: input.decision === 'verify' ? actorId : null,
        rejectionReason: input.decision === 'reject' ? input.reason ?? null : null,
      },
    });
  }

  list(opts: { status?: string } = {}) {
    return this.prisma.kycSubmission.findMany({
      where: { status: opts.status as 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'DRAFT' | undefined },
      orderBy: { submittedAt: 'desc' },
      include: { person: { select: { id: true, fullName: true, email: true } } },
    });
  }

  forPerson(personId: string) {
    return this.prisma.kycSubmission.findMany({
      where: { personId },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
