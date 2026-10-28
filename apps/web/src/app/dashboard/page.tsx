'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  PlusCircle,
  Sparkles,
  ChevronRight,
  AlertCircle,
  PartyPopper,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { eventsApi, notificationsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { extractResults, formatDate, formatCurrency, capitalize, STATUS_COLORS } from '@/lib/utils';
import type { Event, Notification } from '@/lib/api/types';

export default function PremiumDashboardPage() {
  const auth = useAuth();
  const user = auth.status === 'authenticated' ? auth.user : null;

  const [events, setEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '90days'>('all');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [eventsRes, notifRes, countRes] = await Promise.all([
          eventsApi.list('ordering=date&page_size=10'),
          notificationsApi.list('unread=true'),
          notificationsApi.unreadCount(),
        ]);

        const eventList = extractResults(eventsRes);
        setEvents(eventList);

        const notifList = extractResults(notifRes);
        setNotifications(notifList);

        setUnreadCount(countRes?.count ?? 0);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  // Aggregated real metrics
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const upcoming = events.filter((e) => e.status !== 'cancelled' && e.status !== 'completed' && e.start_date >= today);
    const totalGuests = events.reduce((sum, e) => sum + (e.guests_count || 0), 0);
    const confirmedGuests = events.reduce((sum, e) => sum + (e.attending_count || 0), 0);
    const pendingRsvps = events.reduce((sum, e) => sum + (e.pending_rsvp_count || 0), 0);

    const totalTasks = events.reduce((sum, e) => sum + (e.tasks_count || 0), 0);
    const completedTasks = events.reduce((sum, e) => sum + (e.completed_tasks_count || 0), 0);
    const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalBudget = events.reduce((sum, e) => sum + parseFloat(e.budget || '0'), 0);
    const actualSpent = events.reduce((sum, e) => sum + parseFloat(e.actual_spent || '0'), 0);

    // Primary next event countdown
    const nextEvent = upcoming[0] || null;
    let daysUntilNext = null;
    if (nextEvent) {
      const diffTime = new Date(nextEvent.start_date).getTime() - new Date().getTime();
      daysUntilNext = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      upcomingCount: upcoming.length,
      nextEvent,
      daysUntilNext,
      totalGuests,
      confirmedGuests,
      pendingRsvps,
      totalTasks,
      completedTasks,
      taskPercent,
      totalBudget,
      actualSpent,
    };
  }, [events]);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ── Welcome Banner / Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 p-6 sm:p-8 text-white shadow-card">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200 backdrop-blur-md">
                <PartyPopper className="h-3.5 w-3.5 text-champagne-300" />
                Celebration Headquarters
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.first_name || 'Organizer'}!
              </h1>
              <p className="text-sm text-brand-200 max-w-xl">
                {metrics.nextEvent ? (
                  <>
                    Your next major celebration is <strong className="text-white">{metrics.nextEvent.name}</strong>{' '}
                    in <span className="underline decoration-champagne-400 font-semibold">{metrics.daysUntilNext} days</span>.
                  </>
                ) : (
                  'You have no pending deadlines today. Ready to plan your next memorable celebration?'
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0" asChild>
                <Link href="/ai">
                  <Sparkles className="h-4 w-4 mr-1.5 text-champagne-300" />
                  AI Co-Planner
                </Link>
              </Button>
              <Button variant="brand" className="bg-champagne-500 hover:bg-champagne-600 text-brand-950 font-bold shadow-md" asChild>
                <Link href="/events/new">
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Create Event
                </Link>
              </Button>
            </div>
          </div>

          {/* Decorative glowing gradient sphere */}
          <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── High-Level Vital Stats ── */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="hover:shadow-card transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Celebrations</span>
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                  {metrics.upcomingCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Confirmed & planning stages</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Confirmed RSVPs</span>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                  {metrics.confirmedGuests}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.pendingRsvps} awaiting response
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Task Progress</span>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                  {metrics.taskPercent}%
                </div>
                <div className="mt-2">
                  <Progress value={metrics.taskPercent} className="h-1.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-card transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Budget Utilization</span>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
                  {formatCurrency(metrics.actualSpent.toString(), 'USD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Budget limit: {formatCurrency(metrics.totalBudget.toString(), 'USD')}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Events Roster (2 spans) */}
          <section className="lg:col-span-2 space-y-4" aria-label="Upcoming Events">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Upcoming Celebrations</h2>
                <p className="text-xs text-muted-foreground">Events scheduled on your calendar</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/events" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  View all ({events.length})
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <span className="text-4xl block mb-2">🎉</span>
                <h3 className="font-bold text-base">No upcoming celebrations yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Create your first celebration to manage guest lists, RSVPs, catering, and timelines.
                </p>
                <Button variant="brand" size="sm" className="mt-4" asChild>
                  <Link href="/events/new">Create First Event</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map((ev) => (
                  <Link key={ev.id} href={`/events/${ev.id}`}>
                    <Card className="hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-subtle transition-all cursor-pointer">
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[ev.status] || 'bg-muted'}>
                              {capitalize(ev.status)}
                            </Badge>
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                              {ev.event_type}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-foreground truncate">{ev.name}</h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(ev.start_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {ev.attending_count} / {ev.guests_count} attending
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 sm:text-right border-t sm:border-0 pt-2 sm:pt-0">
                          <div>
                            <div className="text-xs text-muted-foreground">Budget Spent</div>
                            <div className="text-sm font-bold font-mono text-foreground">
                              {formatCurrency(ev.actual_spent, ev.currency)}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Right Column: Alerts & AI Assistant Shortcut (1 span) */}
          <div className="space-y-6">
            {/* Notifications / Alerts Card */}
            <Card>
              <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Alerts</CardTitle>
                  <CardDescription className="text-xs">RSVP and task updates</CardDescription>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="default" className="text-xs bg-brand-600">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <span className="text-2xl block mb-1">🔔</span>
                    No pending unread notifications.
                  </div>
                ) : (
                  <ul className="divide-y text-xs" aria-label="Notifications list">
                    {notifications.slice(0, 4).map((n) => (
                      <li key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* AI Assistant Quick Callout */}
            <Card className="bg-gradient-to-br from-brand-50 to-champagne-50 dark:from-brand-950/20 dark:to-champagne-950/20 border-brand-200 dark:border-brand-800">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 font-bold text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Celebra AI Co-Planner</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Need inspiration for speeches, seating charts, budget splits, or day-of timelines?
                </p>
                <Button size="sm" variant="brand" className="w-full" asChild>
                  <Link href="/ai">Open AI Assistant</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
