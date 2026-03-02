import { Badge } from "@/components/ui/badge";
import { listOrganizationsWithCompanies } from "../tenancy.api";
import { CompaniesOverview } from "./companies-overview";
import { CompaniesGuideButton } from "./companies-guide-button";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const organizations = await listOrganizationsWithCompanies();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-3">
        <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
          Empresas
        </Badge>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Empresas por organización
            </h1>
            <CompaniesGuideButton />
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulta y administra las empresas creadas en cada organización. Los
            super administradores globales visualizan todas las organizaciones,
            mientras que los super administradores organizacionales sólo las de
            su grupo.
          </p>
        </div>
      </header>
      <CompaniesOverview organizations={organizations} />
    </div>
  );
}
