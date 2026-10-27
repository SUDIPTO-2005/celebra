'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from './app-shell';
import { Skeleton } from '@/components/ui/skeleton';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [auth.status, router]);

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm p-6 space-y-4">
          <div className="flex justify-center mb-4 text-3xl">🎉</div>
          <Skeleton className="h-6 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-64 mx-auto rounded-lg" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (auth.status === 'unauthenticated') {
    return null; // redirecting
  }

  return <AppShell>{children}</AppShell>;
}
