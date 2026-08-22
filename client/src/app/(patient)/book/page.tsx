'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const bookSchema = z.object({
  symptoms: z.string().min(10, 'Please describe your symptoms in detail (min 10 characters)'),
});

type BookFormValues = z.infer<typeof bookSchema>;

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const holdId = searchParams.get('holdId');
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: BookFormValues) => {
      const res = await api.post('/appointments', {
        slotHoldId: holdId,
        symptoms: data.symptoms,
      });
      return res.data;
    },
    onSuccess: () => {
      addToast('Appointment booked successfully!', 'success');
      router.push('/dashboard');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to book appointment', 'error');
    },
  });

  if (!holdId) {
    return <div className="text-center p-8 text-slate-500">No slot held. Please go back and select a slot.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Complete Your Booking</h1>
        <p className="text-slate-500 mt-1">Please describe your symptoms so the doctor can prepare for your visit.</p>
        <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Your slot is held for <strong>5 minutes</strong>. If you don't complete this form in time, the slot will be released.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Symptoms</label>
          <textarea
            {...register('symptoms')}
            className="w-full h-32 rounded-lg border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
            placeholder="Describe what you are experiencing, how long it has been going on, etc."
          ></textarea>
          {errors.symptoms && (
            <p className="text-sm text-red-500">{errors.symptoms.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Confirming...' : 'Confirm Appointment'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BookingForm />
    </Suspense>
  );
}
