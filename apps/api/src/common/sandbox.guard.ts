import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Method-level guard that refuses the request unless the deployment is in
 * non-production mode OR an explicit `ALLOW_SANDBOX_WEBHOOKS=true` env var
 * is set (useful for staging).
 *
 * Without this, anyone with an installment id could visit
 * `/api/webhooks/sandbox/pay/<id>` and mark it paid on prod. Same for
 * `/api/webhooks/sandbox/esign/<docId>/<identifier>`.
 */
@Injectable()
export class SandboxOnlyGuard implements CanActivate {
  canActivate(): boolean {
    const allow =
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_SANDBOX_WEBHOOKS === 'true';
    if (!allow) {
      throw new ForbiddenException(
        'Sandbox webhooks are disabled in production. Set ALLOW_SANDBOX_WEBHOOKS=true to enable explicitly.',
      );
    }
    return true;
  }
}
