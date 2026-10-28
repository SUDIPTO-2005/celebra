'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Store, PlusCircle, Calendar, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { vendorsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDateTime, formatDate, STATUS_COLORS, capitalize } from '@/lib/utils';
import type { Vendor, QuoteRequest, Booking } from '@/lib/api/types';

export default function EventVendorsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { success, error: toastError } = useToast();

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote Dialog
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteVendorId, setQuoteVendorId] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteEventDate, setQuoteEventDate] = useState('');
  const [quoteGuests, setQuoteGuests] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // Booking Dialog
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookVendorId, setBookVendorId] = useState('');
  const [bookStart, setBookStart] = useState('');
  const [bookEnd, setBookEnd] = useState('');
  const [bookAmount, setBookAmount] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [qRes, bRes, vRes] = await Promise.all([
        vendorsApi.listQuotes(eventId),
        vendorsApi.listBookings(eventId),
        vendorsApi.list('page_size=50'),
      ]);
      setQuotes(Array.isArray(qRes) ? qRes : (qRes as any)?.results ?? []);
      setBookings(Array.isArray(bRes) ? bRes : (bRes as any)?.results ?? []);
      setVendors(Array.isArray(vRes) ? vRes : (vRes as any)?.results ?? []);
    } catch (err) {
      toastError('Vendor data failed to load', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, toastError]);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId, loadData]);

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteVendorId) {
      toastError('Validation error', 'Please select a vendor.');
      return;
    }

    setQuoteSubmitting(true);
    try {
      await vendorsApi.createQuote(eventId, {
        vendor_id: quoteVendorId,
        details: [
          quoteMessage,
          quoteEventDate ? `Target Date: ${quoteEventDate}` : '',
          quoteGuests ? `Guests: ${quoteGuests}` : '',
        ].filter(Boolean).join('\n') || 'Quote inquiry',
      } as any);
      success('Quote requested', 'Your request has been logged.');
      setIsQuoteOpen(false);
      setQuoteVendorId('');
      setQuoteMessage('');
      setQuoteEventDate('');
      setQuoteGuests('');
      loadData();
    } catch (err) {
      toastError('Quote request failed', getErrorMessage(err));
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookVendorId || !bookStart || !bookEnd) {
      toastError('Validation error', 'Vendor, start, and end time are required.');
      return;
    }

    setBookSubmitting(true);
    try {
      await vendorsApi.createBooking(eventId, {
        vendor_id: bookVendorId,
        start_time: new Date(bookStart).toISOString(),
        end_time: new Date(bookEnd).toISOString(),
        amount: bookAmount || '0.00',
      } as any);
      success('Booking created', 'Vendor booking logged.');
      setIsBookingOpen(false);
      setBookVendorId('');
      setBookStart('');
      setBookEnd('');
      setBookAmount('');
      setBookNotes('');
      loadData();
    } catch (err) {
      toastError('Booking creation failed', getErrorMessage(err));
    } finally {
      setBookSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string, name: string) => {
    if (!confirm(`Cancel booking with ${name}? This releases the slot immediately.`)) return;
    try {
      await vendorsApi.cancelBooking(eventId, id);
      success('Booking cancelled', 'The slot has been released.');
      loadData();
    } catch (err) {
      toastError('Cancellation failed', getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bookings Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Confirmed Bookings</h2>
            <p className="text-xs text-muted-foreground">
              Direct vendor commitments. Conflict prevention ensures no overlapping active bookings for the same vendor.
            </p>
          </div>
          <Button variant="brand" size="sm" onClick={() => setIsBookingOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Add Booking
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="mt-2 text-sm font-semibold">No bookings yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Once quotes are approved, record confirmed vendor contracts and dates here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" aria-label="Event bookings">
                  <thead className="bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Schedule Slot</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {(b as any).vendor?.name || b.vendor_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime((b as any).start_time || b.start_datetime)} - {formatDateTime((b as any).end_time || b.end_datetime)}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {b.amount ? formatCurrency(b.amount) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>
                            {capitalize(b.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {b.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive h-7 text-xs"
                              onClick={() => handleCancelBooking(b.id, (b as any).vendor?.name || b.vendor_name)}
                            >
                              Release Slot
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quote Requests Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Quote Requests</h2>
            <p className="text-xs text-muted-foreground">
              Inquiries sent to vendors for availability, estimates, and proposals
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsQuoteOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Request Quote
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <h3 className="mt-2 text-sm font-semibold">No quote requests</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Send inquiries to caterers, venues, photographers, and entertainment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" aria-label="Event quote requests">
                  <thead className="bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Event Date & Guests</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Quoted Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {quotes.map((q) => (
                      <tr key={q.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{(q as any).vendor?.name || q.vendor_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {q.event_date ? formatDate(q.event_date) : 'Flexible'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {(q as any).details || q.message || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {q.quoted_amount ? formatCurrency(q.quoted_amount) : 'Pending'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[q.status] || 'bg-gray-100'}>
                            {capitalize(q.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quote Dialog */}
      <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Vendor Quote</DialogTitle>
            <DialogDescription>Inquire with a vendor from our directory</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestQuote} className="space-y-4">
            <FormField label="Select Vendor" htmlFor="quote_vendor" required>
              <select
                id="quote_vendor"
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
                value={quoteVendorId}
                onChange={(e) => setQuoteVendorId(e.target.value)}
                required
              >
                <option value="">-- Choose a vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({capitalize(v.category)})
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Target Event Date" htmlFor="quote_date">
                <Input
                  id="quote_date"
                  type="date"
                  value={quoteEventDate}
                  onChange={(e) => setQuoteEventDate(e.target.value)}
                />
              </FormField>

              <FormField label="Estimated Guests" htmlFor="quote_guests">
                <Input
                  id="quote_guests"
                  type="number"
                  placeholder="e.g., 80"
                  value={quoteGuests}
                  onChange={(e) => setQuoteGuests(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Inquiry Message" htmlFor="quote_msg">
              <Textarea
                id="quote_msg"
                placeholder="Mention specific requirements, package inquiries, or dietary styles..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsQuoteOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={quoteSubmitting}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Vendor Booking</DialogTitle>
            <DialogDescription>Reserve a time slot with atomic conflict prevention</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBooking} className="space-y-4">
            <FormField label="Select Vendor" htmlFor="book_vendor" required>
              <select
                id="book_vendor"
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
                value={bookVendorId}
                onChange={(e) => setBookVendorId(e.target.value)}
                required
              >
                <option value="">-- Choose a vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date & Time" htmlFor="book_start" required>
                <Input
                  id="book_start"
                  type="datetime-local"
                  value={bookStart}
                  onChange={(e) => setBookStart(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="End Date & Time" htmlFor="book_end" required>
                <Input
                  id="book_end"
                  type="datetime-local"
                  value={bookEnd}
                  onChange={(e) => setBookEnd(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Contract Amount" htmlFor="book_amount">
              <Input
                id="book_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bookAmount}
                onChange={(e) => setBookAmount(e.target.value)}
              />
            </FormField>

            <FormField label="Booking Notes" htmlFor="book_notes">
              <Input
                id="book_notes"
                placeholder="Setup instructions, contract numbers..."
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsBookingOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={bookSubmitting}>
                Confirm Booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
