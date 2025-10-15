import { Prisma } from '@prisma/client';

export type WithOptionalOrganizationId<T> = T & {
  organizationId?: number | null;
};

export type InventoryCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.InventoryCreateInput
>;

export type InventoryUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.InventoryUncheckedCreateInput
>;

export type InventoryHistoryCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.InventoryHistoryCreateInput
>;

export type InventoryHistoryUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.InventoryHistoryUncheckedCreateInput
>;

export type InventoryHistoryCreateManyInputWithOrganization = WithOptionalOrganizationId<
  Prisma.InventoryHistoryCreateManyInput
>;

export type TransferCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.TransferCreateInput
>;

export type TransferUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.TransferUncheckedCreateInput
>;

export type UserCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.UserCreateInput
>;

export type UserUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.UserUncheckedCreateInput
>;

export type ClientCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.ClientCreateInput
>;

export type ClientUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.ClientUncheckedCreateInput
>;

export type EntryCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.EntryCreateInput
>;

export type EntryUncheckedCreateInputWithOrganization = WithOptionalOrganizationId<
  Prisma.EntryUncheckedCreateInput
>;