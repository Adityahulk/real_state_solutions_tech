import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CHECK_ABILITIES_KEY, RequiredAbility } from './check-abilities.decorator';
import { AbilityFactory } from './ability.factory';
import type { RequestUser } from '../../modules/auth/current-user.decorator';

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<RequiredAbility[]>(CHECK_ABILITIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user) throw new ForbiddenException('No user on request');

    const ability = await this.abilityFactory.createForUser(user);
    req.ability = ability;

    for (const r of required) {
      if (!ability.can(r.action, r.subject)) {
        throw new ForbiddenException(
          `Missing ability: ${r.action} on ${r.subject}`,
        );
      }
    }
    return true;
  }
}
