import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';

const router = Router();

// POST /api/v1/auth/register — Register new patient
router.post('/register', validate(registerSchema), (req, res, next) => {
  authController.register(req, res, next);
});

// POST /api/v1/auth/login — Login (all roles)
router.post('/login', validate(loginSchema), (req, res, next) => {
  authController.login(req, res, next);
});

// POST /api/v1/auth/refresh — Refresh access token
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => {
  authController.refreshToken(req, res, next);
});

// GET /api/v1/auth/profile — Get current user profile
router.get('/profile', authenticate, (req, res, next) => {
  authController.getProfile(req, res, next);
});

export default router;
