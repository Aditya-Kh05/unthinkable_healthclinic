import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  holdSlotSchema,
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
} from '../validators/appointment.validator';

const router = Router();

// ── Public-ish doctor search (requires auth but any role) ────
// GET /api/v1/doctors — Search doctors
router.get('/doctors', authenticate, (req, res, next) => {
  appointmentController.searchDoctors(req, res, next);
});

// GET /api/v1/doctors/:id/slots?date=YYYY-MM-DD — Get available slots
router.get('/doctors/:id/slots', authenticate, (req, res, next) => {
  appointmentController.getAvailableSlots(req, res, next);
});

// ── Patient appointment routes ──────────────────────────────
// All require PATIENT role

// POST /api/v1/appointments/hold — Hold a slot
router.post(
  '/appointments/hold',
  authenticate,
  authorize('PATIENT'),
  validate(holdSlotSchema),
  (req, res, next) => {
    appointmentController.holdSlot(req, res, next);
  }
);

// POST /api/v1/appointments — Book an appointment
router.post(
  '/appointments',
  authenticate,
  authorize('PATIENT'),
  validate(bookAppointmentSchema),
  (req, res, next) => {
    appointmentController.bookAppointment(req, res, next);
  }
);

// GET /api/v1/appointments — List my appointments
router.get(
  '/appointments',
  authenticate,
  authorize('PATIENT'),
  (req, res, next) => {
    appointmentController.getMyAppointments(req, res, next);
  }
);

// GET /api/v1/appointments/:id — Get appointment detail
router.get(
  '/appointments/:id',
  authenticate,
  (req, res, next) => {
    appointmentController.getAppointmentById(req, res, next);
  }
);

// PUT /api/v1/appointments/:id/cancel — Cancel appointment
router.put(
  '/appointments/:id/cancel',
  authenticate,
  authorize('PATIENT'),
  (req, res, next) => {
    appointmentController.cancelAppointment(req, res, next);
  }
);

// PUT /api/v1/appointments/:id/reschedule — Reschedule appointment
router.put(
  '/appointments/:id/reschedule',
  authenticate,
  authorize('PATIENT'),
  validate(rescheduleAppointmentSchema),
  (req, res, next) => {
    appointmentController.rescheduleAppointment(req, res, next);
  }
);

export default router;
