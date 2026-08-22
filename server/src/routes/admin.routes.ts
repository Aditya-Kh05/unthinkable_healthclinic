import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDoctorSchema,
  updateDoctorSchema,
  doctorScheduleSchema,
  doctorLeaveSchema,
} from '../validators/admin.validator';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ── Doctor CRUD ─────────────────────────────────────
// POST   /api/v1/admin/doctors       — Create doctor
// GET    /api/v1/admin/doctors       — List all doctors
// GET    /api/v1/admin/doctors/:id   — Get single doctor
// PUT    /api/v1/admin/doctors/:id   — Update doctor
// DELETE /api/v1/admin/doctors/:id   — Deactivate doctor

router.post('/doctors', validate(createDoctorSchema), (req, res, next) => {
  adminController.createDoctor(req, res, next);
});

router.get('/doctors', (req, res, next) => {
  adminController.getAllDoctors(req, res, next);
});

router.get('/doctors/:id', (req, res, next) => {
  adminController.getDoctorById(req, res, next);
});

router.put('/doctors/:id', validate(updateDoctorSchema), (req, res, next) => {
  adminController.updateDoctor(req, res, next);
});

router.delete('/doctors/:id', (req, res, next) => {
  adminController.deleteDoctor(req, res, next);
});

// ── Schedule ────────────────────────────────────────
// POST /api/v1/admin/doctors/:id/schedule — Set working hours

router.post('/doctors/:id/schedule', validate(doctorScheduleSchema), (req, res, next) => {
  adminController.setSchedule(req, res, next);
});

// ── Leave ───────────────────────────────────────────
// POST   /api/v1/admin/doctors/:id/leave           — Mark leave
// GET    /api/v1/admin/doctors/:id/leave           — Get leaves
// DELETE /api/v1/admin/doctors/:id/leave/:leaveId  — Remove leave

router.post('/doctors/:id/leave', validate(doctorLeaveSchema), (req, res, next) => {
  adminController.markLeave(req, res, next);
});

router.get('/doctors/:id/leave', (req, res, next) => {
  adminController.getLeaves(req, res, next);
});

router.delete('/doctors/:id/leave/:leaveId', (req, res, next) => {
  adminController.removeLeave(req, res, next);
});

export default router;
