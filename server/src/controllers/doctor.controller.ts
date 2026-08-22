import { Request, Response, NextFunction } from 'express';
import { doctorService } from '../services/doctor.service';
import { ApiResponse } from '../utils/api-response';

export class DoctorController {
  async getMyAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string | undefined;
      const status = req.query.status as string | undefined;
      const result = await doctorService.getMyAppointments(req.user!.userId, { date, status });
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getPreVisitSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await doctorService.getPreVisitSummary(
        req.user!.userId,
        req.params.id as string
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async completeAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await doctorService.completeAppointment(
        req.user!.userId,
        req.params.id as string,
        req.body
      );
      ApiResponse.success(res, result, 200, 'Appointment completed');
    } catch (error) {
      next(error);
    }
  }

  async getMySchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await doctorService.getMySchedule(req.user!.userId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const doctorController = new DoctorController();
