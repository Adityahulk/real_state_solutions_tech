import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../auth/current-user.decorator';

/**
 * Lightweight global interceptor. Logs every non-GET request that returns
 * 2xx into AuditLog. Detailed before/after diffs are written by services
 * directly when they need them; this catches the rest.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const user = req.user as RequestUser | undefined;
          const ctrl = context.getClass().name;
          const handler = context.getHandler().name;
          await this.prisma.auditLog.create({
            data: {
              actorId: user?.id,
              entityType: ctrl.replace(/Controller$/, ''),
              entityId:
                (typeof result === 'object' && result && (result as { id?: string }).id) ||
                (req.params?.id as string) ||
                'unknown',
              action: `${method.toLowerCase()}.${handler}`,
              ip: req.ip,
              userAgent: req.headers['user-agent']?.toString(),
            },
          });
        } catch {
          // swallow — audit failure must never break a successful request
        }
      }),
    );
  }
}
