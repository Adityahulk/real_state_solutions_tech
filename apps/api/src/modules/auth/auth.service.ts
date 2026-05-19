import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Optional: id of the super-admin doing impersonation, if any */
  impersonatedBy?: string;
}

const PASSWORD_ALGO = 'scrypt';

function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== PASSWORD_ALGO) return false;
  const [, salt, hash] = parts;
  const candidate = scryptSync(plain, salt!, 64);
  const expected = Buffer.from(hash!, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${PASSWORD_ALGO}$${salt}$${hash}`;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, ctx: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    if (!verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens({ sub: user.id, email: user.email }, ctx);
  }

  async refresh(refreshToken: string, ctx: { ip?: string; ua?: string }) {
    const refreshHash = sha256(refreshToken);
    const session = await this.prisma.authSession.findUnique({ where: { refreshHash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User inactive');

    // rotate refresh
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens({ sub: user.id, email: user.email }, ctx);
  }

  async logout(refreshToken: string) {
    const refreshHash = sha256(refreshToken);
    await this.prisma.authSession.updateMany({
      where: { refreshHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async impersonate(superAdminUserId: string, targetUserId: string) {
    // Caller must already have User:impersonate — guard enforces that.
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target || !target.isActive) throw new ForbiddenException('Target unavailable');

    // Log loudly
    await this.prisma.roleAuditLog.create({
      data: {
        actorId: superAdminUserId,
        action: 'impersonate.start',
        targetUserId,
      },
    });

    return this.issueTokens(
      { sub: target.id, email: target.email, impersonatedBy: superAdminUserId },
      {},
    );
  }

  private async issueTokens(payload: JwtPayload, ctx: { ip?: string; ua?: string }) {
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshHash = sha256(refreshToken);
    const ttlDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.authSession.create({
      data: {
        userId: payload.sub,
        refreshHash,
        userAgent: ctx.ua,
        ip: ctx.ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresAt };
  }
}
