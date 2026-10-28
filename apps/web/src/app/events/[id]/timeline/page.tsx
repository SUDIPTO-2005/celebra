'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PlusCircle, Clock, MapPin, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { tasksApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils';
import type { ScheduleItem } from '@/lib/api/types';

export default function EventTimelinePage() {
  const params = useParams();
  const eventId = params.id as string;
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog & form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState('');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loc, setLoc] = useState('');
  const [notes, setNotes] = useState('');

  const loadSchedule = useCallback(async () => {
    try {
      const data = await tasksApi.listSchedule(eventId);
      setItems(data);
    } catch (err) {
      toastError('Schedule failed to load', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, toastError]);

  useEffect(() => {
    if (eventId) loadSchedule();
  }, [eventId, loadSchedule]);

  const openAdd = () => {
    setEditingItem(null);
    setTitle('');
    setDesc('');
    setStart('');
    setEnd('');
    setLoc('');
    setNotes('');
    setConflictWarning('');
    setIsOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDesc(item.description);
    // Format to datetime-local friendly format (YYYY-MM-DDTHH:mm)
    setStart(item.start_time ? item.start_time.slice(0, 16) : '');
    setEnd(item.end_time ? item.end_time.slice(0, 16) : '');
    setLoc(item.location || '');
    setNotes(item.notes || '');
    setConflictWarning('');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) {
      toastError('Validation error', 'Title, start time, and end time are required.');
      return;
    }

    setSubmitting(true);
    setConflictWarning('');
    try {
      const payload: Partial<ScheduleItem> = {
        title,
        notes: [desc, loc, notes].filter(Boolean).join(' • ') || notes || '',
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
      };

      if (editingItem) {
        await tasksApi.updateScheduleItem(eventId, editingItem.id, payload);
        success('Schedule updated', 'Timeline item saved.');
      } else {
        await tasksApi.createScheduleItem(eventId, payload);
        success('Schedule item added', `${title} added to timeline.`);
      }

      setIsOpen(false);
      loadSchedule();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (err?.status === 409 || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('overlap')) {
        setConflictWarning('Notice: This time slot conflicts or overlaps with another scheduled item.');
      } else {
        toastError('Save failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Delete schedule item "${itemTitle}"?`)) return;
    try {
      await tasksApi.deleteScheduleItem(eventId, id);
      success('Item deleted', `${itemTitle} removed from timeline.`);
      loadSchedule();
    } catch (err) {
      toastError('Delete failed', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Day-of Timeline</h2>
          <p className="text-xs text-muted-foreground">Order of events, speeches, catering, and key milestones</p>
        </div>
        <Button variant="brand" size="sm" onClick={openAdd}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add Schedule Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="mt-2 text-sm font-semibold">No timeline items</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Map out arrival times, keynotes, toasts, dinner service, and departures.
              </p>
              <Button variant="brand" size="sm" className="mt-4" onClick={openAdd}>
                Add Item
              </Button>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-brand-200 space-y-6">
              {items.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Dot on the timeline */}
                  <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-600 bg-background" />

                  <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{item.title}</span>
                          {item.location && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-brand-600 font-medium mt-1">
                          {formatDateTime(item.start_time)} – {formatDateTime(item.end_time)}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">Note: {item.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => openEdit(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(item.id, item.title)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Timeline Item' : 'Add Timeline Item'}</DialogTitle>
            <DialogDescription>Schedule key events during the celebration</DialogDescription>
          </DialogHeader>

          {conflictWarning && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 text-yellow-800 text-xs border border-yellow-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Item Title" htmlFor="item_title" required>
              <Input
                id="item_title"
                placeholder="e.g., Welcome Cocktail & Speeches"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Time" htmlFor="item_start" required>
                <Input
                  id="item_start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="End Time" htmlFor="item_end" required>
                <Input
                  id="item_end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <FormField label="Location / Sub-venue" htmlFor="item_loc">
              <Input
                id="item_loc"
                placeholder="e.g., Terrace Lawn or Main Foyer"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              />
            </FormField>

            <FormField label="Description" htmlFor="item_desc">
              <Textarea
                id="item_desc"
                placeholder="Details for guests and staff..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </FormField>

            <FormField label="Private Notes" htmlFor="item_notes">
              <Input
                id="item_notes"
                placeholder="Staff notes, cues, vendor instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                {editingItem ? 'Save Changes' : 'Add to Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
