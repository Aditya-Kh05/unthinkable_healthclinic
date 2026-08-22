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

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((state) => state.setAuth);
  const { addToast } = useToast();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const res = await api.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      setAuth(data.data.user, data.data.accessToken);
      addToast('Welcome back!', 'success');
      const role = data.data.user.role;
      if (role === 'PATIENT') router.push('/dashboard');
      else if (role === 'DOCTOR') router.push('/doctor/dashboard');
      else if (role === 'ADMIN') router.push('/admin/dashboard');
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.error || 'Failed to login');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
        <p className="text-sm text-slate-500">Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

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
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
