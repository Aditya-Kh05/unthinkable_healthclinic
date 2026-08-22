import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { ApiError } from '../utils/api-error';
import {
  CreateDoctorInput,
  UpdateDoctorInput,
  DoctorScheduleInput,
  DoctorLeaveInput,
} from '../validators/admin.validator';
import { emailService } from './email.service';

export class AdminService {
  // ── Doctor CRUD ──────────────────────────────────────

  async createDoctor(input: CreateDoctorInput) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user + doctor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: 'DOCTOR',
          name: input.name,
          phone: input.phone || null,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specialisation: input.specialisation,
          slotDurationMin: input.slotDurationMin,
        },
      });

      return {
        id: doctor.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        specialisation: doctor.specialisation,
        slotDurationMin: doctor.slotDurationMin,
        isActive: doctor.isActive,
        createdAt: doctor.createdAt,
      };
    });

    return result;
  }

  async getAllDoctors() {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
        schedules: true,
        leaves: {
          where: {
            leaveDate: { gte: new Date() },
          },
          orderBy: { leaveDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return doctors.map((d) => ({
      id: d.id,
      userId: d.userId,
      email: d.user.email,
      name: d.user.name,
      phone: d.user.phone,
      specialisation: d.specialisation,
      slotDurationMin: d.slotDurationMin,
      isActive: d.isActive,
      schedules: d.schedules,
      upcomingLeaves: d.leaves,
      createdAt: d.createdAt,
    }));
  }

  async getDoctorById(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: { id: true, email: true, name: true, phone: true },
        },
        schedules: true,
        leaves: {
          where: { leaveDate: { gte: new Date() } },
          orderBy: { leaveDate: 'asc' },
        },
      },
    });

    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    return {
      id: doctor.id,
      userId: doctor.userId,
      email: doctor.user.email,
      name: doctor.user.name,
      phone: doctor.user.phone,
      specialisation: doctor.specialisation,
      slotDurationMin: doctor.slotDurationMin,
      isActive: doctor.isActive,
      schedules: doctor.schedules,
      upcomingLeaves: doctor.leaves,
    };
  }

  async updateDoctor(doctorId: string, input: UpdateDoctorInput) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    await prisma.$transaction(async (tx) => {
      // Update user fields if provided
      if (input.name || input.phone !== undefined) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            ...(input.name && { name: input.name }),
            ...(input.phone !== undefined && { phone: input.phone }),
          },
        });
      }

      // Update doctor fields if provided
      if (input.specialisation || input.slotDurationMin || input.isActive !== undefined) {
        await tx.doctor.update({
          where: { id: doctorId },
          data: {
            ...(input.specialisation && { specialisation: input.specialisation }),
            ...(input.slotDurationMin && { slotDurationMin: input.slotDurationMin }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
          },
        });
      }
    });

    return this.getDoctorById(doctorId);
  }

  async deleteDoctor(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    // Soft delete — deactivate rather than remove
    await prisma.doctor.update({
      where: { id: doctorId },
      data: { isActive: false },
    });

    return { message: 'Doctor deactivated successfully' };
  }

  // ── Schedule Management ──────────────────────────────

  async setDoctorSchedule(doctorId: string, input: DoctorScheduleInput) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    // Delete existing schedules and replace
    await prisma.$transaction(async (tx) => {
      await tx.doctorSchedule.deleteMany({ where: { doctorId } });

      await tx.doctorSchedule.createMany({
        data: input.schedules.map((s) => ({
          doctorId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    });

    return prisma.doctorSchedule.findMany({ where: { doctorId } });
  }

  // ── Leave Management ─────────────────────────────────

  async markDoctorLeave(doctorId: string, input: DoctorLeaveInput) {
    const doctor = await prisma.doctor.findUnique({ 
      where: { id: doctorId },
      include: { user: true }
    });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    const leaveDate = new Date(input.leaveDate);

    // Check if leave already marked for this date
    const existingLeave = await prisma.doctorLeave.findUnique({
      where: {
        doctorId_leaveDate: { doctorId, leaveDate },
      },
    });
    if (existingLeave) {
      throw ApiError.conflict('Leave already marked for this date');
    }

    // Find affected appointments on the leave date
    const startOfDay = new Date(leaveDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(leaveDate);
    endOfDay.setHours(23, 59, 59, 999);

    const affectedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'SLOT_HELD'] },
      },
      include: {
        patient: { select: { id: true, email: true, name: true } },
      },
    });

    // Transaction: create leave + cancel affected appointments
    await prisma.$transaction(async (tx) => {
      // Create leave record
      await tx.doctorLeave.create({
        data: { doctorId, leaveDate, reason: input.reason || null },
      });

      // Cancel affected appointments
      if (affectedAppointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: affectedAppointments.map((a) => a.id) },
          },
          data: { status: 'CANCELLED_BY_LEAVE' },
        });
      }

      // Delete any slot holds for this date
      await tx.slotHold.deleteMany({
        where: {
          doctorId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });
    });

    // Send email notifications to affected patients asynchronously
    for (const appt of affectedAppointments) {
      emailService.sendLeaveNotification(
        appt.patient.email,
        appt.patient.name,
        appt.patient.id,
        doctor.user.name,
        leaveDate.toLocaleDateString(),
        appt.startTime
      ).catch(console.error);
    }

    return {
      leaveDate,
      affectedAppointments: affectedAppointments.length,
      cancelledPatients: affectedAppointments.map((a) => ({
        patientName: a.patient.name,
        patientEmail: a.patient.email,
        appointmentTime: a.startTime,
      })),
    };
  }

  async getDoctorLeaves(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    return prisma.doctorLeave.findMany({
      where: { doctorId },
      orderBy: { leaveDate: 'asc' },
    });
  }

  async removeDoctorLeave(doctorId: string, leaveId: string) {
    const leave = await prisma.doctorLeave.findFirst({
      where: { id: leaveId, doctorId },
    });
    if (!leave) {
      throw ApiError.notFound('Leave record not found');
    }

    await prisma.doctorLeave.delete({ where: { id: leaveId } });
    return { message: 'Leave removed successfully' };
  }
}

export const adminService = new AdminService();
