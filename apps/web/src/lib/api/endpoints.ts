/**
 * Typed API endpoint wrappers.
 */
import { api } from './client';
import type {
  User,
  LoginPayload,
  RegisterPayload,
  PasswordResetRequestPayload,
  PaginatedResponse,
  Event,
  EventCreatePayload,
  EventMember,
  Guest,
  GuestCreatePayload,
  GuestSummary,
  InviteToken,
  BudgetCategory,
  Expense,
  BudgetSummary,
  Task,
  ScheduleItem,
  Vendor,
  QuoteRequest,
  Booking,
  Notification,
  AiGeneratePayload,
  AiRequest,
} from './types';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => api.get<User>('/api/v1/accounts/me/'),
  login: (data: LoginPayload) => api.post<User>('/api/v1/accounts/login/', data),
  register: (data: RegisterPayload) => api.post<User>('/api/v1/accounts/register/', data),
  logout: () => api.post<void>('/api/v1/accounts/logout/'),
  passwordResetRequest: (data: PasswordResetRequestPayload) =>
    api.post<{ detail: string }>('/api/v1/accounts/password-reset/', data),
  passwordResetConfirm: (data: { uid: string; token: string; new_password: string }) =>
    api.post<{ detail: string }>('/api/v1/accounts/password-reset-confirm/', data),
  updateProfile: (data: Partial<User>) => api.patch<User>('/api/v1/accounts/me/', data),
};

// ─── Events ──────────────────────────────────────────────────────────────────

