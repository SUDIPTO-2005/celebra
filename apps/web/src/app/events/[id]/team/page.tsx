'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, UserPlus, Trash2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/use-toast';
import { eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { getInitials, formatDate, capitalize } from '@/lib/utils';
import type { EventMember } from '@/lib/api/types';

export default function EventTeamPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { success, error: toastError } = useToast();

  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Member Dialog
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'cohost'>('cohost');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = async () => {
    try {
      const data = await eventsApi.members(eventId);
      setMembers(data);
    } catch (err) {
      toastError('Failed to load team', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadMembers();
  }, [eventId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await eventsApi.addMember(eventId, { email, role });
      success('Co-host added', `${email} can now co-manage this event.`);
      setIsOpen(false);
      setEmail('');
      loadMembers();
    } catch (err) {
      toastError('Add co-host failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Revoke co-host access for ${name}?`)) return;
    try {
      await eventsApi.removeMember(eventId, memberId);
      success('Member removed', 'Co-host access revoked.');
      loadMembers();
    } catch (err) {
      toastError('Remove failed', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Co-hosts & Collaborators</h2>
          <p className="text-xs text-muted-foreground">
            Allow others to view and manage RSVPs, tasks, budget items, and schedules
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={() => setIsOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add Co-host
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="mt-2 text-sm font-semibold">No additional team members</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You are currently the sole organizer of this celebration.
              </p>
              <Button variant="brand" size="sm" className="mt-4" onClick={() => setIsOpen(true)}>
                Add Co-host
              </Button>
            </div>
          ) : (
            <ul className="divide-y" aria-label="Event members">
              {members.map((m) => {
                const userName = (m as any).user?.full_name || m.user_full_name || (m as any).user?.email || m.user_email || 'Member';
                const userEmail = (m as any).user?.email || m.user_email || '';
                const joinedDate = (m as any).created_at || m.joined_at;

                return (
                  <li key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                        {getInitials(userName)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {userName}
                          </span>
                          <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
                            {capitalize(m.role)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {userEmail} {joinedDate ? `· Joined ${formatDate(joinedDate)}` : ''}
                        </div>
                      </div>
                    </div>

                    {m.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive text-xs"
                        onClick={() => handleRemoveMember(m.id, userName)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event Co-host</DialogTitle>
            <DialogDescription>
              Enter the email of a registered Celebra user to grant them co-host access
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4">
            <FormField label="User Email" htmlFor="member_email" required>
              <Input
                id="member_email"
                type="email"
                placeholder="cohost@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                Grant Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
