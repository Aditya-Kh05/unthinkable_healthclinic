import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { ApiResponse } from '../utils/api-response';

export class AdminController {
  // ── Doctor CRUD ────────────────────────────────────

  async createDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.createDoctor(req.body);
      ApiResponse.created(res, result, 'Doctor created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllDoctors(_req: Request, res: Response, next: NextFunction) {
    try {
      const doctors = await adminService.getAllDoctors();
      ApiResponse.success(res, doctors);
    } catch (error) {
      next(error);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const doctor = await adminService.getDoctorById(req.params.id as string);
      ApiResponse.success(res, doctor);
    } catch (error) {
      next(error);
    }
  }

  async updateDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const doctor = await adminService.updateDoctor(req.params.id as string, req.body);
      ApiResponse.success(res, doctor, 200, 'Doctor updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteDoctor(req.params.id as string);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Schedule ───────────────────────────────────────

  async setSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const schedules = await adminService.setDoctorSchedule(req.params.id as string, req.body);
      ApiResponse.success(res, schedules, 200, 'Schedule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ── Leave ──────────────────────────────────────────

  async markLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.markDoctorLeave(req.params.id as string, req.body);
      ApiResponse.created(res, result, 'Leave marked successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const leaves = await adminService.getDoctorLeaves(req.params.id as string);
      ApiResponse.success(res, leaves);
    } catch (error) {
      next(error);
    }
  }

  async removeLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.removeDoctorLeave(
        req.params.id as string,
        req.params.leaveId as string
      );
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
