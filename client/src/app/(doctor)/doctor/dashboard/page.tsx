'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format, isToday } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function DoctorDashboard() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const res = await api.get('/doctor/appointments');
      return res.data.data;
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
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col justify-center">
                <Skeleton className="h-10 w-full sm:w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const appts = appointments || [];
  const todayAppts = appts.filter((a: any) => isToday(new Date(a.date)));
  const upcomingAppts = appts.filter((a: any) => !isToday(new Date(a.date)) && a.status === 'CONFIRMED');

  const renderAppointment = (appt: any) => (
    <div key={appt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-semibold text-slate-900 text-lg">
            {appt.patient.name}
          </span>
          {appt.preVisitSummary?.urgency === 'High' && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              High Urgency
            </span>
          )}
          {appt.status === 'COMPLETED' && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Completed
            </span>
          )}
        </div>
        <div className="text-sm text-slate-600 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {appt.startTime} - {appt.endTime}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {format(new Date(appt.date), 'MMM do, yyyy')}
          </span>
        </div>
        {appt.preVisitSummary && appt.status !== 'COMPLETED' && (
          <p className="mt-2 text-sm text-slate-500 truncate max-w-xl">
            <strong>Complaint:</strong> {appt.preVisitSummary.chiefComplaint}
          </p>
        )}
      </div>
      <div>
        <Button asChild variant={appt.status === 'COMPLETED' ? 'outline' : 'default'} className={appt.status !== 'COMPLETED' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
          <Link href={`/doctor/appointments/${appt.id}`}>
            {appt.status === 'COMPLETED' ? 'View Record' : 'Consultation'}
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, Doctor</h1>
        <p className="text-slate-500 mt-1">Here is your schedule overview.</p>
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/50">
          <h2 className="text-lg font-semibold text-indigo-900">Today's Appointments</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {todayAppts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No appointments scheduled for today.
            </div>
          ) : (
            todayAppts.map(renderAppointment)
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {upcomingAppts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No upcoming appointments.
            </div>
          ) : (
            upcomingAppts.map(renderAppointment)
          )}
        </div>
      </div>
    </div>
  );
}
