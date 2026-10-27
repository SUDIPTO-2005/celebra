'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Calendar,
  Clock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { eventsApi } from '@/lib/api/endpoints';
import { formatDate, formatDateTime, STATUS_COLORS, capitalize } from '@/lib/utils';
import type { Event } from '@/lib/api/types';

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await eventsApi.list('page_size=50');
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setEvents(list);
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const monthYearStr = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Generate Month Grid (days)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Blank padding before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter((e) => e.start_date.startsWith(dateStr));
      days.push({ dayNumber: d, dateStr, dayEvents });
    }
    return days;
  }, [currentDate, events]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Celebration Calendar</h1>
            <p className="text-xs text-muted-foreground">
              Overview of scheduled celebrations, timeline milestones, and commitments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-card p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'month'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Month Grid
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'agenda'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Agenda List
              </button>
            </div>
          </div>
        </div>

        {/* Month Navigation Banner */}
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between border-b">
            <h2 className="text-base font-bold text-foreground">{monthYearStr}</h2>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : viewMode === 'month' ? (
              <div>
                {/* Day Header Row */}
                <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 divide-x divide-y border-b">
                  {calendarDays.map((item, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                        item ? 'hover:bg-muted/20 bg-card' : 'bg-muted/10'
                      }`}
                    >
                      {item ? (
                        <>
                          <div className="flex justify-between items-center text-xs font-bold text-foreground">
                            <span>{item.dayNumber}</span>
                          </div>
                          <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                            {item.dayEvents.map((ev) => (
                              <Link
                                key={ev.id}
                                href={`/events/${ev.id}`}
                                className="block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 truncate hover:ring-1 hover:ring-brand-500"
                              >
                                {ev.name}
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Agenda Mode */
              <div className="divide-y p-2" aria-label="Agenda event list">
                {events.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No celebrations found.</p>
                ) : (
                  events.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[ev.status] || 'bg-muted'}>
                            {capitalize(ev.status)}
                          </Badge>
                          <span className="text-sm font-bold text-foreground">{ev.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(ev.start_date)} · {ev.venue || 'No venue assigned'}
                        </p>
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        <span>{ev.guests_count} guests</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
