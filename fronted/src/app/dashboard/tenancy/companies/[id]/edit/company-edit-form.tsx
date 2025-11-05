"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type { CompanyDetail, UpdateCompanyPayload } from "../../../tenancy.api";
import { updateCompany } from "../../../tenancy.api";
import { setTenantSelection } from "@/utils/tenant-preferences";

interface CompanyEditFormProps {
  company: CompanyDetail;
}

export function CompanyEditForm({
  company,
}: CompanyEditFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formState, setFormState] = useState<UpdateCompanyPayload>({
    name: company.name,
    legalName: company.legalName ?? "",
    taxId: company.taxId ?? "",
    status: company.status ?? "ACTIVE",
  });

  const handleChange = (field: keyof UpdateCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await updateCompany(company.id, {
          ...formState,
          legalName: formState.legalName?.trim() ?? null,
          taxId: formState.taxId?.trim() ?? null,
        });
        await setTenantSelection({
          orgId: company.organization.id,
          companyId: company.id,
        });
        toast.success("Empresa actualizada correctamente.");
        router.push("/dashboard/tenancy/companies");
        router.refresh();
      } catch (error: any) {
        toast.error(
          error?.message ?? "No se pudo actualizar la empresa. Inténtalo nuevamente.",
        );
      }
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Editar empresa
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Los cambios afectarán únicamente a la organización{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {company.organization.name}
          </span>
          .
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <section className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Nombre comercial</Label>
              <Input
                id="company-name"
                value={formState.name ?? ""}
                onChange={handleChange("name")}
                required
                placeholder="Mi Empresa S.A."
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-legal-name">Razón social</Label>
              <Input
                id="company-legal-name"
                value={formState.legalName ?? ""}
                onChange={handleChange("legalName")}
                placeholder="Mi Empresa Sociedad Anónima"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-tax-id">RUC / NIT</Label>
              <Input
                id="company-tax-id"
                value={formState.taxId ?? ""}
                onChange={handleChange("taxId")}
                placeholder="Ingrese el número de identificación fiscal"
                disabled={isPending}
              />
            </div>
          </section>

          <Separator />

          <section className="grid gap-2">
            <Label htmlFor="company-status">Estado</Label>
            <Input
              id="company-status"
              value={formState.status ?? ""}
              onChange={handleChange("status")}
              placeholder="ACTIVE"
              disabled={isPending}
            />
          </section>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/tenancy/companies")}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
