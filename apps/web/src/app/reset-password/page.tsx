'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await authApi.passwordResetRequest({ email: data.email });
      setSubmitted(true);
    } catch (err) {
      // Use generic message to avoid user enumeration
      const msg = getErrorMessage(err);
      // Show generic regardless
      if (msg.includes('404') || msg.includes('not found')) {
        setSubmitted(true); // Don't reveal email existence
      } else {
        setServerError(msg);
      }
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm text-center rounded-xl border bg-card p-8 shadow-sm">
          <div className="text-3xl mb-3">📧</div>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for that email address, we&apos;ve sent password reset instructions.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          {serverError && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

            <Button type="submit" variant="brand" className="w-full" loading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
