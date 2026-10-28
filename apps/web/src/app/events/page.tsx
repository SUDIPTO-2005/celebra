'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Calendar, Users, DollarSign } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { extractResults, formatDate, formatCurrency, capitalize, STATUS_COLORS } from '@/lib/utils';
import type { Event, EventStatus } from '@/lib/api/types';

type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.list(`page=${page}&ordering=-start_date`);
      const list = extractResults(res);
      setEvents(list);
      setTotalCount(res?.count ?? list.length);
    } catch (err) {
      setError(getErrorMessage(err));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    const today = new Date().toISOString().split('T')[0];
    const term = searchTerm.toLowerCase().trim();
    return events.filter((ev) => {
      const matchesSearch =
        !term ||
        ev.name.toLowerCase().includes(term) ||
        Boolean(ev.venue?.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      if (activeTab === 'all') return true;
      if (activeTab === 'cancelled') return ev.status === 'cancelled';
      if (activeTab === 'upcoming') {
        return ev.status !== 'cancelled' && ev.start_date >= today;
      }
      if (activeTab === 'past') {
        return ev.start_date < today || ev.status === 'completed';
      }
      return true;
    });
  }, [events, searchTerm, activeTab]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your celebrations, guest lists, and budgets
            </p>
          </div>
          <Button variant="brand" asChild>
            <Link href="/events/new">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              New Event
            </Link>
          </Button>
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 border-b pb-2 sm:border-0 sm:pb-0 overflow-x-auto">
            {(['all', 'upcoming', 'past', 'cancelled'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search events..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed p-8 bg-card">
            <p className="text-4xl">🎉</p>
            <h3 className="mt-3 text-lg font-semibold">No events found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Create your first event to get started.'}
            </p>
            {!searchTerm && (
              <div className="mt-4">
                <Button variant="brand" size="sm" asChild>
                  <Link href="/events/new">Create Event</Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const budgetLimit = event.budget ? parseFloat(event.budget) : 0;
              const budgetActual = parseFloat(event.actual_spent || '0');
              const budgetPercent = budgetLimit > 0 ? Math.min((budgetActual / budgetLimit) * 100, 100) : 0;

              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2">
                        <Badge className={STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}>
                          {capitalize(event.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatDate(event.start_date)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-brand-600 line-clamp-1">
                        {event.name}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {event.description || event.venue || 'No details provided.'}
                      </p>

                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{event.guests_count} guests ({event.attending_count} confirmed)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{event.completed_tasks_count}/{event.tasks_count} tasks</span>
                        </div>
                      </div>

                      {budgetLimit > 0 && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Budget</span>
                            <span>{formatCurrency(event.actual_spent, event.currency)} / {formatCurrency(event.budget, event.currency)}</span>
                          </div>
                          <Progress value={budgetPercent} className="h-1.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {totalCount > 20 && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
