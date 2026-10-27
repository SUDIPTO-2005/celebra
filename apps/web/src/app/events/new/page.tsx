'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { eventsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';
import type { EventType } from '@/lib/api/types';

// Event templates
const EVENT_TEMPLATES = [
  {
    type: 'birthday' as EventType,
    name: 'Birthday Party',
    icon: '🎂',
    description: 'Casual or formal celebrations with friends & family',
    defaultBudget: '1500',
  },
  {
    type: 'wedding' as EventType,
    name: 'Wedding & Reception',
    icon: '💍',
    description: 'Ceremony, banquet, catering, entertainment & photo shoots',
    defaultBudget: '15000',
  },
  {
    type: 'corporate' as EventType,
    name: 'Corporate Summit',
    icon: '💼',
    description: 'Keynotes, networking, company retreats & awards ceremonies',
    defaultBudget: '8000',
  },
  {
    type: 'anniversary' as EventType,
    name: 'Anniversary Milestone',
    icon: '🥂',
    description: 'Romantic dinner, gathering, speeches & toasts',
    defaultBudget: '3000',
  },
  {
    type: 'party' as EventType,
    name: 'Social Celebration',
    icon: '🎉',
    description: 'Dinner parties, holiday bashes, reunions & soirees',
    defaultBudget: '2000',
  },
  {
    type: 'other' as EventType,
    name: 'Custom Celebration',
    icon: '✨',
    description: 'Tailored event with custom specifications',
    defaultBudget: '2500',
  },
];

const STEPS = [
  { id: 1, label: 'Template & Basics' },
  { id: 2, label: 'Date & Location' },
  { id: 3, label: 'Budget & Currencies' },
  { id: 4, label: 'Review & Launch' },
];

export default function EventCreationWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState<EventType>('party');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [budgetLimit, setBudgetLimit] = useState('2000');

  // Inline Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTemplateSelect = (tmpl: typeof EVENT_TEMPLATES[0]) => {
    setSelectedTemplate(tmpl.type);
    if (!budgetLimit || budgetLimit === '2000') {
      setBudgetLimit(tmpl.defaultBudget);
    }
  };

  const validateStep = (step: number) => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!title.trim() || title.trim().length < 2) {
        errs.title = 'Event title must be at least 2 characters.';
      }
    }
    if (step === 2) {
      if (!date) {
        errs.date = 'Event date is required.';
      }
    }
    if (step === 3) {
      if (budgetLimit && (isNaN(parseFloat(budgetLimit)) || parseFloat(budgetLimit) < 0)) {
        errs.budgetLimit = 'Budget limit must be a positive number.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreate = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setSubmitting(true);
    setServerError('');
    try {
      // Build ISO datetimes from date + time fields
      const startDatetime = startTime ? `${date}T${startTime}:00` : `${date}T00:00:00`;
      const endDatetime = endTime ? `${date}T${endTime}:00` : `${date}T23:59:00`;

      const created = await eventsApi.create({
        name: title,               // backend uses "name"
        event_type: selectedTemplate,
        description: description || undefined,
        start_date: startDatetime, // backend uses "start_date" ISO datetime
        end_date: endDatetime,     // backend uses "end_date" ISO datetime
        venue: venue || undefined,
        timezone,
        currency,
        budget: budgetLimit || undefined, // backend uses "budget"
      });

      router.push(`/events/${created.id}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link
            href="/events"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Cancel and return
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Celebration</h1>
          <p className="text-xs text-muted-foreground">Follow our guided 4-step wizard to initialize your event.</p>
        </div>

        {/* ── Wizard Progress Bar ── */}
        <div className="flex items-center justify-between border-b pb-4 overflow-x-auto">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 shrink-0">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === s.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : currentStep > s.id
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > s.id ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span
                className={`text-xs font-semibold ${
                  currentStep === s.id ? 'text-brand-600' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && <span className="h-px w-6 sm:w-12 bg-border mx-2" />}
            </div>
          ))}
        </div>

        {serverError && (
          <div role="alert" className="p-4 rounded-xl bg-destructive/10 text-destructive text-xs">
            {serverError}
          </div>
        )}

        {/* ── Step 1: Template & Basics ── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold">1. Select Celebration Type</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick a template to pre-fill helpful recommendations:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {EVENT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.type}
                    type="button"
                    onClick={() => handleTemplateSelect(tmpl)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedTemplate === tmpl.type
                        ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 shadow-xs ring-1 ring-brand-600'
                        : 'border-border hover:border-brand-300 hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{tmpl.icon}</span>
                    <p className="font-semibold text-xs text-foreground">{tmpl.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <Card className="p-6 space-y-4">
              <FormField label="Celebration Title" htmlFor="title" required error={errors.title}>
                <Input
                  id="title"
                  placeholder="e.g., Anya's 30th Birthday Bash"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={errors.title}
                />
              </FormField>

              <FormField label="Event Description & Theme" htmlFor="desc">
                <Textarea
                  id="desc"
                  placeholder="Share details, dress codes, or party concepts..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>
            </Card>
          </div>
        )}

        {/* ── Step 2: Date & Location ── */}
        {currentStep === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold">2. Date, Time & Venue</h2>

            <FormField label="Celebration Date" htmlFor="event_date" required error={errors.date}>
              <Input
                id="event_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={errors.date}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Start Time" htmlFor="start_time">
                <Input
                  id="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </FormField>
              <FormField label="End Time" htmlFor="end_time">
                <Input
                  id="end_time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Venue Name & Address" htmlFor="venue">
              <Input
                id="venue"
                placeholder="e.g., Grand Palace Hotel, Main Ballroom"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </FormField>

            <FormField label="Timezone" htmlFor="tz">
              <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </FormField>
          </Card>
        )}

        {/* ── Step 3: Budget & Financials ── */}
        {currentStep === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold">3. Financial Targets</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Budget Limit" htmlFor="budget" error={errors.budgetLimit}>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  error={errors.budgetLimit}
                />
              </FormField>

              <FormField label="Primary Currency" htmlFor="curr">
                <Input id="curr" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </FormField>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
              💡 Fixed-precision Decimal arithmetic will track all vendor quotes, actual invoices, and category breakdowns.
            </p>
          </Card>
        )}

        {/* ── Step 4: Review & Launch ── */}
        {currentStep === 4 && (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-brand-600" />
                Review Event Specifications
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Confirm details before publishing your workspace:</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border text-xs">
              <div>
                <span className="text-muted-foreground block font-semibold">Title</span>
                <span className="text-foreground font-bold">{title}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Type</span>
                <span className="text-foreground capitalize">{selectedTemplate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Date</span>
                <span className="text-foreground">{date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold">Budget Limit</span>
                <span className="text-foreground font-bold">{formatCurrency(budgetLimit, currency)}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Venue: {venue || 'Not specified'}</p>
              <p>• Timezone: {timezone}</p>
              <p>• Initial Status: <strong>Draft</strong> (Ready for planning transitions)</p>
            </div>
          </Card>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <Button variant="outline" size="sm" onClick={handleBack} disabled={submitting}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button variant="brand" size="sm" onClick={handleNext}>
              Continue
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button variant="brand" size="sm" loading={submitting} onClick={handleCreate}>
              Launch Celebration
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
