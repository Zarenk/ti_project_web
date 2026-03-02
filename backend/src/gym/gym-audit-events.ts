import { AuditAction } from '@prisma/client';

/**
 * Gym-specific auditable events.
 *
 * Maps to the existing AuditLog system via:
 *   - action:     AuditAction enum (CREATED, UPDATED, DELETED, OTHER)
 *   - entityType: string identifier for the gym entity
 *   - summary:    human-readable description
 *
 * Usage:
 *   const event = GYM_AUDIT_EVENTS.CHECKIN;
 *   await activityService.log({
 *     action: event.action,
 *     entityType: event.entityType,
 *     entityId: String(memberId),
 *     summary: event.summary(memberName),
 *     actorId, organizationId, companyId,
 *   });
 */

interface GymAuditEvent {
  action: AuditAction;
  entityType: string;
  summary: (...args: string[]) => string;
}

export const GYM_AUDIT_EVENTS = {
  // ── Member lifecycle ──────────────────────────────────────────────────
  MEMBER_CREATED: {
    action: AuditAction.CREATED,
    entityType: 'GymMember',
    summary: (name: string) => `Miembro "${name}" registrado en el gimnasio`,
  },

  MEMBER_UPDATED: {
    action: AuditAction.UPDATED,
    entityType: 'GymMember',
    summary: (name: string) => `Datos del miembro "${name}" actualizados`,
  },

  // ── Membership state changes ──────────────────────────────────────────
  MEMBERSHIP_STATE_CHANGE: {
    action: AuditAction.UPDATED,
    entityType: 'GymMembership',
    summary: (name: string, from: string, to: string) =>
      `Membresia de "${name}" cambio de ${from} a ${to}`,
  },

  MEMBERSHIP_RENEWED: {
    action: AuditAction.UPDATED,
    entityType: 'GymMembership',
    summary: (name: string, plan: string) =>
      `Membresia de "${name}" renovada (plan: ${plan})`,
  },

  FREEZE_REQUEST: {
    action: AuditAction.UPDATED,
    entityType: 'GymMembership',
    summary: (name: string) =>
      `Solicitud de congelamiento de membresia para "${name}"`,
  },

  CANCEL_REQUEST: {
    action: AuditAction.UPDATED,
    entityType: 'GymMembership',
    summary: (name: string) =>
      `Solicitud de cancelacion de membresia para "${name}"`,
  },

  // ── Check-in ──────────────────────────────────────────────────────────
  CHECKIN: {
    action: AuditAction.CREATED,
    entityType: 'GymCheckin',
    summary: (name: string) => `Check-in registrado para "${name}"`,
  },

  GUEST_PASS_ISSUED: {
    action: AuditAction.CREATED,
    entityType: 'GymGuestPass',
    summary: (guestName: string, memberName: string) =>
      `Pase de invitado emitido para "${guestName}" (referido por "${memberName}")`,
  },

  // ── Payments ──────────────────────────────────────────────────────────
  PAYMENT_FAILED: {
    action: AuditAction.OTHER,
    entityType: 'GymPayment',
    summary: (name: string, reason: string) =>
      `Pago fallido para "${name}": ${reason}`,
  },

  // ── Classes ───────────────────────────────────────────────────────────
  CLASS_BOOKED: {
    action: AuditAction.CREATED,
    entityType: 'GymClassBooking',
    summary: (memberName: string, className: string) =>
      `"${memberName}" reservo lugar en clase "${className}"`,
  },

  CLASS_CANCELLED: {
    action: AuditAction.DELETED,
    entityType: 'GymClassBooking',
    summary: (memberName: string, className: string) =>
      `"${memberName}" cancelo reserva en clase "${className}"`,
  },

  // ── Trainers ──────────────────────────────────────────────────────────
  TRAINER_ASSIGNED: {
    action: AuditAction.UPDATED,
    entityType: 'GymTrainerAssignment',
    summary: (memberName: string, trainerName: string) =>
      `Entrenador "${trainerName}" asignado a "${memberName}"`,
  },

  // ── Compliance / Legal ────────────────────────────────────────────────
  WAIVER_SIGNED: {
    action: AuditAction.CREATED,
    entityType: 'GymWaiver',
    summary: (name: string) =>
      `Deslinde de responsabilidad firmado por "${name}"`,
  },

  HEALTH_DATA_ACCESSED: {
    action: AuditAction.OTHER,
    entityType: 'GymMember',
    summary: (memberName: string, accessedBy: string) =>
      `Datos de salud de "${memberName}" consultados por "${accessedBy}"`,
  },
} as const satisfies Record<string, GymAuditEvent>;

export type GymAuditEventName = keyof typeof GYM_AUDIT_EVENTS;
