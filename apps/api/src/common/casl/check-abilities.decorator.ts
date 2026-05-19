import { SetMetadata } from '@nestjs/common';
import type { Action, Subject } from '@rest/shared-types';

export interface RequiredAbility {
  action: Action;
  subject: Subject;
}

export const CHECK_ABILITIES_KEY = 'check_abilities';

/**
 * Declare one or more (action, subject) tuples the user must satisfy.
 * Multiple tuples are AND-ed.
 */
export const CheckAbilities = (...abilities: RequiredAbility[]) =>
  SetMetadata(CHECK_ABILITIES_KEY, abilities);
