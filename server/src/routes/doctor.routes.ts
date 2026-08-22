import { Router } from 'express';
import { doctorController } from '../controllers/doctor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { postVisitNotesSchema } from '../validators/doctor.validator';

const router = Router();

// All doctor routes require DOCTOR role
router.use(authenticate, authorize('DOCTOR'));

// GET /api/v1/doctor/appointments — List my appointments
// Query: ?date=YYYY-MM-DD&status=CONFIRMED|COMPLETED
router.get('/appointments', (req, res, next) => {
  doctorController.getMyAppointments(req, res, next);
});

// GET /api/v1/doctor/appointments/:id/summary — View pre-visit summary
router.get('/appointments/:id/summary', (req, res, next) => {
  doctorController.getPreVisitSummary(req, res, next);
});

// POST /api/v1/doctor/appointments/:id/complete — Submit notes & mark complete
router.post(
  '/appointments/:id/complete',
  validate(postVisitNotesSchema),
  (req, res, next) => {
    doctorController.completeAppointment(req, res, next);
  }
);

// GET /api/v1/doctor/schedule — View my schedule & leaves
router.get('/schedule', (req, res, next) => {
  doctorController.getMySchedule(req, res, next);
});

export default router;
