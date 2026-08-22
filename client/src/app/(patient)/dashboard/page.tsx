'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function PatientDashboard() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/appointments/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      addToast('Appointment cancelled successfully', 'success');
    },
    onError: (error: any) => {
      addToast(error.response?.data?.error || 'Failed to cancel appointment', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full md:w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const appointments = data || [];
  const upcoming = appointments.filter((a: any) => a.status === 'CONFIRMED');
  const past = appointments.filter((a: any) => a.status === 'COMPLETED' || a.status === 'CANCELLED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage your appointments and health records.</p>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
          <Button asChild size="sm">
            <Link href="/doctors">Book New</Link>
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {upcoming.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No upcoming appointments.
            </div>
          ) : (
            upcoming.map((appt: any) => (
              <div key={appt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-slate-900 text-lg">
                      Dr. {appt.doctor.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {appt.doctor.specialisation}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {format(new Date(appt.date), 'EEEE, MMMM do, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {appt.startTime} - {appt.endTime}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this appointment?')) {
                        cancelMutation.mutate(appt.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">Past & Cancelled</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {past.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No past records found.
            </div>
          ) : (
            past.map((appt: any) => (
              <div key={appt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-slate-900">
                      Dr. {appt.doctor.name}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      appt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {format(new Date(appt.date), 'MMM do, yyyy')} at {appt.startTime}
                  </div>
                </div>
                {appt.status === 'COMPLETED' && appt.postVisitSummary && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/appointments/${appt.id}`}>View Summary</Link>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
