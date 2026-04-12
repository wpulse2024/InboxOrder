import { Request, Response } from 'express';
import * as notificationsService from './notifications.service';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const unreadOnly = req.query.unread === 'true';
  const result = await notificationsService.getNotifications(req.user!.tenantId, unreadOnly);
  res.json(result);
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const result = await notificationsService.markRead(req.params.id, req.user!.tenantId);
  res.json(result);
}
