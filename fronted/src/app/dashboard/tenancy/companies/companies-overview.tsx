"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  BriefcaseBusiness,
  Factory,
  Users,
  CalendarDays,
  BadgeInfo,
  Pencil,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type {
  CompanyResponse,
  OrganizationCompaniesOverview,
} from "../tenancy.api";

type CompaniesOverviewProps = {
  organizations: OrganizationCompaniesOverview[];
};

export function CompaniesOverview({
  organizations,
}: CompaniesOverviewProps): React.ReactElement {
  const isEmpty = organizations.length === 0;

  if (isEmpty) {
    return (
      <Card className="border-dashed border-sky-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-200">
            <Factory className="size-5 text-sky-600 dark:text-slate-100" />
            Aún no hay empresas registradas en la organización seleccionada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          Agrega una empresa desde el menú superior para comenzar a gestionar
          tu catálogo de tiendas y sucursales.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {organizations.map((organization) => (
        <OrganizationCard
          key={organization.id}
          organization={organization}
        />
      ))}
    </div>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: OrganizationCompaniesOverview;
}): React.ReactElement {
  const activeCompanies = useMemo(
    () =>
      organization.companies.filter(
        (company) => company.status?.toUpperCase() === "ACTIVE",
      ).length,
    [organization.companies],
  );

  return (
    <Card className="border-sky-100 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
              <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
              {organization.name}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Código: {organization.code ?? "—"}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={
              organization.status === "ACTIVE"
                ? "rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
            }
          >
            {organization.status === "ACTIVE" ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <Users className="size-4 text-sky-600 dark:text-slate-100" />
            {organization.membershipCount} usuarios asociados
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-sky-600 dark:text-slate-100" />
            Creada el{" "}
            {new Date(organization.createdAt).toLocaleDateString("es-PE")}
          </span>
          {organization.superAdmin ? (
            <span className="flex items-center gap-2">
              <BadgeInfo className="size-4 text-sky-600 dark:text-slate-100" />
              Super admin:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {organization.superAdmin.username}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ({organization.superAdmin.email})
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <BadgeInfo className="size-4" />
              Sin super admin asignado
            </span>
          )}
          <span className="flex items-center gap-2">
            <BriefcaseBusiness className="size-4 text-sky-600 dark:text-slate-100" />
            {activeCompanies} empresa(s) activas
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {organization.companies.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
            No hay empresas registradas en esta organización.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {organization.companies.map((company) => (
              <CompanySummary
                key={company.id}
                company={company}
                organizationName={organization.name}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompanySummary({
  company,
  organizationName,
}: {
  company: CompanyResponse;
  organizationName: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const statusActive =
    (company.status ?? "").toUpperCase() === "ACTIVE";

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {company.name}
          </h3>
          <Badge
            className={
              statusActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
            }
          >
            {statusActive ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        {company.legalName && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Razón social: {company.legalName}
          </p>
        )}
        {company.taxId && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            RUC/NIT: {company.taxId}
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Creada el{" "}
          {new Date(company.createdAt).toLocaleDateString("es-PE")}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px]"
            >
              Ver detalles
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{company.name}</DialogTitle>
              <DialogDescription>
                Información detallada de la empresa perteneciente a{" "}
                {organizationName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Nombre comercial:
                </span>{" "}
                {company.name}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Razón social:
                </span>{" "}
                {company.legalName ?? "—"}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  RUC / NIT:
                </span>{" "}
                {company.taxId ?? "—"}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Estado:
                </span>{" "}
                {company.status ?? "—"}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Creada el:
                </span>{" "}
                {new Date(company.createdAt).toLocaleString("es-PE")}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Actualizada el:
                </span>{" "}
                {new Date(company.updatedAt).toLocaleString("es-PE")}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="secondary"
          size="sm"
          asChild
          className="flex-1 min-w-[120px]"
        >
          <Link href={`/dashboard/tenancy/companies/${company.id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Editar
          </Link>
        </Button>
      </div>
    </div>
  );
}
