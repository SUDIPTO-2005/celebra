'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PlusCircle, DollarSign, Tag, Trash2, Edit2, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
import { budgetApi } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { BudgetCategory, Expense, BudgetSummary } from '@/lib/api/types';

export default function EventBudgetPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { success, error: toastError } = useToast();

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catAllocated, setCatAllocated] = useState('');

  // Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expCatId, setExpCatId] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expEstimated, setExpEstimated] = useState('');
  const [expActual, setExpActual] = useState('');
  const [expPaid, setExpPaid] = useState(false);
  const [expDueDate, setExpDueDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [sum, cats, exp] = await Promise.all([
        budgetApi.summary(eventId),
        budgetApi.listCategories(eventId),
        budgetApi.listExpenses(eventId),
      ]);
      setSummary(sum);
      setCategories(Array.isArray(cats) ? cats : (cats as any)?.results ?? []);
      setExpenses(Array.isArray(exp) ? exp : (exp?.results ?? []));
    } catch (err) {
      toastError('Budget data failed to load', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, toastError]);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId, loadData]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setSubmitting(true);
    try {
      await budgetApi.createCategory(eventId, {
        name: catName,
        estimated_amount: catAllocated || '0.00',
      } as any);
      success('Category created', `${catName} added to categories.`);
      setIsCategoryOpen(false);
      setCatName('');
      setCatAllocated('');
      loadData();
    } catch (err) {
      toastError('Category creation failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpTitle('');
    setExpCatId(categories[0]?.id || '');
    setExpVendor('');
    setExpEstimated('');
    setExpActual('');
    setExpPaid(false);
    setExpDueDate(new Date().toISOString().split('T')[0]);
    setIsExpenseOpen(true);
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpTitle(expense.description || expense.title || '');
    setExpCatId(expense.category_id || '');
    setExpVendor(expense.vendor || '');
    setExpEstimated(expense.amount || expense.estimated_amount || '');
    setExpActual(expense.amount || expense.actual_amount || '');
    setExpPaid(Boolean(expense.is_paid));
    setExpDueDate(expense.date || expense.due_date || '');
    setIsExpenseOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = expActual || expEstimated;
    if (!expTitle.trim() || !amountVal) {
      toastError('Validation error', 'Description and amount are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        category_id: expCatId || categories[0]?.id,
        description: expTitle,
        amount: amountVal,
        currency: currency,
        date: expDueDate || new Date().toISOString().split('T')[0],
      };

      if (editingExpense) {
        await budgetApi.updateExpense(eventId, editingExpense.id, payload);
        success('Expense updated', 'Saved changes to expense item.');
      } else {
        await budgetApi.createExpense(eventId, payload);
        success('Expense added', `${expTitle} added to budget.`);
      }

      setIsExpenseOpen(false);
      loadData();
    } catch (err) {
      toastError('Save failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!confirm(`Remove expense "${title}"?`)) return;
    try {
      await budgetApi.deleteExpense(eventId, id);
      success('Expense removed', `${title} deleted.`);
      loadData();
    } catch (err) {
      toastError('Delete failed', getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currency = summary?.currency || 'USD';
  const remaining = parseFloat(summary?.budget_remaining || '0');
  const variance = parseFloat(summary?.variance || '0');

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Total Budget Limit</span>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(summary?.budget_limit, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Target total ceiling</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Actual Spent</span>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(summary?.total_actual, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Estimated: {formatCurrency(summary?.total_estimated, currency)}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Remaining Budget</span>
          <div className={`text-2xl font-bold mt-1 ${remaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
            {formatCurrency(summary?.budget_remaining, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {remaining < 0 ? 'Exceeded limit' : 'Under budget'}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Cost per Guest</span>
          <div className="text-2xl font-bold mt-1">
            {formatCurrency(summary?.cost_per_guest, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Based on confirmed attendees</p>
        </Card>
      </div>

      {/* Category Breakdown & Action */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Category Budgets</CardTitle>
            <CardDescription>Allocated vs actual spending across groupings</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsCategoryOpen(true)}>
            <Tag className="h-4 w-4 mr-1.5" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No categories created yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {categories.map((c) => {
                const allocated = parseFloat(c.estimated_amount || c.allocated_amount || '0');
                const actual = parseFloat(c.actual_amount || c.total_actual || '0');
                const percent = allocated > 0 ? Math.min((actual / allocated) * 100, 100) : 0;

                return (
                  <div key={c.id} className="p-3 border rounded-lg bg-card space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span>{c.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {c.expenses?.length ?? c.expense_count ?? 0} expenses
                      </span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Actual: {formatCurrency(String(actual), currency)}</span>
                      <span>Target: {formatCurrency(String(allocated), currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Expenses</CardTitle>
            <CardDescription>Individual line items and commitments</CardDescription>
          </div>
          <Button variant="brand" size="sm" onClick={openAddExpense}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Add Expense
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="mt-2 text-sm font-semibold">No expenses recorded</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Keep track of invoices, rentals, catering, and purchases.
              </p>
              <Button variant="brand" size="sm" className="mt-4" onClick={openAddExpense}>
                Add Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" aria-label="Budget expense items">
                <thead className="bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Item / Vendor</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Estimated</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{e.description || e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.date}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {e.category_name || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {formatCurrency(e.estimated_amount || e.amount, e.currency || currency)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold">
                        {formatCurrency(e.amount || e.actual_amount, e.currency || currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                          Recorded
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => openEditExpense(e)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteExpense(e.id, e.description || e.title || 'Expense')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Category</DialogTitle>
            <DialogDescription>Group expenses like Venue, Catering, Music, etc.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <FormField label="Category Name" htmlFor="cat_name" required>
              <Input
                id="cat_name"
                placeholder="e.g., Decorations & Florals"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Allocated Limit" htmlFor="cat_alloc">
              <Input
                id="cat_alloc"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={catAllocated}
                onChange={(e) => setCatAllocated(e.target.value)}
              />
            </FormField>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCategoryOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>Record estimates or confirmed invoices</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <FormField label="Item Title" htmlFor="exp_title" required>
              <Input
                id="exp_title"
                placeholder="e.g., Ballroom Rental Deposit"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" htmlFor="exp_cat">
                <select
                  id="exp_cat"
                  className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm"
                  value={expCatId}
                  onChange={(e) => setExpCatId(e.target.value)}
                >
                  <option value="">(No Category)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Vendor" htmlFor="exp_vendor">
                <Input
                  id="exp_vendor"
                  placeholder="e.g., Palace Ballroom Inc."
                  value={expVendor}
                  onChange={(e) => setExpVendor(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Estimated Cost" htmlFor="exp_est" required>
                <Input
                  id="exp_est"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expEstimated}
                  onChange={(e) => setExpEstimated(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Actual Cost" htmlFor="exp_act">
                <Input
                  id="exp_act"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expActual}
                  onChange={(e) => setExpActual(e.target.value)}
                />
              </FormField>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="exp_paid"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                checked={expPaid}
                onChange={(e) => setExpPaid(e.target.checked)}
              />
              <label htmlFor="exp_paid" className="text-sm font-medium">
                Mark as Paid
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsExpenseOpen(false)}>
                Cancel
              </Button>
              <Button variant="brand" type="submit" loading={submitting}>
                {editingExpense ? 'Save Changes' : 'Record Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
