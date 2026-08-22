'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorSchedulePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: async () => {
      const res = await api.get('/doctor/schedule');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">Your working hours and upcoming leaves.</p>
      </div>

      {/* Schedule Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Specialisation</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">{data?.specialisation || '—'}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Slot Duration</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">{data?.slotDurationMin || 30} minutes</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Upcoming Leaves</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">{data?.upcomingLeaves?.length || 0}</p>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/50">
          <h2 className="text-lg font-semibold text-indigo-900">Working Hours</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.schedules?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No schedule set yet. Contact your admin to set your working hours.
            </div>
          ) : (
            data?.schedules?.map((s: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {DAY_NAMES[s.dayOfWeek]?.slice(0, 2)}
                  </span>
                  <span className="font-medium text-slate-900">{DAY_NAMES[s.dayOfWeek]}</span>
                </div>
                <div className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-slate-100 font-medium">{s.startTime}</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-3 py-1 rounded-md bg-slate-100 font-medium">{s.endTime}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Leaves */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-amber-900">Upcoming Leaves</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.upcomingLeaves?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No upcoming leaves scheduled.
            </div>
          ) : (
            data?.upcomingLeaves?.map((leave: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span className="font-medium text-slate-900">
                    {new Date(leave.leaveDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {leave.reason && (
                  <span className="text-sm text-slate-500">{leave.reason}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
