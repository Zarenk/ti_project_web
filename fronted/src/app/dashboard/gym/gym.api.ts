import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GymMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  dateOfBirth: string | null;
  medicalConditions: string | null;
  injuries: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  photo: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
  memberships?: GymMembership[];
  checkins?: GymCheckin[];
}

export interface GymMembership {
  id: number;
  memberId: number;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  price: number;
  maxFreezes: number;
  freezesUsed: number;
  gracePeriodDays: number;
  frozenAt: string | null;
  pastDueSince: string | null;
  scheduledCancelDate: string | null;
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
  member?: { id: number; firstName: string; lastName: string };
}

export interface GymCheckin {
  id: number;
  memberId: number;
  membershipId: number | null;
  checkinAt: string;
  checkoutAt: string | null;
  method: string | null;
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  member?: { id: number; firstName: string; lastName: string; photo?: string };
  membership?: { id: number; planName: string; status?: string };
}

export interface GymTrainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  photo: string | null;
  status: "ACTIVE" | "INACTIVE";
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
  schedules?: GymClassSchedule[];
}

export interface GymClass {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  durationMin: number;
  maxCapacity: number;
  isActive: boolean;
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  updatedAt: string;
  schedules?: GymClassSchedule[];
}

export interface GymClassSchedule {
  id: number;
  classId: number;
  trainerId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  companyId: number;
  organizationId: number | null;
  gymClass?: { id: number; name: string; durationMin?: number; maxCapacity?: number };
  trainer?: { id: number; firstName: string; lastName: string } | null;
  bookings?: GymClassBooking[];
}

