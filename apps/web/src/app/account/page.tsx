'use client';

import { useState } from 'react';
import { User, Shield, KeyRound, Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';

export default function AccountPage() {
  const auth = useAuth();
  const { success, error: toastError } = useToast();

  const user = auth.status === 'authenticated' ? auth.user : null;

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password reset request
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      await auth.refreshUser();
      success('Profile updated', 'Your personal details have been saved.');
    } catch (err) {
      toastError('Update failed', getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await authApi.passwordResetRequest({ email: user.email });
      setResetSent(true);
      success('Reset email sent', 'Check your inbox for password reset instructions.');
    } catch (err) {
      toastError('Request failed', getErrorMessage(err));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal profile and security credentials
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-brand-600" />
              <CardTitle className="text-lg">Personal Profile</CardTitle>
            </div>
            <CardDescription>
              Your name as it appears to guests, co-hosts, and vendors
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name" htmlFor="profile_first" required>
                  <Input
                    id="profile_first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Last Name" htmlFor="profile_last" required>
                  <Input
                    id="profile_last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              <FormField
                label="Email Address"
                htmlFor="profile_email"
                hint="Your registered primary email (read-only for security)"
              >
                <Input
                  id="profile_email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </FormField>
            </CardContent>

            <CardFooter className="border-t pt-4 flex justify-end">
              <Button variant="brand" type="submit" loading={savingProfile}>
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security & Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-brand-600" />
              <CardTitle className="text-lg">Password & Security</CardTitle>
            </div>
            <CardDescription>
              We protect accounts with PBKDF2 password hashing, secure session rotation, and CSRF authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              To update your credentials securely without exposing sensitive tokens, we initiate a cryptographic password reset workflow to your email.
            </p>

            {resetSent ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg text-xs font-medium border border-green-200">
                <Check className="h-4 w-4" />
                Password reset link dispatched. Please check your inbox.
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                loading={sendingReset}
                onClick={handleRequestPasswordReset}
              >
                Send Password Reset Email
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
