'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function AdminDashboard() {
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const res = await api.get('/admin/doctors');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">System overview and metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Doctors</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{isLoading ? '-' : doctors?.length}</p>
        </div>
        
        {/* Placeholder metric cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Appointments (Today)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Active Patients</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">148</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">System Health</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <p className="text-lg font-bold text-slate-900">Healthy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
