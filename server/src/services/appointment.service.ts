import prisma from '../config/database';
import { ApiError } from '../utils/api-error';
import { slotService } from './slot.service';
import { llmService } from './llm.service';
import { emailService } from './email.service';
import { calendarService } from './calendar.service';

export class AppointmentService {
  /**
   * Search doctors by specialisation or name (patient-facing).
   */
  async searchDoctors(filters: { specialisation?: string; name?: string; page: number; limit: number }) {
    const { specialisation, name, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (specialisation) {
      where.specialisation = { contains: specialisation, mode: 'insensitive' };
    }
    if (name) {
      where.user = { name: { contains: name, mode: 'insensitive' } };
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          schedules: true,
        },
        skip,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.doctor.count({ where }),
    ]);

    return {
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        email: d.user.email,
        specialisation: d.specialisation,
        slotDurationMin: d.slotDurationMin,
        schedules: d.schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available slots for a doctor on a date.
   */
  async getAvailableSlots(doctorId: string, date: string) {
    return slotService.getAvailableSlots(doctorId, date);
  }

  /**
   * Hold a slot temporarily.
   */
  async holdSlot(patientId: string, doctorId: string, date: string, startTime: string) {
    return slotService.holdSlot(patientId, doctorId, date, startTime);
  }

  /**
   * Confirm booking from a held slot + symptoms.
   */
  async bookAppointment(patientId: string, slotHoldId: string, symptoms: string) {
    // Find the slot hold
    const hold = await prisma.slotHold.findUnique({ where: { id: slotHoldId } });
    if (!hold) {
      throw ApiError.notFound('Slot hold not found or expired');
    }
    if (hold.patientId !== patientId) {
      throw ApiError.forbidden('This slot hold does not belong to you');
    }
    if (hold.expiresAt < new Date()) {
      // Clean up expired hold
      await prisma.slotHold.delete({ where: { id: slotHoldId } });
      throw ApiError.badRequest('Slot hold has expired. Please select a slot again.');
    }

    // Get doctor to calculate end time
    const doctor = await prisma.doctor.findUnique({ where: { id: hold.doctorId } });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    // Calculate end time
    const [h, m] = hold.startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + doctor.slotDurationMin;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    // Transaction: create appointment + pre-visit summary + delete hold
    const appointment = await prisma.$transaction(async (tx) => {
      // Double-check no conflicting appointment exists
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: hold.doctorId,
          date: hold.date,
          startTime: hold.startTime,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
      });
      if (conflict) {
        throw ApiError.conflict('This slot has already been booked');
      }

      // Create appointment
      const appt = await tx.appointment.create({
        data: {
          patientId,
          doctorId: hold.doctorId,
          date: hold.date,
          startTime: hold.startTime,
          endTime,
          status: 'CONFIRMED',
        },
      });

      // Create pre-visit summary (LLM processing will happen in Phase 3)
      await tx.preVisitSummary.create({
        data: {
          appointmentId: appt.id,
          symptomsRaw: symptoms,
          llmStatus: 'PENDING',
          suggestedQuestions: [],
        },
      });

      // Delete the slot hold
      await tx.slotHold.delete({ where: { id: slotHoldId } });

      return appt;
    });

    // Trigger background processes
    emailService.sendBookingConfirmation(appointment.id).catch(console.error);
    llmService.generatePreVisitSummary(appointment.id).catch(console.error);
    calendarService.createAppointmentEvent(appointment.id).catch(console.error);

    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      createdAt: appointment.createdAt,
    };
  }

  /**
   * List appointments for a patient.
   */
  async getPatientAppointments(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
        preVisitSummary: true,
        postVisitSummary: true,
        prescriptions: true,
      },
      orderBy: { date: 'desc' },
    });

    return appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      doctor: {
        id: a.doctor.id,
        name: a.doctor.user.name,
        specialisation: a.doctor.specialisation,
      },
      preVisitSummary: a.preVisitSummary
        ? {
            urgency: a.preVisitSummary.urgency,
            chiefComplaint: a.preVisitSummary.chiefComplaint,
            suggestedQuestions: a.preVisitSummary.suggestedQuestions,
            llmStatus: a.preVisitSummary.llmStatus,
          }
        : null,
      postVisitSummary: a.postVisitSummary
        ? {
            patientSummary: a.postVisitSummary.patientSummary,
            llmStatus: a.postVisitSummary.llmStatus,
          }
        : null,
      prescriptions: a.prescriptions,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Get single appointment detail.
   */
  async getAppointmentById(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
        patient: { select: { id: true, name: true, email: true } },
        preVisitSummary: true,
        postVisitSummary: true,
        prescriptions: true,
      },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }

    // Verify the user is either the patient or the doctor
    if (appointment.patientId !== userId && appointment.doctor.userId !== userId) {
      throw ApiError.forbidden('You do not have access to this appointment');
    }

    return appointment;
  }

  /**
   * Cancel an appointment.
   */
  async cancelAppointment(appointmentId: string, patientId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }
    if (appointment.patientId !== patientId) {
      throw ApiError.forbidden('You can only cancel your own appointments');
    }
    if (appointment.status !== 'CONFIRMED') {
      throw ApiError.badRequest(`Cannot cancel appointment with status: ${appointment.status}`);
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    emailService.sendCancellationEmail(appointmentId).catch(console.error);
    calendarService.deleteAppointmentEvent(appointmentId).catch(console.error);

    return {
      id: updated.id,
      status: updated.status,
      message: 'Appointment cancelled successfully',
    };
  }

  /**
   * Reschedule an appointment to a new date/time.
   */
  async rescheduleAppointment(
    appointmentId: string,
    patientId: string,
    newDate: string,
    newStartTime: string
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }
    if (appointment.patientId !== patientId) {
      throw ApiError.forbidden('You can only reschedule your own appointments');
    }
    if (appointment.status !== 'CONFIRMED') {
      throw ApiError.badRequest(`Cannot reschedule appointment with status: ${appointment.status}`);
    }

    const date = new Date(newDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // Calculate new end time
    const [h, m] = newStartTime.split(':').map(Number);
    const endMinutes = h * 60 + m + appointment.doctor.slotDurationMin;
    const newEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

    // Check if new slot is available
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        date: startOfDay,
        startTime: newStartTime,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        id: { not: appointmentId },
      },
    });
    if (conflict) {
      throw ApiError.conflict('The new time slot is not available');
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: startOfDay,
        startTime: newStartTime,
        endTime: newEndTime,
      },
    });

    // Delete old event and create new one for calendar update
    calendarService.deleteAppointmentEvent(appointmentId).then(() => {
      calendarService.createAppointmentEvent(appointmentId).catch(console.error);
    }).catch(console.error);

    return {
      id: updated.id,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
      status: updated.status,
      message: 'Appointment rescheduled successfully',
    };
  }
}

export const appointmentService = new AppointmentService();
