import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createVendorSchema } from '@rest/shared-types/schemas';
import { VendorsService } from './vendors.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

@UseGuards(AbilitiesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'Vendor' })
  list() {
    return this.vendors.list();
  }

  @Get(':id')
  @CheckAbilities({ action: 'read', subject: 'Vendor' })
  get(@Param('id') id: string) {
    return this.vendors.getById(id);
  }

  @Post()
  @CheckAbilities({ action: 'create', subject: 'Vendor' })
  create(@Body() body: unknown) {
    return this.vendors.create(createVendorSchema.parse(body));
  }

  @Patch(':id')
  @CheckAbilities({ action: 'update', subject: 'Vendor' })
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.vendors.update(id, createVendorSchema.partial().parse(body));
  }
}
