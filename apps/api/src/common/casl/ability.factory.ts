import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  PureAbility,
  AbilityTuple,
  MatchConditions,
  ConditionsMatcher,
} from '@casl/ability';

import type { Action, Subject } from '@rest/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../modules/auth/current-user.decorator';

export type AppAbility = PureAbility<AbilityTuple<Action, Subject | 'all'>, MatchConditions>;

const lambdaMatcher: ConditionsMatcher<MatchConditions> = (matchConditions) => matchConditions;

/**
 * Substitutes "$user.foo" placeholders inside the stored CASL conditions
 * with values from the requesting user. Supports a small set of operators
 * sufficient for v1: $eq (implicit), $in, $contains.
 */
function compileConditions(
  raw: Record<string, unknown> | null | undefined,
  user: RequestUser,
  scope: Record<string, unknown> | null,
): MatchConditions | undefined {
  if (!raw) return undefined;
  const ctx = { user, scope };

  const resolve = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    if (!value.startsWith('$')) return value;
    // dot path lookup on ctx
    const path = value.slice(1).split('.');
    let cur: unknown = ctx;
    for (const seg of path) {
      if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        return undefined;
      }
    }
    return cur;
  };

  const compiled: Record<string, unknown> = {};
  for (const [field, expr] of Object.entries(raw)) {
    if (expr && typeof expr === 'object' && !Array.isArray(expr)) {
      const op = expr as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(op)) out[k] = resolve(v);
      compiled[field] = out;
    } else {
      compiled[field] = resolve(expr);
    }
  }

  return (subject: Record<string, unknown>) => {
    for (const [field, expr] of Object.entries(compiled)) {
      const actual = subject[field];
      if (expr && typeof expr === 'object' && !Array.isArray(expr)) {
        const op = expr as Record<string, unknown>;
        if ('$in' in op) {
          const arr = op.$in as unknown[];
          if (!Array.isArray(arr) || !arr.includes(actual)) return false;
        } else if ('$contains' in op) {
          const needle = op.$contains;
          if (!Array.isArray(actual) || !actual.includes(needle)) return false;
        } else if ('$eq' in op) {
          if (actual !== op.$eq) return false;
        }
      } else if (actual !== expr) {
        return false;
      }
    }
    return true;
  };
}

@Injectable()
export class AbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compiles a user's role assignments into an Ability.
   * `super_admin` short-circuits to "can(manage, all)".
   */
  async createForUser(user: RequestUser): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(PureAbility);

    if (user.roleKeys.includes('super_admin')) {
      can('manage', 'all');
      return build({ conditionsMatcher: lambdaMatcher });
    }

    // Load the full set of permissions across this user's role assignments,
    // including their scopes.
    const roleIds = user.assignments.map((a) => a.roleId);
    if (roleIds.length === 0) return build({ conditionsMatcher: lambdaMatcher });

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    // Map roleId -> scope (first match wins; one user can hold same role
    // multiple times via different scopes, so we OR them implicitly by
    // adding multiple rules).
    const scopesByRole = new Map<string, Array<Record<string, unknown> | null>>();
    for (const a of user.assignments) {
      const arr = scopesByRole.get(a.roleId) ?? [];
      arr.push(a.scope);
      scopesByRole.set(a.roleId, arr);
    }

    for (const rp of rolePerms) {
      const subject = rp.permission.subject as Subject;
      const action = rp.permission.action as Action;
      const conditionsRaw = rp.conditions as Record<string, unknown> | null;
      const scopes = scopesByRole.get(rp.roleId) ?? [null];

      for (const scope of scopes) {
        const cond = compileConditions(conditionsRaw, user, scope);
        if (cond) {
          can(action, subject, cond);
        } else {
          can(action, subject);
        }
      }
    }

    return build({ conditionsMatcher: lambdaMatcher });
  }

  /**
   * Resolved view of "what can this user do?" — flat list for the UI.
   */
  async resolveMatrix(user: RequestUser) {
    if (user.roleKeys.includes('super_admin')) {
      return [{ subject: 'all', action: 'manage', source: 'super_admin' }];
    }
    const roleIds = user.assignments.map((a) => a.roleId);
    if (!roleIds.length) return [];
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true, role: { select: { key: true, name: true } } },
    });
    return rolePerms.map((rp) => ({
      subject: rp.permission.subject,
      action: rp.permission.action,
      conditions: rp.conditions,
      source: rp.role.key,
      roleName: rp.role.name,
    }));
  }
}
