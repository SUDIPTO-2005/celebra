import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastContainer } from '@/components/ui/use-toast';

export const metadata: Metadata = {
  title: 'Celebra - Event Planning Platform',
  description: 'Plan memorable events with ease. Manage guests, budgets, tasks, and vendors in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ToastContainer>
            {children}
          </ToastContainer>
        </AuthProvider>
      </body>
    </html>
  );
}
