'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  DollarSign,
  CheckSquare,
  Clock,
  Store,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, capitalize, STATUS_COLORS } from '@/lib/utils';
import type { Event } from '@/lib/api/types';

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const data = await eventsApi.get(eventId);
        setEvent(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const navItems = [
    { label: 'Overview', href: `/events/${eventId}`, icon: Calendar, exact: true },
    { label: 'Guests', href: `/events/${eventId}/guests`, icon: Users },
    { label: 'Budget', href: `/events/${eventId}/budget`, icon: DollarSign },
    { label: 'Tasks', href: `/events/${eventId}/tasks`, icon: CheckSquare },
    { label: 'Timeline', href: `/events/${eventId}/timeline`, icon: Clock },
    { label: 'Vendors', href: `/events/${eventId}/vendors`, icon: Store },
    { label: 'Team', href: `/events/${eventId}/team`, icon: Shield },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-72" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
          <Skeleton className="h-96 w-full mt-6" />
        </div>
      </AppLayout>
    );
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-destructive font-semibold">Error loading event</p>
          <p className="text-sm text-muted-foreground mt-1">{error || 'Event not found'}</p>
          <Link href="/events" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Return to Events
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link
            href="/events"
            className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Events
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{event.name}</h1>
              <Badge className={STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}>
                {capitalize(event.status)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(event.start_date)} · {event.venue || 'No venue'}
            </div>
          </div>
        </div>

        <nav className="flex space-x-1 border-b overflow-x-auto pb-1" aria-label="Event tabs">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap border-b-2 -mb-1 ${
                  active
                    ? 'border-brand-600 text-brand-600 font-semibold bg-brand-50/50'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div>{children}</div>
      </div>
    </AppLayout>
  );
}
