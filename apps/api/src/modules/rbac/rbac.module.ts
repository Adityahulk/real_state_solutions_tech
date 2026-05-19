import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [RolesController, PermissionsController, AssignmentsController],
  providers: [RolesService, AssignmentsService],
  exports: [RolesService, AssignmentsService],
})
export class RbacModule {}
