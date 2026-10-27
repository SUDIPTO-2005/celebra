'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace('/dashboard');
    } else if (auth.status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [auth.status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="text-4xl">🎉</div>
        <Skeleton className="mx-auto h-6 w-32" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
    </div>
  );
}
