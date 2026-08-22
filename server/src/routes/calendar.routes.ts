import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/v1/calendar/auth — Get Google OAuth URL
router.get('/auth', authenticate, (req, res, next) => {
  calendarController.getAuthUrl(req, res, next);
});

// GET /api/v1/calendar/callback — Google OAuth callback (public, state has userId)
router.get('/callback', (req, res, next) => {
  calendarController.handleCallback(req, res, next);
});

export default router;
