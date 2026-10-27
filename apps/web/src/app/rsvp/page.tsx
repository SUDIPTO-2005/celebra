'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Check, X, HelpCircle, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { guestsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import type { RsvpStatus } from '@/lib/api/types';

function RsvpContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventInfo, setEventInfo] = useState<any>(null);

  // Form states
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('yes');
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing or invalid invitation token in URL.');
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const info = await guestsApi.publicInviteInfo(token);
        setEventInfo(info);
      } catch (err: any) {
        if (err?.status === 404) {
          setError('This invite link is invalid or has expired.');
        } else if (err?.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else {
          setError(getErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      await guestsApi.publicRsvp(token, {
        rsvp_status: rsvpStatus,
        plus_one_count: rsvpStatus === 'yes' ? Number(plusOneCount) : 0,
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md p-6 space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md p-6 text-center shadow-lg">
        <div className="text-4xl mb-3">⚠️</div>
        <CardTitle className="text-lg">Invitation Link Error</CardTitle>
        <p className="text-sm text-destructive mt-2">{error}</p>
        <p className="text-xs text-muted-foreground mt-4">
          Please contact the celebration organizer for an updated invitation link.
        </p>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md p-8 text-center shadow-lg border-green-200 bg-green-50/20">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
        <CardTitle className="text-xl mt-3 text-green-900">RSVP Confirmed!</CardTitle>
        <CardDescription className="mt-1">
          Thank you for letting us know! Your response has been securely recorded.
        </CardDescription>
        <div className="mt-4 p-3 bg-background rounded-lg border text-xs text-muted-foreground">
          Event: <strong className="text-foreground">{eventInfo?.event_name || eventInfo?.event_title}</strong>
          <br />
          Response: <strong className="capitalize text-brand-600">{rsvpStatus}</strong>
          {rsvpStatus === 'yes' && plusOneCount > 0 && ` (+${plusOneCount} guests)`}
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl border bg-card">
      <CardHeader className="text-center pb-2">
        <span className="text-3xl mb-1 block">✉️</span>
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
          You&apos;re Invited!
        </CardTitle>
        <p className="text-base font-semibold text-brand-700 mt-1">
          {eventInfo?.event_name || eventInfo?.event_title}
        </p>
        {(eventInfo?.event_start_date || eventInfo?.event_date) && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(eventInfo.event_start_date || eventInfo.event_date)}</span>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 pt-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Will you be attending?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRsvpStatus('yes')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all ${
                  rsvpStatus === 'yes'
                    ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-600'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Check className="h-5 w-5 mb-1 text-green-600" />
                Yes
              </button>

              <button
                type="button"
                onClick={() => setRsvpStatus('maybe')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all ${
                  rsvpStatus === 'maybe'
                    ? 'border-yellow-600 bg-yellow-50 text-yellow-800 ring-2 ring-yellow-600'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <HelpCircle className="h-5 w-5 mb-1 text-yellow-600" />
                Maybe
              </button>

              <button
                type="button"
                onClick={() => setRsvpStatus('no')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all ${
                  rsvpStatus === 'no'
                    ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <X className="h-5 w-5 mb-1 text-red-600" />
                No
              </button>
            </div>
          </div>

          {rsvpStatus === 'yes' && (
            <FormField
              label="Additional Guests / Plus-Ones"
              htmlFor="plus_ones"
              hint="Number of extra guests attending with you"
            >
              <Input
                id="plus_ones"
                type="number"
                min={0}
                max={10}
                value={plusOneCount}
                onChange={(e) => setPlusOneCount(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </FormField>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <Button variant="brand" type="submit" className="w-full" loading={submitting}>
            Submit RSVP
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function PublicRsvpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-brand-50/50 to-background">
      <Suspense fallback={<Skeleton className="h-64 w-80 rounded-xl" />}>
        <RsvpContent />
      </Suspense>
    </div>
  );
}
