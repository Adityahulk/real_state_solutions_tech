import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  photoPresignSchema,
  registerPhotoSchema,
} from '@rest/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('photos')
export class PhotosController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('presign')
  @CheckAbilities({ action: 'create', subject: 'ProgressUpdate' })
  presign(@Body() body: unknown) {
    const { scope, parentId, filename, contentType } = photoPresignSchema.parse(body);
    return this.storage.presignUpload({
      prefix: `photos/${scope}/${parentId}`,
      filename,
      contentType,
    });
  }

  /**
   * Once the browser has PUT the file to S3/MinIO, register the Document row
   * so it can be referenced in a ProgressUpdate / Issue.
   */
  @Post('register')
  @CheckAbilities({ action: 'create', subject: 'ProgressUpdate' })
  async register(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    const { storageKey, mimeType, scope, parentId } = registerPhotoSchema.parse(body);
    return this.prisma.document.create({
      data: {
        kind: `${scope}_photo`,
        storageKey,
        mimeType,
        uploadedBy: me.id,
        entityType: scope === 'progress' ? 'ProgressUpdate' : 'Issue',
        entityId: parentId,
      },
    });
  }
}
