/**
 * Auto-managed field exclusion types for DTO creation.
 *
 * Schema patterns (from Prisma audit):
 *   Pattern A (~45 models): id + createdAt + updatedAt
 *   Pattern B (~50 models): Pattern A + organizationId
 *   Pattern C (~18 models): Pattern B + companyId
 *
 * Usage:
 *   type CreateUserDto = Omit<User, AutoManagedBase>
 *   type CreateStoreDto = Omit<Store, AutoManagedMultiTenant>
 */

/** Fields auto-managed by Prisma (autoincrement, @default(now()), @updatedAt) */
export type AutoManagedBase = 'id' | 'createdAt' | 'updatedAt'

/** Base + organizationId (injected by tenant middleware) */
export type AutoManagedTenant = AutoManagedBase | 'organizationId'

/** Tenant + companyId (injected by tenant middleware) */
export type AutoManagedMultiTenant = AutoManagedTenant | 'companyId'
