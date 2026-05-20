import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MuxService } from './mux.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AbilityFactory } from '../../common/casl/ability.factory';
import type {
  AssignMediaTaskInput,
  CreateMediaTaskInput,
  CreateMediaUploadInput,
  FinishMediaUploadInput,
  MediaTaskDecisionInput,
  ReviewCommentInput,
} from '@rest/shared-types';
import type { RequestUser } from '../auth/current-user.decorator';

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mux: MuxService,
    private readonly notifications: NotificationsService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Library ──────────────────────────────────────────────────────────

  /**
   * Gallery feed: tasks in PUBLISHED state, with their latest asset.
   */
  listPublished() {
    return this.prisma.mediaTask.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
      include: {
        assets: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  // ─── Tasks ────────────────────────────────────────────────────────────

  async list(opts: { status?: string; mineOnly?: boolean; userId: string }) {
    const ability = await this.abilityFactory.createForUser({
      id: opts.userId,
    } as RequestUser); // we'll filter manually for marketing roles
    return this.prisma.mediaTask.findMany({
      where: {
        status: opts.status as never,
        OR: opts.mineOnly
          ? [{ videographerId: opts.userId }, { editorId: opts.userId }]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: { assets: { select: { id: true, kind: true } } },
    });
  }

  async getById(id: string, user: RequestUser) {
    const task = await this.prisma.mediaTask.findUnique({
      where: { id },
      include: {
        assets: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', 'MediaTask', task as never)) {
      throw new ForbiddenException('Not allowed to read this task');
    }
    return task;
  }

  create(input: CreateMediaTaskInput, actorId: string) {
    return this.prisma.mediaTask.create({
      data: {
        title: input.title,
        brief: input.brief ?? null,
        siteId: input.siteId ?? null,
        plotId: input.plotId ?? null,
        videographerId: input.videographerId ?? null,
        editorId: input.editorId ?? null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        createdBy: actorId,
        status: 'BRIEFED',
      },
    });
  }

  async assign(id: string, input: AssignMediaTaskInput) {
    return this.prisma.mediaTask.update({
      where: { id },
      data: {
        videographerId: input.videographerId,
        editorId: input.editorId,
      },
    });
  }

  async decision(id: string, input: MediaTaskDecisionInput, user: RequestUser) {
    const task = await this.prisma.mediaTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (input.decision === 'revise' && !task.editorId) {
      throw new BadRequestException(
        'Cannot request revision: no editor assigned to this task.',
      );
    }
    if (input.decision === 'publish') {
      const ability = await this.abilityFactory.createForUser(user);
      if (!ability.can('publish', 'MediaTask', task as never)) {
        throw new ForbiddenException('Not allowed to publish this task');
      }
    }
    const next =
      input.decision === 'approve'
        ? 'APPROVED'
        : input.decision === 'publish'
          ? 'PUBLISHED'
          : 'REVISION_REQUESTED';

    const updated = await this.prisma.mediaTask.update({
      where: { id },
      data: { status: next },
    });

    // Notify the relevant party
    const targets: string[] = [];
    if (next === 'REVISION_REQUESTED' && task.editorId) targets.push(task.editorId);
    if (next === 'PUBLISHED' && task.videographerId) targets.push(task.videographerId);
    if (targets.length) {
      await this.notifications.notify({
        userIds: targets,
        templateKey: 'media.state_changed',
        payload: { status: next, taskId: id, note: input.note ?? '' },
      });
    }
    return updated;
  }

  // ─── Uploads ──────────────────────────────────────────────────────────

  async createUpload(input: CreateMediaUploadInput) {
    const task = await this.prisma.mediaTask.findUnique({
      where: { id: input.taskId },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (this.mux.enabled) {
      const dir = await this.mux.createDirectUpload({ referenceId: task.id });
      return {
        kind: 'mux' as const,
        uploadId: dir.uploadId,
        uploadUrl: dir.uploadUrl,
      };
    }

    // Sandbox: presign an S3 PUT and emit a sandbox upload id so the client
    // sends straight to storage.
    const presign = await this.storage.presignUpload({
      prefix: `media/${task.id}/${input.kind}`,
      filename: input.filename,
      contentType: input.contentType,
    });
    return {
      kind: 'sandbox' as const,
      uploadId: `sandbox_upload_${task.id}_${input.kind}`,
      uploadUrl: presign.url,
      storageKey: presign.key,
    };
  }

  async finishUpload(input: FinishMediaUploadInput, actorId: string) {
    const task = await this.prisma.mediaTask.findUnique({
      where: { id: input.taskId },
    });
    if (!task) throw new NotFoundException('Task not found');

    let muxAssetId: string | null = null;
    let muxPlaybackId: string | null = null;

    if (input.muxUploadId && this.mux.enabled) {
      const resolved = await this.mux.resolveUpload(input.muxUploadId);
      if (resolved) {
        muxAssetId = resolved.assetId || null;
        muxPlaybackId = resolved.playbackId;
      }
    } else if (input.muxUploadId?.startsWith('sandbox_')) {
      muxAssetId = input.muxUploadId;
      muxPlaybackId = input.muxUploadId;
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        taskId: task.id,
        kind: input.kind,
        storageKey: input.storageKey ?? null,
        muxAssetId,
        muxPlaybackId,
        uploadedBy: actorId,
      },
    });

    // Advance task state machine
    const next =
      input.kind === 'raw'
        ? 'RAW_UPLOADED'
        : input.kind === 'edit'
          ? 'EDIT_UPLOADED'
          : task.status;
    await this.prisma.mediaTask.update({
      where: { id: task.id },
      data: { status: next as never },
    });

    return asset;
  }

  /**
   * Resolve a playback URL for an asset. Returns a Mux signed URL for live
   * mode, an S3 signed GET for sandbox, or a placeholder otherwise.
   */
  async playbackUrl(assetId: string): Promise<{ url: string; kind: 'mux' | 's3' | 'none' }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.muxPlaybackId && !asset.muxPlaybackId.startsWith('sandbox_')) {
      return { kind: 'mux', url: this.mux.signedPlaybackUrl(asset.muxPlaybackId) };
    }
    if (asset.storageKey) {
      return { kind: 's3', url: await this.storage.signedGet(asset.storageKey, 600) };
    }
    return { kind: 'none', url: '' };
  }

  // ─── Comments ─────────────────────────────────────────────────────────

  async addComment(input: ReviewCommentInput, userId: string) {
    return this.prisma.reviewComment.create({
      data: {
        taskId: input.taskId,
        assetId: input.assetId ?? null,
        authorId: userId,
        body: input.body,
        timestampSec: input.timestampSec ?? null,
      },
    });
  }

  async resolveComment(id: string) {
    return this.prisma.reviewComment.update({
      where: { id },
      data: { resolved: true },
    });
  }

  // ─── Webhook hook ─────────────────────────────────────────────────────

  async onMuxAssetReady(opts: {
    assetId: string;
    playbackId: string | null;
    passthrough: string;
  }) {
    // passthrough is the taskId; update any matching asset to record final ids.
    const candidate = await this.prisma.mediaAsset.findFirst({
      where: {
        taskId: opts.passthrough,
        OR: [
          { muxAssetId: opts.assetId },
          { muxAssetId: null }, // earliest unresolved asset
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!candidate) return;
    await this.prisma.mediaAsset.update({
      where: { id: candidate.id },
      data: { muxAssetId: opts.assetId, muxPlaybackId: opts.playbackId },
    });
  }
}