export interface GymClassBooking {
  id: number;
  scheduleId: number;
  memberId: number;
  bookingDate: string;
  status: "BOOKED" | "ATTENDED" | "NO_SHOW" | "CANCELLED";
  companyId: number;
  organizationId: number | null;
  createdAt: string;
  member?: { id: number; firstName: string; lastName: string };
  schedule?: GymClassSchedule;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Members ────────────────────────────────────────────────────────────────────

export async function getMembers(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymMember>> {
  try {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/members?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function getMember(id: number): Promise<GymMember | null> {
  try {
    const res = await authFetch(`/gym/members/${id}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

export async function createMember(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dni?: string;
  dateOfBirth?: string;
  medicalConditions?: string;
  injuries?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photo?: string;
  notes?: string;
}): Promise<GymMember> {
  const res = await authFetch(`/gym/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear miembro");
  }
  return res.json();
}

export async function updateMember(
  id: number,
  data: Record<string, unknown>,
): Promise<GymMember> {
  const res = await authFetch(`/gym/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al actualizar miembro");
  }
  return res.json();
}

export async function deleteMember(id: number): Promise<void> {
  const res = await authFetch(`/gym/members/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al eliminar miembro");
  }
}

// ── Memberships ────────────────────────────────────────────────────────────────

export async function getMemberships(params?: {
  memberId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymMembership>> {
  try {
    const qs = new URLSearchParams();
    if (params?.memberId) qs.set("memberId", String(params.memberId));
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/memberships?${qs}`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function getMembership(id: number): Promise<GymMembership | null> {
  try {
    const res = await authFetch(`/gym/memberships/${id}`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

export async function createMembership(data: {
  memberId: number;
  planName: string;
  startDate: string;
  endDate: string;
  price: number;
  maxFreezes?: number;
  gracePeriodDays?: number;
}): Promise<GymMembership> {
  const res = await authFetch(`/gym/memberships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear membresia");
  }
  return res.json();
}

export async function getMembershipEvents(
  id: number,
): Promise<{ membershipId: number; currentStatus: string; validEvents: string[] }> {
  const res = await authFetch(`/gym/memberships/${id}/events`, {
    cache: "no-store",
  });
  return res.json();
}

export async function applyMembershipEvent(
  id: number,
  event: string,
  reason?: string,
): Promise<GymMembership & { previousStatus: string; appliedEvent: string }> {
  const res = await authFetch(`/gym/memberships/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al aplicar evento");
  }
  return res.json();
}

// ── Check-ins ──────────────────────────────────────────────────────────────────

export async function getCheckins(params?: {
  memberId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymCheckin>> {
  try {
    const qs = new URLSearchParams();
    if (params?.memberId) qs.set("memberId", String(params.memberId));
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/checkins?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function getActiveCheckins(): Promise<GymCheckin[]> {
  try {
    const res = await authFetch(`/gym/checkins/active`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function registerCheckin(data: {
  memberId: number;
  membershipId?: number;
  method?: string;
}): Promise<GymCheckin> {
  const res = await authFetch(`/gym/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al registrar check-in");
  }
  return res.json();
}

export async function registerCheckout(checkinId: number): Promise<GymCheckin> {
  const res = await authFetch(`/gym/checkins/${checkinId}/checkout`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al registrar checkout");
  }
  return res.json();
}

// ── Trainers ──────────────────────────────────────────────────────────────────

export async function getTrainers(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymTrainer>> {
  try {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/trainers?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function createTrainer(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  photo?: string;
}): Promise<GymTrainer> {
  const res = await authFetch(`/gym/trainers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear entrenador");
  }
  return res.json();
}

export async function updateTrainer(
  id: number,
  data: Record<string, unknown>,
): Promise<GymTrainer> {
  const res = await authFetch(`/gym/trainers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al actualizar entrenador");
  }
  return res.json();
}

export async function deleteTrainer(id: number): Promise<void> {
  const res = await authFetch(`/gym/trainers/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al eliminar entrenador");
  }
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function getClasses(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymClass>> {
  try {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.isActive !== undefined) qs.set("isActive", String(params.isActive));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/classes?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function createClass(data: {
  name: string;
  description?: string;
  category?: string;
  durationMin?: number;
  maxCapacity?: number;
}): Promise<GymClass> {
  const res = await authFetch(`/gym/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear clase");
  }
  return res.json();
}

export async function updateClass(
  id: number,
  data: Record<string, unknown>,
): Promise<GymClass> {
  const res = await authFetch(`/gym/classes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al actualizar clase");
  }
  return res.json();
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export async function getSchedules(params?: {
  classId?: number;
  trainerId?: number;
  dayOfWeek?: number;
}): Promise<GymClassSchedule[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.classId) qs.set("classId", String(params.classId));
    if (params?.trainerId) qs.set("trainerId", String(params.trainerId));
    if (params?.dayOfWeek !== undefined) qs.set("dayOfWeek", String(params.dayOfWeek));

    const res = await authFetch(`/gym/schedules?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function createSchedule(data: {
  classId: number;
  trainerId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<GymClassSchedule> {
  const res = await authFetch(`/gym/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear horario");
  }
  return res.json();
}

export async function deleteSchedule(id: number): Promise<void> {
  const res = await authFetch(`/gym/schedules/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al eliminar horario");
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getBookings(params?: {
  scheduleId?: number;
  memberId?: number;
  date?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<GymClassBooking>> {
  try {
    const qs = new URLSearchParams();
    if (params?.scheduleId) qs.set("scheduleId", String(params.scheduleId));
    if (params?.memberId) qs.set("memberId", String(params.memberId));
    if (params?.date) qs.set("date", params.date);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));

    const res = await authFetch(`/gym/bookings?${qs}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    throw error;
  }
}

export async function createBooking(data: {
  scheduleId: number;
  memberId: number;
  bookingDate: string;
}): Promise<GymClassBooking> {
  const res = await authFetch(`/gym/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al reservar cupo");
  }
  return res.json();
}

export async function cancelBooking(id: number): Promise<void> {
  const res = await authFetch(`/gym/bookings/${id}/cancel`, { method: "PATCH" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al cancelar reserva");
  }
}

export async function markAttendance(
  id: number,
  status: "ATTENDED" | "NO_SHOW",
): Promise<GymClassBooking> {
  const res = await authFetch(`/gym/bookings/${id}/attendance`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al marcar asistencia");
  }
  return res.json();
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface GymOverview {
  activeMembers: number;
  memberGrowth: number | null;
  activeMemberships: number;
  todayCheckins: number;
  checkinGrowth: number | null;
  todayClasses: number;
  activeTrainers: number;
}

export interface MembershipDistItem {
  status: string;
  count: number;
}

export interface CheckinTrendItem {
  date: string;
  count: number;
}

export interface PopularClassItem {
  className: string;
  category: string | null;
  bookings: number;
}

export interface CheckinByHourItem {
  hour: string;
  count: number;
}

export interface NewMembersMonthlyItem {
  month: string;
  count: number;
}

export interface GymRevenueSummary {
  currentMonth: number;
  previousMonth: number;
  growth: number | null;
  total: number;
}

export async function getGymOverview(): Promise<GymOverview> {
  try {
    const res = await authFetch(`/gym/analytics/overview`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { activeMembers: 0, memberGrowth: null, activeMemberships: 0, todayCheckins: 0, checkinGrowth: null, todayClasses: 0, activeTrainers: 0 };
    }
    throw error;
  }
}

export async function getMembershipDistribution(): Promise<MembershipDistItem[]> {
  try {
    const res = await authFetch(`/gym/analytics/membership-distribution`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function getCheckinTrend(days = 30): Promise<CheckinTrendItem[]> {
  try {
    const res = await authFetch(`/gym/analytics/checkin-trend?days=${days}`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function getPopularClasses(): Promise<PopularClassItem[]> {
  try {
    const res = await authFetch(`/gym/analytics/popular-classes`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function getCheckinsByHour(): Promise<CheckinByHourItem[]> {
  try {
    const res = await authFetch(`/gym/analytics/checkins-by-hour`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function getNewMembersMonthly(): Promise<NewMembersMonthlyItem[]> {
  try {
    const res = await authFetch(`/gym/analytics/new-members-monthly`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return [];
    throw error;
  }
}

export async function getGymRevenue(): Promise<GymRevenueSummary> {
  try {
    const res = await authFetch(`/gym/analytics/revenue`, { cache: "no-store" });
    return res.json();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { currentMonth: 0, previousMonth: 0, growth: null, total: 0 };
    }
    throw error;
  }
}
