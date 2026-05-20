import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { loginSchema, refreshSchema } from '@rest/shared-types';

import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { CheckAbilities } from '../../common/casl/check-abilities.decorator';
import { AbilitiesGuard } from '../../common/casl/abilities.guard';

const impersonateSchema = z.object({ targetUserId: z.string().uuid() });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request) {
    const { email, password } = loginSchema.parse(body);
    return this.auth.login(email, password, {
      ip: req.ip,
      ua: req.headers['user-agent']?.toString(),
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: unknown, @Req() req: Request) {
    const { refreshToken } = refreshSchema.parse(body);
    return this.auth.refresh(refreshToken, {
      ip: req.ip,
      ua: req.headers['user-agent']?.toString(),
    });
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: unknown) {
    const { refreshToken } = refreshSchema.parse(body);
    await this.auth.logout(refreshToken);
  }

  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: 'impersonate', subject: 'User' })
  @Post('impersonate')
  @HttpCode(200)
  async impersonate(@Body() body: unknown, @CurrentUser() me: RequestUser) {
    const { targetUserId } = impersonateSchema.parse(body);
    return this.auth.impersonate(me.id, targetUserId);
  }
}
