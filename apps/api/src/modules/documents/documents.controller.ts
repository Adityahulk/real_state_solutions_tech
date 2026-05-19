import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'Document' })
  get(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    return this.docs.readAuthorised(id, me);
  }

  @Get(':id/url')
  @CheckAbilities({ action: 'read', subject: 'Document' })
  signedUrl(@Param('id') id: string, @CurrentUser() me: RequestUser) {
    return this.docs.signedUrl(id, me);
  }
}
