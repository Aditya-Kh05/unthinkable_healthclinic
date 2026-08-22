import prisma from '../config/database';
import { config } from '../config';
import { ApiError } from '../utils/api-error';

/**
 * Generates available time slots for a doctor on a given date.
 * Excludes already booked slots, held slots, and respects leave days.
 */
export class SlotService {
  /**
   * Get available time slots for a doctor on a specific date.
   */
  async getAvailableSlots(doctorId: string, dateStr: string) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday

    // Check if doctor exists and is active
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: { select: { name: true } } },
    });
    if (!doctor || !doctor.isActive) {
      throw ApiError.notFound('Doctor not found or inactive');
    }

    // Check if doctor is on leave
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const isOnLeave = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        leaveDate: { gte: startOfDay, lte: endOfDay },
      },
    });
    if (isOnLeave) {
      return { doctorName: doctor.user.name, date: dateStr, slots: [], message: 'Doctor is on leave this day' };
    }

    // Get schedule for this day of week
    const schedule = await prisma.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });
    if (!schedule) {
      return { doctorName: doctor.user.name, date: dateStr, slots: [], message: 'Doctor does not work on this day' };
    }

    // Generate all possible time slots
    const allSlots = this.generateTimeSlots(
      schedule.startTime,
      schedule.endTime,
      doctor.slotDurationMin
    );

    // Get booked appointments for this date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'SLOT_HELD'] },
      },
      select: { startTime: true },
    });
    const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

    // Get held slots for this date (not expired)
    const heldSlots = await prisma.slotHold.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        expiresAt: { gt: new Date() },
      },
      select: { startTime: true },
    });
    const heldTimes = new Set(heldSlots.map((h) => h.startTime));

    // Filter out booked and held slots
    const availableSlots = allSlots.filter(
      (slot) => !bookedTimes.has(slot.startTime) && !heldTimes.has(slot.startTime)
    );

    return {
      doctorName: doctor.user.name,
      date: dateStr,
      slotDurationMin: doctor.slotDurationMin,
      totalSlots: allSlots.length,
      availableSlots: availableSlots.length,
      slots: availableSlots,
    };
  }

  /**
   * Hold a slot temporarily (5-min TTL).
   */
  async holdSlot(patientId: string, doctorId: string, dateStr: string, startTime: string) {
    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || !doctor.isActive) {
      throw ApiError.notFound('Doctor not found or inactive');
    }

    // Check not on leave
    const isOnLeave = await prisma.doctorLeave.findFirst({
      where: { doctorId, leaveDate: { gte: startOfDay, lte: endOfDay } },
    });
    if (isOnLeave) {
      throw ApiError.badRequest('Doctor is on leave on this date');
    }

    // Check slot isn't already booked
    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        startTime,
        status: { in: ['CONFIRMED', 'SLOT_HELD'] },
      },
    });
    if (existingBooking) {
      throw ApiError.conflict('This slot is already booked');
    }

    // Clean up any existing holds by this patient
    await prisma.slotHold.deleteMany({
      where: { patientId },
    });

    // Clean up expired holds for this slot
    await prisma.slotHold.deleteMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        startTime,
        expiresAt: { lt: new Date() },
      },
    });

    // Create the hold
    const expiresAt = new Date(Date.now() + config.slotHoldTtlMinutes * 60 * 1000);

    try {
      const hold = await prisma.slotHold.create({
        data: {
          doctorId,
          patientId,
          date: startOfDay,
          startTime,
          expiresAt,
        },
      });

      return {
        id: hold.id,
        doctorId,
        date: dateStr,
        startTime,
        expiresAt: hold.expiresAt,
        ttlMinutes: config.slotHoldTtlMinutes,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw ApiError.conflict('This slot is currently held by another patient');
      }
      throw error;
    }
  }

  /**
   * Generate time slots between start and end time with given duration.
   */
  private generateTimeSlots(startTime: string, endTime: string, durationMin: number) {
    const slots: { startTime: string; endTime: string }[] = [];

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMin <= endMinutes) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + durationMin);
      slots.push({ startTime: slotStart, endTime: slotEnd });
      currentMinutes += durationMin;
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}

export const slotService = new SlotService();
