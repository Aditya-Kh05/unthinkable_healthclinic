import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
import { ApiResponse } from '../utils/api-response';

export class AppointmentController {
  // ── Doctor Search ──────────────────────────────────

  async searchDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialisation, name, page, limit } = req.query;
      const result = await appointmentService.searchDoctors({
        specialisation: specialisation as string | undefined,
        name: name as string | undefined,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      });
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Slots ──────────────────────────────────────────

  async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const date = req.query.date as string;
      if (!date) {
        ApiResponse.error(res, 400, 'Date query parameter is required');
        return;
      }
      const result = await appointmentService.getAvailableSlots(id, date);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Slot Hold ──────────────────────────────────────

  async holdSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { doctorId, date, startTime } = req.body;
      const result = await appointmentService.holdSlot(
        req.user!.userId,
        doctorId,
        date,
        startTime
      );
      ApiResponse.created(res, result, 'Slot held successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Book Appointment ───────────────────────────────

  async bookAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { slotHoldId, symptoms } = req.body;
      const result = await appointmentService.bookAppointment(
        req.user!.userId,
        slotHoldId,
        symptoms
      );
      ApiResponse.created(res, result, 'Appointment booked successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── My Appointments ────────────────────────────────

  async getMyAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const result = await appointmentService.getPatientAppointments(
        req.user!.userId,
        status
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Appointment Detail ─────────────────────────────

  async getAppointmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appointmentService.getAppointmentById(
        req.params.id as string,
        req.user!.userId
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Cancel ─────────────────────────────────────────

  async cancelAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appointmentService.cancelAppointment(
        req.params.id as string,
        req.user!.userId
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Reschedule ─────────────────────────────────────

  async rescheduleAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { newDate, newStartTime } = req.body;
      const result = await appointmentService.rescheduleAppointment(
        req.params.id as string,
        req.user!.userId,
        newDate,
        newStartTime
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const appointmentController = new AppointmentController();
