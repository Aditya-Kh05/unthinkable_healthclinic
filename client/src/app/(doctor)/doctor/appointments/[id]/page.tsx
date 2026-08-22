'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const prescriptionSchema = z.object({
  medicationName: z.string().min(1, 'Required'),
  dosage: z.string().min(1, 'Required'),
  frequency: z.string().min(1, 'Required'),
  durationDays: z.coerce.number().min(1),
});

const postVisitSchema = z.object({
  clinicalNotes: z.string().min(10, 'Please provide detailed clinical notes'),
  prescriptions: z.array(prescriptionSchema).optional(),
});

type PostVisitFormValues = z.infer<typeof postVisitSchema>;

export default function ConsultationPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: appt, isLoading } = useQuery({
    queryKey: ['doctor-appointment', id],
    queryFn: async () => {
      // First get basic details
      const res = await api.get('/doctor/appointments');
      const appointment = res.data.data.find((a: any) => a.id === id);
      
      // If not completed, get pre-visit summary
      if (appointment?.status === 'CONFIRMED') {
        const summaryRes = await api.get(`/doctor/appointments/${id}/summary`);
        return { ...appointment, preVisitFull: summaryRes.data.data.preVisitSummary };
      }
      return appointment;
    },
  });

  const { register, control, handleSubmit, formState: { errors } } = useForm<PostVisitFormValues>({
    resolver: zodResolver(postVisitSchema),
    defaultValues: {
      prescriptions: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescriptions",
  });

  const completeMutation = useMutation({
    mutationFn: async (data: PostVisitFormValues) => {
      await api.post(`/doctor/appointments/${id}/complete`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      addToast('Consultation completed successfully!', 'success');
      router.push('/doctor/dashboard');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to complete appointment', 'error');
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!appt) return <div className="p-8 text-center">Appointment not found.</div>;

  const isCompleted = appt.status === 'COMPLETED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{appt.patient.name}</h1>
            <p className="text-slate-500 mt-1">{appt.startTime} - {appt.endTime}</p>
          </div>
          {isCompleted && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Completed
            </span>
          )}
        </div>

        <div className="p-6 space-y-8">
          {/* Pre-Visit AI Summary */}
          {(appt.preVisitFull || appt.preVisitSummary) && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                AI Pre-Visit Summary
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-indigo-800">Patient Symptoms (Raw)</p>
                  <p className="text-sm text-slate-700 mt-1 bg-white p-3 rounded-lg border border-indigo-50">
                    {appt.preVisitFull?.symptomsRaw || appt.preVisitSummary?.symptomsRaw}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-indigo-50">
                    <p className="text-xs font-medium text-indigo-800 mb-1">Chief Complaint</p>
                    <p className="text-sm font-medium text-slate-900">
                      {appt.preVisitFull?.chiefComplaint || appt.preVisitSummary?.chiefComplaint}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-50">
                    <p className="text-xs font-medium text-indigo-800 mb-1">Urgency</p>
                    <p className="text-sm font-medium text-slate-900">
                      {appt.preVisitFull?.urgency || appt.preVisitSummary?.urgency}
                    </p>
                  </div>
                </div>

                {/* Suggested Questions */}
                {appt.preVisitFull?.suggestedQuestions && (
                  <div>
                    <p className="text-sm font-medium text-indigo-800 mb-2">Suggested Questions for Patient</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                      {appt.preVisitFull.suggestedQuestions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Form */}
          {!isCompleted ? (
            <form onSubmit={handleSubmit((data) => completeMutation.mutate(data))} className="space-y-6 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-slate-900">Consultation Notes</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Clinical Notes</label>
                <textarea
                  {...register('clinicalNotes')}
                  className="w-full h-32 rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
                  placeholder="Enter detailed clinical notes from the consultation..."
                ></textarea>
                {errors.clinicalNotes && <p className="text-sm text-red-500">{errors.clinicalNotes.message}</p>}
                <p className="text-xs text-slate-500">These notes will be processed by AI to generate a patient-friendly summary.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-slate-900">Prescriptions</h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ medicationName: '', dosage: '', frequency: '', durationDays: 1 })}>
                    + Add Medication
                  </Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-3 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <label className="text-xs text-slate-500">Medication</label>
                      <Input {...register(`prescriptions.${index}.medicationName`)} placeholder="Name" />
                      {errors.prescriptions?.[index]?.medicationName && <p className="text-xs text-red-500">{errors.prescriptions[index].medicationName.message}</p>}
                    </div>
                    <div className="col-span-12 sm:col-span-3 space-y-1">
                      <label className="text-xs text-slate-500">Dosage</label>
                      <Input {...register(`prescriptions.${index}.dosage`)} placeholder="500mg" />
                    </div>
                    <div className="col-span-12 sm:col-span-3 space-y-1">
                      <label className="text-xs text-slate-500">Frequency</label>
                      <Input {...register(`prescriptions.${index}.frequency`)} placeholder="Twice a day" />
                    </div>
                    <div className="col-span-12 sm:col-span-2 space-y-1 relative">
                      <label className="text-xs text-slate-500">Days</label>
                      <div className="flex gap-2 items-center">
                        <Input type="number" {...register(`prescriptions.${index}.durationDays`)} min="1" />
                        <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" disabled={completeMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                  {completeMutation.isPending ? 'Processing...' : 'Complete Consultation'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 border-t border-slate-200 pt-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Clinical Notes</h3>
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700">
                  {appt.postVisitSummary?.clinicalNotes || 'No notes available'}
                </div>
              </div>
              
              {appt.prescriptions?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Prescriptions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {appt.prescriptions.map((p: any) => (
                      <div key={p.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                        <p className="font-semibold text-slate-900">{p.medicationName}</p>
                        <p className="text-sm text-slate-600">{p.dosage} • {p.frequency}</p>
                        <p className="text-xs text-slate-400 mt-1">Duration: {p.durationDays} days</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
