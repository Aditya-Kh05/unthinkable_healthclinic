'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export default function DoctorSearchPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [specialisation, setSpecialisation] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Phase 1: Search Doctors
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ['doctors', specialisation],
    queryFn: async () => {
      const res = await api.get('/doctors', { params: { specialisation } });
      return res.data.data;
    },
  });

  // Phase 2: Fetch Slots for Selected Doctor & Date
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slots', selectedDoctorId, dateStr],
    queryFn: async () => {
      const res = await api.get(`/doctors/${selectedDoctorId}/slots`, {
        params: { date: dateStr },
      });
      return res.data.data;
    },
    enabled: !!selectedDoctorId,
  });

  // Phase 3: Hold Slot
  const holdMutation = useMutation({
    mutationFn: async (startTime: string) => {
      const res = await api.post('/appointments/hold', {
        doctorId: selectedDoctorId,
        date: dateStr,
        startTime,
      });
      return res.data.data; // returns slotHold object
    },
    onSuccess: (holdData) => {
      addToast('Slot held for 5 minutes. Complete your booking!', 'success');
      router.push(`/book?holdId=${holdData.id}`);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to hold slot. It may already be taken.', 'error');
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a Doctor</h1>
        <p className="text-slate-500 mt-1">Search by specialisation and book your appointment.</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input 
              placeholder="e.g. Cardiology, Neurology..." 
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
            />
          </div>
          <Button>Search</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doctor List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-slate-900">Available Doctors</h2>
          {isSearching ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>)}
            </div>
          ) : searchData?.doctors?.length === 0 ? (
            <p className="text-sm text-slate-500">No doctors found.</p>
          ) : (
            <div className="space-y-3">
              {searchData?.doctors.map((doc: any) => (
                <div 
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedDoctorId === doc.id 
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' 
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <h3 className="font-semibold text-slate-900">{doc.name}</h3>
                  <p className="text-sm text-slate-500">{doc.specialisation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot Selection */}
        <div className="lg:col-span-2">
          {selectedDoctorId ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="font-semibold text-lg text-slate-900">Select an Appointment Time</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                    &larr; Prev
                  </Button>
                  <span className="text-sm font-medium w-32 text-center">
                    {format(selectedDate, 'MMM do, yyyy')}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                    Next &rarr;
                  </Button>
                </div>
              </div>

              {isLoadingSlots ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : slotsData?.slots?.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {slotsData.slots.map((slot: any) => (
                    <button
                      key={slot.startTime}
                      onClick={() => holdMutation.mutate(slot.startTime)}
                      disabled={holdMutation.isPending}
                      className="py-2.5 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors disabled:opacity-50"
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  No available slots for this date.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
              <p className="text-slate-500">Select a doctor to view their availability</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
