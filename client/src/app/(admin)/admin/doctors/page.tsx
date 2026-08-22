'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

// ── Schemas ──────────────────────────────────────────

const createDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  specialisation: z.string().min(1, 'Specialisation is required'),
  slotDurationMin: z.coerce.number().int().min(10).max(60),
});

const updateDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  specialisation: z.string().min(1, 'Specialisation is required'),
  slotDurationMin: z.coerce.number().int().min(10).max(60),
  isActive: z.boolean().optional(),
});

const scheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM format'),
});

const leaveSchema = z.object({
  leaveDate: z.string().min(1, 'Date is required'),
  reason: z.string().optional(),
});

type CreateDoctorForm = z.infer<typeof createDoctorSchema>;
type UpdateDoctorForm = z.infer<typeof updateDoctorSchema>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Main Page ────────────────────────────────────────

export default function AdminDoctorsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editDoctor, setEditDoctor] = useState<any | null>(null);
  const [scheduleDoctor, setScheduleDoctor] = useState<any | null>(null);
  const [leaveDoctor, setLeaveDoctor] = useState<any | null>(null);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const res = await api.get('/admin/doctors');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/doctors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      addToast('Doctor removed successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to delete doctor', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Doctors</h1>
          <p className="text-slate-500 mt-1">Add, update, or remove doctors from the system.</p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 text-white"
          onClick={() => setShowCreateModal(true)}
        >
          + Add Doctor
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-12 w-1/4" />
              </div>
            ))}
          </div>
        ) : doctors?.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No doctors added yet.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Specialisation</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Slot (min)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors?.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{doc.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      {doc.specialisation}
                    </span>
                  </td>
                  <td className="px-6 py-4">{doc.email}</td>
                  <td className="px-6 py-4">{doc.slotDurationMin || 30} min</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 font-medium ${doc.isActive !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${doc.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {doc.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setEditDoctor(doc)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => setScheduleDoctor(doc)}>Schedule</Button>
                      <Button variant="outline" size="sm" onClick={() => setLeaveDoctor(doc)}>Leave</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Dr. ${doc.name}?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {showCreateModal && (
        <CreateDoctorModal onClose={() => setShowCreateModal(false)} />
      )}
      {editDoctor && (
        <EditDoctorModal doctor={editDoctor} onClose={() => setEditDoctor(null)} />
      )}
      {scheduleDoctor && (
        <ScheduleModal doctor={scheduleDoctor} onClose={() => setScheduleDoctor(null)} />
      )}
      {leaveDoctor && (
        <LeaveModal doctor={leaveDoctor} onClose={() => setLeaveDoctor(null)} />
      )}
    </div>
  );
}

// ── Modal Backdrop ───────────────────────────────────

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Create Doctor Modal ──────────────────────────────

function CreateDoctorModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateDoctorForm>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { slotDurationMin: 30 },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateDoctorForm) => {
      await api.post('/admin/doctors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      addToast('Doctor created successfully', 'success');
      onClose();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to create doctor', 'error');
    },
  });

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Add New Doctor</h2>
        <p className="text-sm text-slate-500 mt-1">Create a new doctor profile with login credentials.</p>
      </div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <Input {...register('name')} placeholder="Dr. John Smith" error={errors.name?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input {...register('email')} type="email" placeholder="john@clinic.com" error={errors.email?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <Input {...register('password')} type="password" placeholder="••••••" error={errors.password?.message} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Phone (Optional)</label>
          <Input {...register('phone')} placeholder="+91 98765 43210" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Specialisation</label>
            <Input {...register('specialisation')} placeholder="Cardiology" error={errors.specialisation?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Slot Duration (min)</label>
            <Input {...register('slotDurationMin')} type="number" min={10} max={60} error={errors.slotDurationMin?.message} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-slate-900 hover:bg-slate-800 text-white">
            {mutation.isPending ? 'Creating...' : 'Create Doctor'}
          </Button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ── Edit Doctor Modal ────────────────────────────────

function EditDoctorModal({ doctor, onClose }: { doctor: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateDoctorForm>({
    resolver: zodResolver(updateDoctorSchema),
    defaultValues: {
      name: doctor.name,
      phone: doctor.phone || '',
      specialisation: doctor.specialisation,
      slotDurationMin: doctor.slotDurationMin || 30,
      isActive: doctor.isActive !== false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateDoctorForm) => {
      await api.put(`/admin/doctors/${doctor.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      addToast('Doctor updated successfully', 'success');
      onClose();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to update doctor', 'error');
    },
  });

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Edit Doctor</h2>
        <p className="text-sm text-slate-500 mt-1">Update Dr. {doctor.name}&apos;s profile.</p>
      </div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <Input {...register('name')} error={errors.name?.message} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <Input {...register('phone')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Specialisation</label>
            <Input {...register('specialisation')} error={errors.specialisation?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Slot Duration (min)</label>
            <Input {...register('slotDurationMin')} type="number" min={10} max={60} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <input type="checkbox" id="isActive" {...register('isActive')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-slate-900 hover:bg-slate-800 text-white">
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ── Schedule Modal ───────────────────────────────────

function ScheduleModal({ doctor, onClose }: { doctor: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>(
    doctor.schedules || []
  );

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/doctors/${doctor.id}/schedule`, { schedules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      addToast('Schedule updated successfully', 'success');
      onClose();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to update schedule', 'error');
    },
  });

  const addScheduleEntry = () => {
    setSchedules((prev) => [...prev, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }]);
  };

  const removeScheduleEntry = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Manage Schedule</h2>
        <p className="text-sm text-slate-500 mt-1">Set working hours for Dr. {doctor.name}.</p>
      </div>
      <div className="p-6 space-y-4">
        {/* Existing schedule entries */}
        {schedules.length > 0 && (
          <div className="space-y-2">
            {schedules.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 text-sm">
                <span className="font-medium text-slate-900">{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="text-slate-600">{s.startTime} – {s.endTime}</span>
                <button
                  type="button"
                  onClick={() => removeScheduleEntry(i)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new entry */}
        <div className="border border-dashed border-slate-300 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Add working day</p>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="rounded-md border border-slate-200 text-sm p-2"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="rounded-md border border-slate-200 text-sm p-2"
            />
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="rounded-md border border-slate-200 text-sm p-2"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addScheduleEntry}>
            + Add Day
          </Button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || schedules.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {mutation.isPending ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ── Leave Modal ──────────────────────────────────────

function LeaveModal({ doctor, onClose }: { doctor: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(leaveSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post(`/admin/doctors/${doctor.id}/leave`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      addToast('Leave marked. Affected appointments will be cancelled.', 'success');
      onClose();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to mark leave', 'error');
    },
  });

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Mark Leave</h2>
        <p className="text-sm text-slate-500 mt-1">Mark a leave day for Dr. {doctor.name}. All appointments on this date will be auto-cancelled.</p>
      </div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
        <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
          ⚠️ All existing appointments on this date will be <strong>cancelled</strong> and patients will be notified via email.
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Leave Date</label>
          <Input {...register('leaveDate')} type="date" error={errors.leaveDate?.message as string} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Reason (Optional)</label>
          <Input {...register('reason')} placeholder="e.g. Personal leave" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {mutation.isPending ? 'Marking...' : 'Mark Leave'}
          </Button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
