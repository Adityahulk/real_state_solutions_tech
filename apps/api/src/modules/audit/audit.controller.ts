import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';

const querySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

@UseGuards(AbilitiesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @CheckAbilities({ action: 'read', subject: 'AuditLog' })
  async list(@Query() raw: unknown) {
    const q = querySchema.parse(raw);
    const items = await this.prisma.auditLog.findMany({
      where: {
        entityType: q.entityType,
        entityId: q.entityId,
        actorId: q.actorId,
      },
      orderBy: { createdAt: 'desc' },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, email: true, displayName: true } },
      },
    });
    const hasMore = items.length > q.limit;
    return { items: items.slice(0, q.limit), nextCursor: hasMore ? items[q.limit]?.id : null };
  }

  @Get('role-changes')
  @CheckAbilities({ action: 'read', subject: 'AuditLog' })
  async roleAudit() {
    return this.prisma.roleAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
