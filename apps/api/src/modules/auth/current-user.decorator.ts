import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserAssignment {
  roleId: string;
  roleKey: string;
  scope: Record<string, unknown> | null;
}

export interface RequestUser {
  id: string;
  email: string;
  displayName: string;
  roleKeys: string[];
  assignments: UserAssignment[];
  impersonatedBy?: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as RequestUser;
  },
);
