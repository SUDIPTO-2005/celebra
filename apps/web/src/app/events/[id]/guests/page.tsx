'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  UserPlus,
  Upload,
  Link as LinkIcon,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
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
import { guestsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { STATUS_COLORS, capitalize } from '@/lib/utils';
import type { Guest, GuestSummary, InviteToken } from '@/lib/api/types';

export default function EventGuestsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { toast, success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<GuestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<InviteToken | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPlusOne, setFormPlusOne] = useState(0);
  const [formDietary, setFormDietary] = useState('');
  const [formAccess, setFormAccess] = useState('');

  const loadData = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        guestsApi.list(eventId, `page=${page}&search=${encodeURIComponent(searchTerm)}`),
        guestsApi.summary(eventId),
      ]);
      const guestList = Array.isArray(gRes) ? gRes : (gRes?.results ?? []);
      setGuests(guestList);
      setTotalCount(gRes?.count ?? guestList.length);
      setSummary(sRes);
    } catch (err) {
      toastError('Failed to load guests', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId, page, searchTerm]);

  const resetForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormPlusOne(0);
    setFormDietary('');
    setFormAccess('');
    setEditingGuest(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    const nameParts = (guest.name || guest.full_name || '').split(' ');
    setFormFirstName(guest.first_name || nameParts[0] || '');
    setFormLastName(guest.last_name || nameParts.slice(1).join(' ') || '');
    setFormEmail(guest.email || '');
    setFormPhone(guest.phone || '');
    setFormPlusOne(guest.plus_one_count ?? guest.plus_ones ?? 0);
    setFormDietary(guest.dietary_requirements || '');
    setFormAccess(guest.accessibility_requirements || '');
    setIsAddOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim()) {
      toastError('Validation error', 'First and last name are required');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: `${formFirstName.trim()} ${formLastName.trim()}`.trim(),
      first_name: formFirstName.trim(),
      last_name: formLastName.trim(),
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      plus_ones: Number(formPlusOne) || 0,
      plus_one_count: Number(formPlusOne) || 0,
      dietary_requirements: formDietary.trim(),
      accessibility_requirements: formAccess.trim(),
    };

    try {
      if (editingGuest) {
        await guestsApi.update(eventId, editingGuest.id, payload);
        success('Guest updated', `${formFirstName} ${formLastName} updated successfully.`);
      } else {
        await guestsApi.create(eventId, payload);
        success('Guest added', `${formFirstName} added to guest list.`);
      }
      setIsAddOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toastError('Save failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGuest = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this event?`)) return;
    try {
      await guestsApi.delete(eventId, id);
      success('Guest removed', `${name} has been removed.`);
      loadData();
    } catch (err) {
      toastError('Delete failed', getErrorMessage(err));
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await guestsApi.importCsv(eventId, file);
      if (res.errors && res.errors.length > 0) {
        toastError(
          'Import partial',
          `Imported ${res.imported} guests, but ${res.errors.length} rows had errors.`
        );
      } else {
        success('Import successful', `Successfully imported ${res.imported} guests.`);
      }
      loadData();
    } catch (err) {
      toastError('Import failed', getErrorMessage(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateInviteLink = async (guestId?: string) => {
    try {
      let targetId = guestId || guests[0]?.id;
      if (!targetId) {
        // Auto-provision a placeholder guest so create link works on first click
        const newGuest = await guestsApi.create(eventId, {
          first_name: 'Celebration',
          last_name: 'Guest',
          email: 'guest@invite.link',
          plus_one_count: 1,
        });
        targetId = newGuest.id;
        loadData();
      }
      const token = await guestsApi.createInviteToken(eventId, targetId);
      setGeneratedToken(token);
      setIsInviteLinkOpen(true);
    } catch (err) {
      toastError('Failed to generate invite link', getErrorMessage(err));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied', 'Invite link copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      {/* RSVP Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Invited</span>
            <span className="text-2xl font-bold">{summary.total}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between border-green-200 bg-green-50/30">
            <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
            </span>
            <span className="text-2xl font-bold text-green-800">{summary.confirmed}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between border-red-200 bg-red-50/30">
            <span className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Declined
            </span>
            <span className="text-2xl font-bold text-red-800">{summary.declined}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between border-yellow-200 bg-yellow-50/30">
            <span className="text-xs font-semibold text-yellow-700 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" /> Maybe
            </span>
            <span className="text-2xl font-bold text-yellow-800">{summary.maybe}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-between border-gray-200 bg-gray-50/50">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Pending
            </span>
            <span className="text-2xl font-bold text-muted-foreground">{summary.pending}</span>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests by name or email..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleCsvUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleCreateInviteLink()}>
            <LinkIcon className="h-4 w-4 mr-1.5" />
            Invite Link
          </Button>

          <Button variant="brand" size="sm" onClick={openAddModal}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Guest
          </Button>
        </div>
      </div>

      {/* Guest Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : guests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl">👥</p>
              <h3 className="mt-2 text-base font-semibold">No guests found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm ? 'No guests matched your search filter.' : 'Add your first guest to get started.'}
              </p>
              {!searchTerm && (
                <Button variant="brand" size="sm" className="mt-4" onClick={openAddModal}>
                  Add Guest
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" aria-label="Event guest list">
                <thead className="bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Guest Name</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">RSVP Status</th>
                    <th className="px-4 py-3">+1s</th>
                    <th className="px-4 py-3">Dietary & Needs</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {g.full_name || g.name || `${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Guest'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{g.email || '—'}</div>
                        <div>{g.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[g.rsvp_status] || 'bg-gray-100 text-gray-700'}>
                          {capitalize(g.rsvp_status || 'pending')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{g.plus_one_count ?? g.plus_ones ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {g.dietary_requirements || g.accessibility_requirements ? (
                          <span>
                            {g.dietary_requirements && `Diet: ${g.dietary_requirements}`}
                            {g.dietary_requirements && g.accessibility_requirements && ' · '}
                            {g.accessibility_requirements && `Needs: ${g.accessibility_requirements}`}
                          </span>
                        ) : (
                          'None'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-brand-600 hover:text-brand-700"
                            title="Generate RSVP Link"
                            onClick={() => handleCreateInviteLink(g.id)}
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => openEditModal(g)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteGuest(g.id, g.full_name || g.name || 'Guest')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGuest ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
            <DialogDescription>
              {editingGuest ? 'Update guest contact and requirements.' : 'Add a new guest to this event.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGuest} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" htmlFor="guest_first" required>
                <Input
                  id="guest_first"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Last Name" htmlFor="guest_last" required>
                <Input
                  id="guest_last"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email" htmlFor="guest_email">
                <Input
                  id="guest_email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </FormField>
              <FormField label="Phone" htmlFor="guest_phone">
                <Input
                  id="guest_phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Plus Ones Allowed" htmlFor="guest_plus_one">
              <Input
                id="guest_plus_one"
                type="number"
                min={0}
                value={formPlusOne}
                onChange={(e) => setFormPlusOne(parseInt(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Dietary Requirements" htmlFor="guest_dietary">
              <Input
                id="guest_dietary"
                placeholder="Vegetarian, Halal, Nut allergy, etc."
                value={formDietary}
                onChange={(e) => setFormDietary(e.target.value)}
              />
            </FormField>

            <FormField label="Accessibility Requirements" htmlFor="guest_access">
              <Input
                id="guest_access"
                placeholder="Wheelchair access, quiet room, etc."
                value={formAccess}
                onChange={(e) => setFormAccess(e.target.value)}
              />
            </FormField>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                {editingGuest ? 'Save Changes' : 'Add Guest'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={isInviteLinkOpen} onOpenChange={setIsInviteLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shareable Invite Link</DialogTitle>
            <DialogDescription>
              Guests can use this link to view event information and submit their RSVP response directly.
            </DialogDescription>
          </DialogHeader>

          {generatedToken && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/rsvp?token=${generatedToken.token}` : ''}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/rsvp?token=${generatedToken.token}`
                    )
                  }
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tokens use 128-bit entropy. Only the SHA-256 hash is stored on the server for your security.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="brand" onClick={() => setIsInviteLinkOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
