import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() me: RequestUser, @Query('unread') unread?: string) {
    return this.notifications.list(me.id, { unreadOnly: unread === 'true' });
  }

  @Post(':id/read')
  read(@CurrentUser() me: RequestUser, @Param('id') id: string) {
    return this.notifications.markRead(me.id, id);
  }
}
