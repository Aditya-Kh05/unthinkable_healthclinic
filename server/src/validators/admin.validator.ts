import { z } from 'zod';

export const createDoctorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  specialisation: z.string().min(1, 'Specialisation is required'),
  slotDurationMin: z.number().int().min(10).max(60).default(30),
});

export const updateDoctorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  specialisation: z.string().min(1).optional(),
  slotDurationMin: z.number().int().min(10).max(60).optional(),
  isActive: z.boolean().optional(),
});

export const doctorScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    })
  ).min(1, 'At least one schedule entry is required'),
});

export const doctorLeaveSchema = z.object({
  leaveDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  reason: z.string().optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorScheduleInput = z.infer<typeof doctorScheduleSchema>;
export type DoctorLeaveInput = z.infer<typeof doctorLeaveSchema>;
