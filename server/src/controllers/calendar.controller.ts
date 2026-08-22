import { Request, Response, NextFunction } from 'express';
import { calendarService } from '../services/calendar.service';
import { ApiResponse } from '../utils/api-response';
import { config } from '../config';

export class CalendarController {
  /**
   * Start Google OAuth flow
   */
  getAuthUrl(req: Request, res: Response, _next: NextFunction) {
    const url = calendarService.getAuthUrl(req.user!.userId);
    ApiResponse.success(res, { url });
  }

  /**
   * Handle Google OAuth callback
   */
  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        ApiResponse.error(res, 400, 'Missing code or state');
        return;
      }

      await calendarService.handleCallback(code as string, state as string);
      
      // Redirect back to frontend
      res.redirect(`${config.clientUrl}/settings?calendar=success`);
    } catch (error) {
      console.error('Calendar callback error:', error);
      res.redirect(`${config.clientUrl}/settings?calendar=error`);
    }
  }
}

export const calendarController = new CalendarController();
