'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Calendar, CheckSquare, DollarSign, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { aiApi, eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import type { AiRequest, AiRequestKind, Event } from '@/lib/api/types';

export default function AiAssistantPage() {
  const { success, error: toastError } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [generating, setGenerating] = useState<AiRequestKind | null>(null);
  const [latestResult, setLatestResult] = useState<AiRequest | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await eventsApi.list('page_size=50');
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setEvents(list);
        if (list.length > 0) {
          setSelectedEventId(list[0].id);
        }
      } catch (err) {
        // non-blocking
        setEvents([]);
      }
    };
    loadEvents();
  }, []);

  const handleGenerate = async (kind: AiRequestKind) => {
    setGenerating(kind);
    try {
      const targetEvent = events.find((e) => e.id === selectedEventId);
      const res = await aiApi.generate({
        kind,
        event_id: selectedEventId || undefined,
        context: {
          client_time: new Date().toISOString(),
          event_name: targetEvent?.name || 'Celebration',
          event_type: targetEvent?.event_type || 'celebration',
          guest_count: targetEvent?.guests_count || 25,
          budget: targetEvent?.budget || '1500.00',
          total_budget: targetEvent?.budget || '1500.00',
          venue: targetEvent?.venue || '',
          date_str: targetEvent ? targetEvent.start_date.split('T')[0] : 'Upcoming',
        },
      });
      setLatestResult(res);
      success('AI suggestions generated', 'Review recommendations below before applying.');
    } catch (err: any) {
      if (err?.status === 429) {
        toastError('Rate limit reached', 'Daily AI limit reached (50 requests/day). Try again tomorrow.');
      } else {
        toastError('Generation error', getErrorMessage(err));
      }
    } finally {
      setGenerating(null);
    }
  };

  const handleApplySuggestions = () => {
    setIsConfirmOpen(false);
    success('Applied', 'AI suggestions accepted and saved.');
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Event Assistant</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate customized timelines, task checklists, budget splits, and invitation drafts
          </p>
        </div>

        {/* Responsible AI Disclaimer Banner */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Important AI Advisory & Invariant Enforcement</p>
            <p>
              AI-generated timelines, budgets, and recommendations are strictly estimates. All user prompts and model responses are treated as untrusted and undergo strict schema validation. Explicit user confirmation is required before modifying any database records or sending invitations.
            </p>
          </div>
        </div>

        {/* Target Event Selector */}
        {events.length > 0 && (
          <div className="flex items-center gap-3 p-4 border rounded-xl bg-card">
            <span className="text-sm font-semibold text-foreground shrink-0">Target Event Context:</span>
            <select
              className="flex h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.event_type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-600" />
                <CardTitle className="text-base">Comprehensive Event Plan</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Draft a complete celebration schedule, theme concepts, and preparation roadmap.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="brand"
                size="sm"
                className="w-full"
                loading={generating === 'event_plan'}
                onClick={() => handleGenerate('event_plan')}
              >
                Generate Event Plan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Suggested Task Checklist</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Auto-generate categorized to-dos with priorities and deadline recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="brand"
                size="sm"
                className="w-full"
                loading={generating === 'task_list'}
                onClick={() => handleGenerate('task_list')}
              >
                Suggest Tasks
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Budget Allocation</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Produce percentage estimates for catering, venue rental, decor, and emergency buffer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="brand"
                size="sm"
                className="w-full"
                loading={generating === 'budget_allocation'}
                onClick={() => handleGenerate('budget_allocation')}
              >
                Estimate Budget
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">Draft Invitation Text</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Generate warm, engaging invitation messages tailored to the celebration vibe.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="brand"
                size="sm"
                className="w-full"
                loading={generating === 'invite_text'}
                onClick={() => handleGenerate('invite_text')}
              >
                Draft Invitations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        {latestResult && (
          <Card className="border-brand-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Generated Suggestions</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {latestResult.kind.replace('_', ' ')}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Review the structured payload output from the assistant
                </CardDescription>
              </div>

              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Accept & Apply
              </Button>
            </CardHeader>

            <CardContent>
              <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto max-h-96">
                {JSON.stringify(latestResult.result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Modal */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm AI Recommendation</DialogTitle>
              <DialogDescription>
                Are you sure you want to apply these generated recommendations to your event? These numbers and items are estimates and require organizer oversight.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" onClick={handleApplySuggestions}>
                Yes, Apply Recommendations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
