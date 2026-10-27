'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

const schema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        password_confirm: data.confirm_password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      await refreshUser();
      router.replace('/dashboard');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">🎉</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start planning memorable events</p>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          {serverError && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First name" htmlFor="first_name" required error={errors.first_name?.message}>
                <Input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  error={errors.first_name?.message}
                  {...register('first_name')}
                />
              </FormField>
              <FormField label="Last name" htmlFor="last_name" required error={errors.last_name?.message}>
                <Input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  error={errors.last_name?.message}
                  {...register('last_name')}
                />
              </FormField>
            </div>

            <FormField label="Email address" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              hint="Min. 8 characters, one uppercase, one number"
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
            </FormField>

            <FormField label="Confirm password" htmlFor="confirm_password" required error={errors.confirm_password?.message}>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />
            </FormField>

            <Button type="submit" variant="brand" className="w-full" loading={isSubmitting}>
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
