'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckSquare,
  Clock,
  AlertCircle,
  UserCheck,
  UserPlus,
  FileText,
  Store,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { notificationsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils';
import type { Notification, NotificationKind } from '@/lib/api/types';

export default function NotificationsPage() {
  const { success, error: toastError } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.list(filter === 'unread' ? 'unread=true' : '');
      const list = Array.isArray(res) ? res : (res?.results ?? []);
      setNotifications(list);
    } catch (err) {
      toastError('Failed to load notifications', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      toastError('Error', getErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await notificationsApi.markAllRead();
      success('Updated', 'All notifications marked as read.');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      toastError('Error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (kind: NotificationKind) => {
    switch (kind) {
      case 'task_assigned':
        return <CheckSquare className="h-4 w-4 text-brand-600" />;
      case 'task_due_soon':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'task_overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'event_reminder':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'rsvp_received':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'invite_accepted':
        return <UserPlus className="h-4 w-4 text-blue-600" />;
      case 'quote_received':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'booking_confirmed':
        return <Store className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stay updated on guest RSVPs, task assignments, and schedule alerts
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            loading={actionLoading}
            onClick={handleMarkAllRead}
            disabled={notifications.every((n) => n.is_read)}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'unread'
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            Unread
          </button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="mt-2 text-sm font-semibold">No notifications</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You are all caught up! Important event updates will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y" aria-label="Notifications list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`flex items-start gap-3 p-4 transition-colors cursor-pointer ${
                      n.is_read ? 'hover:bg-muted/20 opacity-80' : 'bg-brand-50/20 hover:bg-brand-50/40'
                    }`}
                  >
                    <div className="mt-0.5 p-2 rounded-full bg-background border shrink-0">
                      {getNotificationIcon(n.kind)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{n.title}</h4>
                        <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>

                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0 mt-2" aria-label="Unread" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
