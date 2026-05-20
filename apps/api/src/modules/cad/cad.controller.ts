import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  cadActivateSchema,
  completeCadUploadSchema,
  presignUploadSchema,
} from '@rest/shared-types';
import { CadService } from './cad.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@UseGuards(AbilitiesGuard)
@Controller()
export class CadController {
  constructor(private readonly cad: CadService) {}

  @Post('sites/:siteId/cad/presign')
  @CheckAbilities({ action: 'create', subject: 'CADDrawing' })
  presign(@Param('siteId') siteId: string, @Body() body: unknown) {
    return this.cad.presignUpload(siteId, presignUploadSchema.parse(body));
  }

  @Post('cad/uploads')
  @CheckAbilities({ action: 'create', subject: 'CADDrawing' })
  complete(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    return this.cad.completeUpload(completeCadUploadSchema.parse(body), me.id);
  }

  @Get('cad/:id')
  @CheckAbilities({ action: 'read', subject: 'CADDrawing' })
  get(@Param('id') id: string) {
    return this.cad.getDrawing(id);
  }

  @Post('cad/:id/activate')
  @CheckAbilities({ action: 'update', subject: 'CADDrawing' })
  activate(@Param('id') id: string, @Body() body: unknown) {
    return this.cad.activate(id, cadActivateSchema.parse(body));
  }
}
