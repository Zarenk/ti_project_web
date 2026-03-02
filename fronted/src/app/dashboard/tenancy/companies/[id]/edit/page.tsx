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
    <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
              Empresas
            </Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
            Editar empresa
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Actualiza los datos de la empresa. Los cambios aplican a toda la organización.
          </p>
        </div>
        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
          <Link href="/dashboard/tenancy/companies">Volver a empresas</Link>
        </Button>
      </header>
      <CompanyEditForm company={company} />
    </div>
  );
}