export const eventsApi = {
  list: (params?: string) => api.get<PaginatedResponse<Event>>(`/api/v1/events/${params ? `?${params}` : ''}`),
  create: (data: EventCreatePayload) => api.post<Event>('/api/v1/events/', data),
  get: (id: string) => api.get<Event>(`/api/v1/events/${id}/`),
  update: (id: string, data: Partial<EventCreatePayload>) => api.patch<Event>(`/api/v1/events/${id}/`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/events/${id}/`),
  duplicate: (id: string) => api.post<Event>(`/api/v1/events/${id}/duplicate/`),
  cancel: (id: string) => api.post<Event>(`/api/v1/events/${id}/cancel/`),
  transition: (id: string, status: string) => api.post<Event>(`/api/v1/events/${id}/transition/`, { status }),
  members: (id: string) => api.get<EventMember[]>(`/api/v1/events/${id}/members/`),
  addMember: (id: string, data: { email: string; role: string }) =>
    api.post<EventMember>(`/api/v1/events/${id}/members/`, data),
  removeMember: (id: string, memberId: string) =>
    api.delete<void>(`/api/v1/events/${id}/members/${memberId}/`),
};

// ─── Guests ──────────────────────────────────────────────────────────────────
// Backend: /api/v1/guests/<event_id>/  (NOT /api/v1/events/<id>/guests/)

export const guestsApi = {
  list: (eventId: string, params?: string) =>
    api.get<PaginatedResponse<Guest>>(`/api/v1/guests/${eventId}/${params ? `?${params}` : ''}`),
  create: (eventId: string, data: GuestCreatePayload) =>
    api.post<Guest>(`/api/v1/guests/${eventId}/`, data),
  get: (eventId: string, guestId: string) =>
    api.get<Guest>(`/api/v1/guests/${eventId}/${guestId}/`),
  update: (eventId: string, guestId: string, data: Partial<GuestCreatePayload>) =>
    api.patch<Guest>(`/api/v1/guests/${eventId}/${guestId}/`, data),
  delete: (eventId: string, guestId: string) =>
    api.delete<void>(`/api/v1/guests/${eventId}/${guestId}/`),
  summary: (eventId: string) => api.get<GuestSummary>(`/api/v1/guests/${eventId}/summary/`),
  importCsv: (eventId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<{ imported: number; errors: { row: number; error: string }[] }>(
      `/api/v1/guests/${eventId}/import-csv/`,
      form,
    );
  },
  generateToken: (eventId: string, guestId: string) =>
    api.post<InviteToken>(`/api/v1/guests/${eventId}/${guestId}/invite-token/`, {}),
  createInviteToken: (eventId: string, guestId?: string) =>
    api.post<InviteToken>(`/api/v1/guests/${eventId}/${guestId}/invite-token/`, {}),
  revokeToken: (eventId: string, guestId: string) =>
    api.post<void>(`/api/v1/guests/${eventId}/${guestId}/revoke-token/`, {}),
  publicRsvp: (token: string, data: { rsvp_status?: string; response?: string; plus_one_count?: number; plus_ones?: number; notes?: string; dietary_requirements?: string; accessibility_requirements?: string }) =>
    api.post<any>(`/api/v1/guests/rsvp/`, {
      token,
      response: data.response || data.rsvp_status || 'yes',
      plus_ones: data.plus_ones ?? data.plus_one_count ?? 0,
      notes: data.notes || '',
      dietary_requirements: data.dietary_requirements || '',
      accessibility_requirements: data.accessibility_requirements || '',
    }),
  publicInviteInfo: (token: string) =>
    api.get<{
      guest_name: string;
      event_name: string;
      event_venue: string;
      event_start_date: string;
      event_end_date: string;
      event_timezone: string;
      plus_ones: number;
      dietary_requirements: string;
      accessibility_requirements: string;
      current_response: string | null;
      notes: string;
    }>(`/api/v1/guests/rsvp/?token=${token}`),
};

// ─── Budget ──────────────────────────────────────────────────────────────────
// Backend: /api/v1/budget/<event_id>/categories/  and  /api/v1/budget/<event_id>/expenses/

export const budgetApi = {
  summary: (eventId: string) => api.get<BudgetSummary>(`/api/v1/budget/${eventId}/summary/`),
  listCategories: (eventId: string) =>
    api.get<BudgetCategory[]>(`/api/v1/budget/${eventId}/categories/`),
  createCategory: (eventId: string, data: Partial<BudgetCategory>) =>
    api.post<BudgetCategory>(`/api/v1/budget/${eventId}/categories/`, data),
  updateCategory: (eventId: string, id: string, data: Partial<BudgetCategory>) =>
    api.patch<BudgetCategory>(`/api/v1/budget/${eventId}/categories/${id}/`, data),
  deleteCategory: (eventId: string, id: string) =>
    api.delete<void>(`/api/v1/budget/${eventId}/categories/${id}/`),
  listExpenses: (eventId: string, params?: string) =>
    api.get<PaginatedResponse<Expense>>(`/api/v1/budget/${eventId}/expenses/${params ? `?${params}` : ''}`),
  createExpense: (eventId: string, data: Partial<Expense>) =>
    api.post<Expense>(`/api/v1/budget/${eventId}/expenses/`, data),
  updateExpense: (eventId: string, id: string, data: Partial<Expense>) =>
    api.patch<Expense>(`/api/v1/budget/${eventId}/expenses/${id}/`, data),
  deleteExpense: (eventId: string, id: string) =>
    api.delete<void>(`/api/v1/budget/${eventId}/expenses/${id}/`),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
// Backend: /api/v1/tasks/<event_id>/  and  /api/v1/tasks/<event_id>/schedule/

export const tasksApi = {
  list: (eventId: string, params?: string) =>
    api.get<PaginatedResponse<Task>>(`/api/v1/tasks/${eventId}/${params ? `?${params}` : ''}`),
  create: (eventId: string, data: Partial<Task>) =>
    api.post<Task>(`/api/v1/tasks/${eventId}/`, data),
  update: (eventId: string, id: string, data: Partial<Task>) =>
    api.patch<Task>(`/api/v1/tasks/${eventId}/${id}/`, data),
  delete: (eventId: string, id: string) => api.delete<void>(`/api/v1/tasks/${eventId}/${id}/`),
  complete: (eventId: string, id: string) =>
    api.patch<Task>(`/api/v1/tasks/${eventId}/${id}/`, { status: 'completed' }),
  listSchedule: (eventId: string) =>
    api.get<ScheduleItem[]>(`/api/v1/tasks/${eventId}/schedule/`),
  createScheduleItem: (eventId: string, data: Partial<ScheduleItem>) =>
    api.post<ScheduleItem>(`/api/v1/tasks/${eventId}/schedule/`, data),
  updateScheduleItem: (eventId: string, id: string, data: Partial<ScheduleItem>) =>
    api.patch<ScheduleItem>(`/api/v1/tasks/${eventId}/schedule/${id}/`, data),
  deleteScheduleItem: (eventId: string, id: string) =>
    api.delete<void>(`/api/v1/tasks/${eventId}/schedule/${id}/`),
};

// ─── Vendors ─────────────────────────────────────────────────────────────────
// Backend: /api/v1/vendors/  and  /api/v1/vendors/events/<event_id>/quotes|bookings/

export const vendorsApi = {
  list: (params?: string) =>
    api.get<PaginatedResponse<Vendor>>(`/api/v1/vendors/${params ? `?${params}` : ''}`),
  get: (id: string) => api.get<Vendor>(`/api/v1/vendors/${id}/`),
  listQuotes: (eventId: string) =>
    api.get<QuoteRequest[]>(`/api/v1/vendors/events/${eventId}/quotes/`),
  createQuote: (eventId: string, data: Partial<QuoteRequest>) =>
    api.post<QuoteRequest>(`/api/v1/vendors/events/${eventId}/quotes/`, data),
  updateQuote: (eventId: string, id: string, data: Partial<QuoteRequest>) =>
    api.patch<QuoteRequest>(`/api/v1/vendors/events/${eventId}/quotes/${id}/`, data),
  listBookings: (eventId: string) =>
    api.get<Booking[]>(`/api/v1/vendors/events/${eventId}/bookings/`),
  createBooking: (eventId: string, data: Partial<Booking>) =>
    api.post<Booking>(`/api/v1/vendors/events/${eventId}/bookings/`, data),
  cancelBooking: (eventId: string, id: string) =>
    api.post<Booking>(`/api/v1/vendors/events/${eventId}/bookings/${id}/cancel/`, {}),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: string) =>
    api.get<Notification[] | PaginatedResponse<Notification>>(
      `/api/v1/notifications/${params ? `?${params}` : ''}`
    ),
  markRead: (id: string) => api.patch<Notification>(`/api/v1/notifications/${id}/`),
  markAllRead: () => api.post<{ marked: number }>('/api/v1/notifications/mark-all-read/'),
  unreadCount: () => api.get<{ count: number }>('/api/v1/notifications/unread-count/'),
};

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiApi = {
  status: () => api.get<{ is_configured: boolean; mode: string; message: string }>('/api/v1/ai/status/'),
  generate: async (data: AiGeneratePayload): Promise<AiRequest> => {
    let result: Record<string, unknown> | null = null;
    const ctx = (data.context || {}) as Record<string, any>;
    if (data.kind === 'event_plan') {
      result = await api.post<Record<string, unknown>>('/api/v1/ai/plan/', {
        event_name: ctx.event_name || 'My Celebration',
        event_type: ctx.event_type || 'celebration',
        guest_count: Number(ctx.guest_count) || 25,
        budget: ctx.budget || '1000.00',
        theme: ctx.theme || '',
      });
    } else if (data.kind === 'task_list') {
      result = await api.post<Record<string, unknown>>('/api/v1/ai/tasks/', {
        event_type: ctx.event_type || 'celebration',
        days_until_event: Number(ctx.days_until_event) || 30,
      });
    } else if (data.kind === 'budget_allocation') {
      result = await api.post<Record<string, unknown>>('/api/v1/ai/budget/', {
        total_budget: ctx.total_budget || ctx.budget || '1000.00',
        event_type: ctx.event_type || 'celebration',
      });
    } else if (data.kind === 'invite_text') {
      result = await api.post<Record<string, unknown>>('/api/v1/ai/invite/', {
        event_name: ctx.event_name || 'Celebration',
        host_name: ctx.host_name || 'Organizer',
        venue: ctx.venue || '',
        date_str: ctx.date_str || new Date().toLocaleDateString(),
        tone: ctx.tone || 'warm',
      });
    }
    return {
      id: Math.random().toString(36).slice(2),
      kind: data.kind,
      prompt: `Generated ${data.kind.replace('_', ' ')}`,
      result,
      is_configured: true,
      requires_user_confirmation: true,
      created_at: new Date().toISOString(),
    };
  },
  history: () => api.get<PaginatedResponse<AiRequest>>('/api/v1/ai/requests/'),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  summary: () =>
    api.get<{
      upcoming_events: Event[];
      recent_notifications: Notification[];
      task_stats: { total: number; completed: number; overdue: number };
      rsvp_stats: { total: number; confirmed: number; pending: number };
    }>('/api/v1/dashboard/'),
};
