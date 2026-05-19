import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from './auth.service';
import type { RequestUser } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roleAssignments: { include: { role: true } },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roleKeys: user.roleAssignments.map((ra) => ra.role.key),
      assignments: user.roleAssignments.map((ra) => ({
        roleId: ra.roleId,
        roleKey: ra.role.key,
        scope: ra.scope as Record<string, unknown> | null,
      })),
      impersonatedBy: payload.impersonatedBy,
    };
  }
}
