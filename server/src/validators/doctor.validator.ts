import { z } from 'zod';

export const postVisitNotesSchema = z.object({
  clinicalNotes: z.string().min(1, 'Clinical notes are required').max(5000),
  prescriptions: z.array(
    z.object({
      medicationName: z.string().min(1, 'Medication name is required'),
      dosage: z.string().min(1, 'Dosage is required'),
      frequency: z.string().min(1, 'Frequency is required'),
      durationDays: z.number().int().min(1, 'Duration must be at least 1 day'),
    })
  ).optional().default([]),
  followUpDate: z.string().optional(),
});

export type PostVisitNotesInput = z.infer<typeof postVisitNotesSchema>;
