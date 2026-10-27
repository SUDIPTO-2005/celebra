'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  LayoutDashboard,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
  Store,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/ai', label: 'AI Assistant', icon: Sparkles },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function AppNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = auth.status === 'authenticated' ? auth.user : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-brand-700">
          <span className="text-xl">🎉</span>
          <span className="text-lg font-bold tracking-tight">Celebra</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="flex items-center gap-2">
          {user && (
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <button
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="User menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {user.first_name?.[0] ?? user.email[0]}
                  </span>
                  <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium">
                    {user.first_name || user.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                  className="z-50 min-w-[180px] overflow-hidden rounded-md border bg-background p-1 shadow-md"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuPrimitive.Item asChild>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Account
                    </Link>
                  </DropdownMenuPrimitive.Item>
                  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                  <DropdownMenuPrimitive.Item asChild>
                    <button
                      onClick={() => auth.logout()}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-md p-2 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t bg-background px-4 py-2"
          aria-label="Mobile navigation"
        >
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
