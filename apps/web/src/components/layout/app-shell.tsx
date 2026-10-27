'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  DollarSign,
  CheckSquare,
  Store,
  Sparkles,
  Bell,
  Settings,
  PlusCircle,
  Search,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

const sidebarNavItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/events', label: 'My Events', icon: Calendar },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/ai', label: 'AI Planner', icon: Sparkles },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/account', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const user = auth.status === 'authenticated' ? auth.user : null;

  useEffect(() => {
    // Check local or system dark mode
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
    }
  }, []);

  const toggleDarkMode = () => {
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.toggle('dark');
      setDarkMode(isDark);
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchOpen(false);
    router.push(`/events?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      {/* ── Left Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card shrink-0 select-none shadow-subtle">
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-6 border-b gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-lg shadow-sm text-white">
              🎉
            </span>
            <div>
              <span className="text-lg font-black tracking-tight text-foreground">Celebra</span>
              <span className="block text-[10px] font-semibold text-brand-600 uppercase tracking-widest -mt-1">
                Studio
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <Button
            variant="brand"
            className="w-full justify-start gap-2 shadow-sm"
            onClick={() => setQuickCreateOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Quick Create</span>
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Sidebar Navigation">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-brand-600 dark:text-brand-400' : 'text-muted-foreground')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer info / Dark mode */}
        <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Celebra v1.2</span>
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* ── Main App Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-40 sm:w-64"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search events, guests...</span>
            </button>
          </div>

          {/* Right Header Icons & User Dropdown */}
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>

            {user && (
              <DropdownMenuPrimitive.Root>
                <DropdownMenuPrimitive.Trigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full p-1 hover:bg-muted focus-visible:outline-ring"
                    aria-label="Account menu"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-xs">
                      {user.first_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                    <span className="hidden sm:block text-xs font-semibold text-foreground max-w-[120px] truncate pr-1">
                      {user.first_name || user.email.split('@')[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuPrimitive.Trigger>
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.Content
                    className="z-50 min-w-[200px] overflow-hidden rounded-xl border bg-card p-1.5 shadow-card"
                    align="end"
                    sideOffset={6}
                  >
                    <div className="px-2.5 py-2 border-b mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{user.full_name || 'Organizer'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <DropdownMenuPrimitive.Item asChild>
                      <Link
                        href="/account"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted focus:bg-muted outline-none"
                      >
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        Account Settings
                      </Link>
                    </DropdownMenuPrimitive.Item>

                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />

                    <DropdownMenuPrimitive.Item asChild>
                      <button
                        onClick={() => auth.logout()}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive cursor-pointer hover:bg-destructive/10 focus:bg-destructive/10 outline-none font-medium"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </DropdownMenuPrimitive.Item>
                  </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Root>
            )}
          </div>
        </header>

        {/* ── Main View Area ── */}
        <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* App Footer */}
        <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-card/40">
          Celebra Premium Event Planning Platform · Designed for flawless celebrations
        </footer>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-xs flex-1 flex flex-col bg-card border-r shadow-floating z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <span className="font-bold text-base">Celebra Studio</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 pt-4 overflow-y-auto">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  auth.logout();
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Create Action Modal ── */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Create</DialogTitle>
            <DialogDescription>Select what celebration item you want to create right now:</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <button
              onClick={() => {
                setQuickCreateOpen(false);
                router.push('/events/new');
              }}
              className="flex items-center gap-3 p-3 rounded-xl border hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-left transition-all"
            >
              <div className="p-2 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">New Event</p>
                <p className="text-xs text-muted-foreground">Start planning a birthday, wedding, or gala</p>
              </div>
            </button>

            <button
              onClick={() => {
                setQuickCreateOpen(false);
                router.push('/events');
              }}
              className="flex items-center gap-3 p-3 rounded-xl border hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-left transition-all"
            >
              <div className="p-2 rounded-lg bg-champagne-100 text-champagne-700 dark:bg-champagne-900 dark:text-champagne-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Invite Guests</p>
                <p className="text-xs text-muted-foreground">Add to guest roster or issue RSVP links</p>
              </div>
            </button>

            <button
              onClick={() => {
                setQuickCreateOpen(false);
                router.push('/vendors');
              }}
              className="flex items-center gap-3 p-3 rounded-xl border hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-left transition-all"
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Book a Vendor</p>
                <p className="text-xs text-muted-foreground">Discover verified caterers, photographers & venues</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Global Search Modal ── */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleGlobalSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Type an event name, venue, guest, or task..."
                className="pl-9 h-11 text-sm rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
              <span>Press [Enter] to execute global query</span>
              <Button size="sm" variant="brand" type="submit">
                Search
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
