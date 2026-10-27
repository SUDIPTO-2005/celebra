'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Store, Search, Mail, Phone, Globe, MapPin, Tag } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
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
import { vendorsApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { capitalize } from '@/lib/utils';
import type { Vendor, VendorCategory } from '@/lib/api/types';

const CATEGORIES: ('all' | VendorCategory)[] = [
  'all',
  'venue',
  'catering',
  'photography',
  'music',
  'decoration',
  'transport',
  'other',
];

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState<'all' | VendorCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Modal
  const [activeVendor, setActiveVendor] = useState<Vendor | null>(null);

  const loadVendors = async () => {
    try {
      const res = await vendorsApi.list('page_size=50');
      const list = Array.isArray(res) ? res : (res?.results ?? []);
      setVendors(list);
    } catch (err) {
      setError(getErrorMessage(err));
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.filter((v) => {
      const matchesCat = selectedCat === 'all' || v.category === selectedCat;
      const matchesSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [vendors, selectedCat, searchTerm]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vendor Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore and connect with verified venues, caterers, photographers, and entertainers
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Categories Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  selectedCat === cat
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed bg-card">
            <Store className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="mt-3 text-base font-semibold">No vendors found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try choosing another category or clearing your search filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((v) => (
              <Card
                key={v.id}
                className="hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                onClick={() => setActiveVendor(v)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {v.category}
                    </Badge>
                    {v.is_sample_data && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                        Sample Data
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground mt-3">{v.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {v.description || 'Professional event vendor services.'}
                  </p>

                  <div className="mt-4 pt-4 border-t space-y-1.5 text-xs text-muted-foreground">
                    {v.address && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{v.address}</span>
                      </div>
                    )}
                    {v.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{v.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Vendor Detail Dialog */}
        <Dialog open={!!activeVendor} onOpenChange={(open) => !open && setActiveVendor(null)}>
          {activeVendor && (
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {activeVendor.category}
                  </Badge>
                  {activeVendor.is_sample_data && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                      Sample Data
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl mt-2">{activeVendor.name}</DialogTitle>
                <DialogDescription>{activeVendor.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm border-t border-b">
                {activeVendor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{activeVendor.address}</span>
                  </div>
                )}
                {activeVendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{activeVendor.email}</span>
                  </div>
                )}
                {activeVendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{activeVendor.phone}</span>
                  </div>
                )}
                {activeVendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={activeVendor.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline truncate"
                    >
                      {activeVendor.website}
                    </a>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                💡 To request a quote or book this vendor for a celebration, open your specific event and visit its <strong>Vendors</strong> tab.
              </div>

              <DialogFooter>
                <Button variant="brand" onClick={() => setActiveVendor(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppLayout>
  );
}
