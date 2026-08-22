'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

export default function AppointmentDetailsPage() {
  const { id } = useParams();

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const res = await api.get(`/appointments/${id}`);
      return res.data.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading details...</div>;
  if (!appt) return <div className="p-8 text-center">Appointment not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Appointment Details</h1>
            <p className="text-blue-100 mt-1">Dr. {appt.doctor.user.name} • {appt.doctor.specialisation}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">{format(new Date(appt.date), 'MMM do, yyyy')}</div>
            <div className="text-blue-100">{appt.startTime} - {appt.endTime}</div>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Status</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {appt.status}
            </span>
          </div>

          {/* AI Pre-Visit Summary */}
          {appt.preVisitSummary && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Pre-Visit Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Chief Complaint</p>
                  <p className="font-medium text-slate-900">{appt.preVisitSummary.chiefComplaint}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Urgency</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                    appt.preVisitSummary.urgency === 'High' ? 'bg-red-100 text-red-700' :
                    appt.preVisitSummary.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {appt.preVisitSummary.urgency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Post-Visit Summary */}
          {appt.postVisitSummary && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Doctor's Notes (Patient Summary)</h3>
              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 prose prose-slate max-w-none text-sm">
                <div dangerouslySetInnerHTML={{ __html: appt.postVisitSummary.patientSummary.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {appt.prescriptions && appt.prescriptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Prescriptions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {appt.prescriptions.map((p: any) => (
                  <div key={p.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex items-start gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{p.medicationName}</p>
                      <p className="text-sm text-slate-600">{p.dosage} • {p.frequency}</p>
                      <p className="text-xs text-slate-400 mt-1">Duration: {p.durationDays} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
