import prisma from '../config/database';
import { ApiError } from '../utils/api-error';
import { PostVisitNotesInput } from '../validators/doctor.validator';
import { llmService } from './llm.service';
import { emailService } from './email.service';

export class DoctorService {
  /**
   * Get the doctor record for a user ID.
   */
  private async getDoctorByUserId(userId: string) {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw ApiError.notFound('Doctor profile not found');
    }
    return doctor;
  }

  /**
   * List appointments for the logged-in doctor.
   */
  async getMyAppointments(userId: string, filter?: { date?: string; status?: string }) {
    const doctor = await this.getDoctorByUserId(userId);

    const where: any = { doctorId: doctor.id };

    if (filter?.date) {
      const date = new Date(filter.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    if (filter?.status) {
      where.status = filter.status;
    } else {
      // By default exclude cancelled
      where.status = { in: ['CONFIRMED', 'COMPLETED'] };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true },
        },
        preVisitSummary: true,
        postVisitSummary: true,
        prescriptions: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      patient: a.patient,
      preVisitSummary: a.preVisitSummary
        ? {
            symptomsRaw: a.preVisitSummary.symptomsRaw,
            urgency: a.preVisitSummary.urgency,
            chiefComplaint: a.preVisitSummary.chiefComplaint,
            suggestedQuestions: a.preVisitSummary.suggestedQuestions,
            llmStatus: a.preVisitSummary.llmStatus,
          }
        : null,
      postVisitSummary: a.postVisitSummary
        ? {
            clinicalNotes: a.postVisitSummary.clinicalNotes,
            patientSummary: a.postVisitSummary.patientSummary,
            llmStatus: a.postVisitSummary.llmStatus,
          }
        : null,
      prescriptions: a.prescriptions,
    }));
  }

  /**
   * View pre-visit summary for an appointment.
   */
  async getPreVisitSummary(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        preVisitSummary: true,
        patient: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }
    if (appointment.doctorId !== doctor.id) {
      throw ApiError.forbidden('This appointment does not belong to you');
    }

    return {
      appointmentId: appointment.id,
      patient: appointment.patient,
      date: appointment.date,
      startTime: appointment.startTime,
      preVisitSummary: appointment.preVisitSummary,
    };
  }

  /**
   * Submit post-visit notes, prescription, and trigger LLM summary.
   */
  async completeAppointment(userId: string, appointmentId: string, input: PostVisitNotesInput) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw ApiError.notFound('Appointment not found');
    }
    if (appointment.doctorId !== doctor.id) {
      throw ApiError.forbidden('This appointment does not belong to you');
    }
    if (appointment.status !== 'CONFIRMED') {
      throw ApiError.badRequest(`Cannot complete appointment with status: ${appointment.status}`);
    }

    // Transaction: mark complete + create post-visit summary + add prescriptions
    const result = await prisma.$transaction(async (tx) => {
      // Update appointment status
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
      });

      // Create post-visit summary (LLM will process in Phase 3)
      const summary = await tx.postVisitSummary.create({
        data: {
          appointmentId,
          clinicalNotes: input.clinicalNotes,
          llmStatus: 'PENDING',
        },
      });

      // Add prescriptions
      let prescriptions: any[] = [];
      if (input.prescriptions && input.prescriptions.length > 0) {
        await tx.prescription.createMany({
          data: input.prescriptions.map((p) => ({
            appointmentId,
            medicationName: p.medicationName,
            dosage: p.dosage,
            frequency: p.frequency,
            durationDays: p.durationDays,
          })),
        });

        prescriptions = await tx.prescription.findMany({
          where: { appointmentId },
        });
      }

      return { summary, prescriptions };
    });

    // Trigger background processes
    llmService.generatePostVisitSummary(appointmentId).then(() => {
      // Send email after LLM completes
      emailService.sendPostVisitSummary(appointmentId).catch(console.error);
    }).catch(console.error);

    // Queue medication reminders using BullMQ delayed jobs
    if (result.prescriptions && result.prescriptions.length > 0) {
      import('../queues/reminder.queue').then(({ reminderQueue }) => {
        prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: { patient: { select: { name: true, email: true } } }
        }).then(apptWithPatient => {
          if (!apptWithPatient) return;
          const { name, email } = apptWithPatient.patient;
          
          for (const prescription of result.prescriptions) {
            // Schedule a reminder for each day of the duration
            for (let i = 1; i <= prescription.durationDays; i++) {
              // Note: Using a shorter delay for testing if needed, but normally: i * 24 * 60 * 60 * 1000
              const delay = i * 24 * 60 * 60 * 1000; 
              
              reminderQueue.add(
                'medication-reminder',
                {
                  patientEmail: email,
                  patientName: name,
                  medicationName: prescription.medicationName,
                  dosage: prescription.dosage,
                },
                { delay }
              );
            }
          }
        }).catch(console.error);
      }).catch(console.error);
    }

    return {
      appointmentId,
      status: 'COMPLETED',
      postVisitSummary: result.summary,
      prescriptions: result.prescriptions,
      message: 'Appointment completed successfully',
    };
  }

  /**
   * Get doctor's own schedule.
   */
  async getMySchedule(userId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const [schedules, upcomingLeaves] = await Promise.all([
      prisma.doctorSchedule.findMany({
        where: { doctorId: doctor.id },
        orderBy: { dayOfWeek: 'asc' },
      }),
      prisma.doctorLeave.findMany({
        where: {
          doctorId: doctor.id,
          leaveDate: { gte: new Date() },
        },
        orderBy: { leaveDate: 'asc' },
      }),
    ]);

    return {
      doctorId: doctor.id,
      specialisation: doctor.specialisation,
      slotDurationMin: doctor.slotDurationMin,
      schedules,
      upcomingLeaves,
    };
  }
}

export const doctorService = new DoctorService();
