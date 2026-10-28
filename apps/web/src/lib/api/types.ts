/**
 * API types matching the Django REST Framework serializers.
 */

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_joined: string;
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  password_confirm?: string;
  first_name: string;
  last_name: string;
};
export type PasswordResetRequestPayload = { email: string };
export type PasswordResetConfirmPayload = {
  token: string;
  uid: string;
  new_password: string;
};

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'planning' | 'confirmed' | 'completed' | 'cancelled';
export type EventType =
  | 'birthday'
  | 'wedding'
  | 'corporate'
  | 'conference'
  | 'party'
  | 'anniversary'
  | 'other';

export type Event = {
  id: string;
  name: string;
  event_type: EventType;
  description: string;
  status: EventStatus;
  venue: string;
  start_date: string; // ISO datetime
  end_date: string;   // ISO datetime
  timezone: string;
  currency: string;
  budget: string;
  owner: User;
  user_role: string;
  guests_count: number;
  attending_count: number;
  pending_rsvp_count: number;
  tasks_count: number;
  completed_tasks_count: number;
  actual_spent: string;
  created_at: string;
  updated_at: string;
};

export type EventCreatePayload = {
  name: string;
  event_type: EventType;
  description?: string;
  venue?: string;
  start_date: string;  // ISO datetime e.g. "2026-12-25T18:00:00"
  end_date: string;    // ISO datetime
  timezone?: string;
  currency?: string;
  budget?: string;
  status?: string;
};

// ─── Members ─────────────────────────────────────────────────────────────────

export type MemberRole = 'owner' | 'cohost';
export type EventMember = {
  id: string;
  user: string;
  user_email: string;
  user_full_name: string;
  role: MemberRole;
  joined_at: string;
};

// ─── Guests ──────────────────────────────────────────────────────────────────

export type RsvpStatus = 'yes' | 'no' | 'maybe' | 'pending';

export type Guest = {
  id: string;
  event: string;
  name?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  rsvp_status: RsvpStatus;
  plus_ones?: number;
  plus_one_count: number;
  dietary_requirements: string;
  accessibility_requirements: string;
  notes: string;
  invited_at: string | null;
  rsvp_at: string | null;
  created_at: string;
};

export type GuestCreatePayload = {
  name?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  plus_ones?: number;
  plus_one_count?: number;
  dietary_requirements?: string;
  accessibility_requirements?: string;
  notes?: string;
};

export type GuestSummary = {
  total: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  total_attendees: number;
};

export type InviteToken = {
  id: string;
  token: string; // raw token, only shown once on create
  event: string;
  event_title: string;
  expires_at: string | null;
  is_revoked: boolean;
  created_at: string;
};

// ─── Budget ──────────────────────────────────────────────────────────────────

export type BudgetCategory = {
  id: string;
  event_id?: string;
  name: string;
  estimated_amount: string;
  actual_amount?: string;
  variance?: string;
  expenses?: Expense[];
  // Backwards compat / UI helpers
  allocated_amount?: string;
  total_actual?: string;
  expense_count?: number;
};

export type Expense = {
  id: string;
  category_id: string;
  category_name?: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  // UI helpers
  title?: string;
  vendor?: string;
  estimated_amount?: string;
  actual_amount?: string;
  is_paid?: boolean;
  due_date?: string | null;
};

export type BudgetSummary = {
  currency: string;
  budget_limit: string | null;
  total_estimated: string;
  total_actual: string;
  remaining_budget: string | null;
  budget_remaining?: string | null;
  budget_variance?: string;
  variance?: string;
  cost_per_guest: string | null;
  categories?: {
    id: string;
    name: string;
    estimated_amount: string;
    actual_amount: string;
    variance: string;
    expenses_count: number;
    expenses: any[];
  }[];
  category_breakdown?: {
    category_id: string;
    category_name: string;
    total_estimated: string;
    total_actual: string;
  }[];
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export type Task = {
  id: string;
  event: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_to_email: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_overdue: boolean;
  created_at: string;
};

export type ScheduleItem = {
  id: string;
  event: string;
  title: string;
  description: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  location: string;
  notes: string;
  created_at: string;
};

// ─── Vendors ─────────────────────────────────────────────────────────────────

export type VendorCategory =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'music'
  | 'decoration'
  | 'transport'
  | 'other';

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  is_sample_data: boolean;
  created_at: string;
};

export type QuoteStatus = 'requested' | 'quoted' | 'confirmed' | 'cancelled';

export type QuoteRequest = {
  id: string;
  event: string;
  vendor: string;
  vendor_name: string;
  status: QuoteStatus;
  requested_date: string | null;
  event_date: string | null;
  estimated_guests: number | null;
  message: string;
  quoted_amount: string | null;
  notes: string;
  created_at: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type Booking = {
  id: string;
  event: string;
  vendor: string;
  vendor_name: string;
  status: BookingStatus;
  start_datetime: string;
  end_datetime: string;
  amount: string | null;
  notes: string;
  created_at: string;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationKind =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'event_reminder'
  | 'rsvp_received'
  | 'invite_accepted'
  | 'quote_received'
  | 'booking_confirmed'
  | 'general';

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
};

// ─── AI ──────────────────────────────────────────────────────────────────────

export type AiRequestKind = 'event_plan' | 'task_list' | 'budget_allocation' | 'invite_text';

export type AiRequest = {
  id: string;
  kind: AiRequestKind;
  prompt: string;
  result: Record<string, unknown> | null;
  is_configured: boolean;
  requires_user_confirmation: boolean;
  created_at: string;
};

export type AiGeneratePayload = {
  kind: AiRequestKind;
  event_id?: string;
  context?: Record<string, unknown>;
};
