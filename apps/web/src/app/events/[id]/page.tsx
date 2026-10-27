'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  DollarSign,
  CheckSquare,
  Clock,
  Copy,
  Trash2,
  XCircle,
  PlayCircle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Event } from '@/lib/api/types';

export default function EventOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast, success, error: toastError } = useToast();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = async () => {
    try {
      const data = await eventsApi.get(eventId);
      setEvent(data);
    } catch (err) {
      toastError('Failed to load event', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId]);

  const handleTransition = async (nextStatus: string) => {
    setActionLoading(true);
    try {
      const updated = await eventsApi.transition(eventId, nextStatus);
      setEvent(updated);
      success('Status updated', `Event marked as ${nextStatus}.`);
    } catch (err) {
      toastError('Status update failed', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setActionLoading(true);
    try {
      const dup = await eventsApi.duplicate(eventId);
      success('Event duplicated', 'Redirecting to new event copy...');
      router.push(`/events/${dup.id}`);
    } catch (err) {
      toastError('Duplicate failed', getErrorMessage(err));
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this event?')) return;
    setActionLoading(true);
    try {
      const cancelled = await eventsApi.cancel(eventId);
      setEvent(cancelled);
      success('Event cancelled', 'Event status has been set to cancelled.');
    } catch (err) {
      toastError('Cancellation failed', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this event? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await eventsApi.delete(eventId);
      success('Event deleted', 'Returning to your event list.');
      router.push('/events');
    } catch (err) {
      toastError('Deletion failed', getErrorMessage(err));
      setActionLoading(false);
    }
  };

  if (loading || !event) return null;

  const budgetLimit = event.budget ? parseFloat(event.budget) : 0;
  const budgetActual = parseFloat(event.actual_spent || '0');
  const budgetPercent = budgetLimit > 0 ? Math.min((budgetActual / budgetLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          {event.status === 'draft' && (
            <Button
              variant="brand"
              size="sm"
              loading={actionLoading}
              onClick={() => handleTransition('planning')}
            >
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Start Planning
            </Button>
          )}
          {event.status === 'planning' && (
            <Button
              variant="brand"
              size="sm"
              loading={actionLoading}
              onClick={() => handleTransition('confirmed')}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Confirm Event
            </Button>
          )}
          {event.status === 'confirmed' && (
            <Button
              variant="brand"
              size="sm"
              loading={actionLoading}
              onClick={() => handleTransition('completed')}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Mark Completed
            </Button>
          )}
          {event.status !== 'cancelled' && event.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              loading={actionLoading}
              onClick={handleCancel}
            >
              <XCircle className="h-4 w-4 mr-1.5 text-muted-foreground" />
              Cancel Event
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" loading={actionLoading} onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-1.5" />
            Duplicate
          </Button>
          {event.user_role === 'owner' && (
            <Button
              variant="destructive"
              size="sm"
              loading={actionLoading}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Guest RSVPs</span>
              <Users className="h-4 w-4 text-brand-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {event.attending_count} / {event.guests_count}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">
              {event.pending_rsvp_count} pending response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Budget Spent</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(event.actual_spent, event.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Limit: {formatCurrency(event.budget, event.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Tasks Complete</span>
              <CheckSquare className="h-4 w-4 text-orange-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {event.completed_tasks_count} / {event.tasks_count}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Progress
              value={event.tasks_count > 0 ? (event.completed_tasks_count / event.tasks_count) * 100 : 0}
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Team Members</span>
              <Users className="h-4 w-4 text-purple-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {event.user_role}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Co-hosts and organizers</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Details & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Event Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </h4>
              <p className="mt-1 text-sm text-foreground">
                {event.description || 'No description added for this event.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-sm">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Venue & Location
                </span>
                <span className="text-foreground">{event.venue || 'No venue assigned'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Timezone
                </span>
                <span className="text-foreground">{event.timezone}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Start & End
                </span>
                <span className="text-foreground">
                  {formatDate(event.start_date)} → {formatDate(event.end_date)}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Currency
                </span>
                <span className="text-foreground">{event.currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget Breakdown</CardTitle>
            <CardDescription>Estimated vs actual spending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Actual Spent</span>
                <span className="font-semibold">{formatCurrency(event.actual_spent, event.currency)}</span>
              </div>
              <Progress value={budgetPercent} className="h-2" />
            </div>

            <div className="pt-2 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget Limit:</span>
                <span>{formatCurrency(event.budget, event.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={parseFloat(event.budget || '0') - parseFloat(event.actual_spent || '0') < 0 ? 'text-destructive' : 'text-green-600'}>
                  {formatCurrency(String(parseFloat(event.budget || '0') - parseFloat(event.actual_spent || '0')), event.currency)}
                </span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link href={`/events/${eventId}/budget`}>Manage Budget</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
