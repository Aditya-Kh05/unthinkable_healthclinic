import { z } from 'zod';

export const searchDoctorsSchema = z.object({
  specialisation: z.string().optional(),
  name: z.string().optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
});

export const getAvailableSlotsSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export const holdSlotSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export const bookAppointmentSchema = z.object({
  slotHoldId: z.string().uuid('Invalid slot hold ID'),
  symptoms: z.string().min(1, 'Symptoms are required').max(2000, 'Symptoms too long'),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
});

export type SearchDoctorsInput = z.infer<typeof searchDoctorsSchema>;
export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;
export type HoldSlotInput = z.infer<typeof holdSlotSchema>;
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
