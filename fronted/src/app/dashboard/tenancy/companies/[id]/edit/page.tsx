import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCompanyDetail } from "../../../tenancy.api";
import { CompanyEditForm } from "./company-edit-form";

export const dynamic = "force-dynamic";

interface EditCompanyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isFinite(companyId)) {
    notFound();
  }

  const company = await getCompanyDetail(companyId);
  if (!company) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-3">
        <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
          Empresas
        </Badge>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Editar empresa
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Actualiza los datos de la empresa seleccionada. Los cambios se verán
            reflejados para toda la organización.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/tenancy/companies">Volver a empresas</Link>
        </Button>
      </header>
      <CompanyEditForm company={company} />
    </div>
  );
}
