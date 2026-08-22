'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);
  const { addToast } = useToast();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      // Add patient role by default for public registration
      const res = await api.post('/auth/register', { ...data, role: 'PATIENT' });
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.accessToken);
      addToast('Account created successfully!', 'success');
      router.push('/dashboard');
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.error || 'Failed to register');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Create an account</h2>
        <p className="text-sm text-slate-500">Start booking your appointments.</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <Input
            {...register('name')}
            placeholder="John Doe"
            error={errors.name?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input
            {...register('email')}
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Phone (Optional)</label>
          <Input
            {...register('phone')}
            type="tel"
            placeholder="+1234567890"
            error={errors.phone?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <Input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
