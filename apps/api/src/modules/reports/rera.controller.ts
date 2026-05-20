import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { reraQuerySchema } from '@rest/shared-types';
import { ReraService } from './rera.service';
import { MahaReraAdapter } from './maharera.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

@UseGuards(AbilitiesGuard)
@Controller('reports/rera')
export class ReraController {
  constructor(
    private readonly rera: ReraService,
    private readonly maha: MahaReraAdapter,
  ) {}

  @Get()
  @CheckAbilities({ action: 'export', subject: 'Site.RERAExport' })
  generate(@Query() raw: unknown) {
    const q = reraQuerySchema.parse(raw);
    return this.rera.build(q.siteId, q.year, q.quarter);
  }

  @Get('maharera.csv')
  @CheckAbilities({ action: 'export', subject: 'Site.RERAExport' })
  @Header('content-type', 'text/csv; charset=utf-8')
  async mahareraCsv(@Query() raw: unknown, @Res() res: Response) {
    const q = reraQuerySchema.parse(raw);
    const csv = await this.maha.toCsv(q.siteId, q.year, q.quarter);
    res.setHeader(
      'content-disposition',
      `attachment; filename="maharera-Q${q.quarter}-${q.year}.csv"`,
    );
    res.send(csv);
  }
}
