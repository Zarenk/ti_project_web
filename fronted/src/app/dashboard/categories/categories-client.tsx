"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { DataTable } from "./data-table";
import { columns, type Categories } from "./columns";
import { getCategories } from "./categories.api";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { CATEGORIES_GUIDE_STEPS } from "./categories-guide-steps";
import { queryKeys } from "@/lib/query-keys";

type RawCategory = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  image?: string | null;
  createdAt?: string | Date | null;
};

export function CategoriesClient(): React.ReactElement {
  const { selection } = useTenantSelection();

  const { data: rawCategories, isLoading, error } = useQuery<RawCategory[]>({
    queryKey: queryKeys.categories.list(selection.orgId, selection.companyId),
    queryFn: async () => {
      const response = await getCategories();
      return Array.isArray(response) ? response : [];
    },
    enabled: selection.orgId !== null,
  });

  const categories = useMemo<Categories[]>(
    () =>
      (rawCategories ?? []).map((item) => ({
        id: String(item.id),
        name: item.name?.trim() ?? "Sin nombre",
        description: item.description ?? "",
        status: item.status ?? "ACTIVO",
        image: item.image ?? "",
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      })),
    [rawCategories],
  );

  const content = useMemo(() => {
    if (isLoading) {
      return <TablePageSkeleton title={false} columns={3} rows={5} actions={false} />;
    }

    if (error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-6 text-destructive">
          {error instanceof Error ? error.message : "No se pudieron cargar las categorias."}
        </div>
      );
    }

    return <DataTable columns={columns} data={categories} />;
  }, [categories, error, isLoading]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 px-5 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Categorias</h1>
            <PageGuideButton steps={CATEGORIES_GUIDE_STEPS} tooltipLabel="Guía de categorías" />
          </div>

          {/* ── Mobile: green icon only ─────────────────── */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <Button
              asChild
              size="icon"
              className="h-8 w-8 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95 dark:border-emerald-400/30"
              title="Nueva categoría"
            >
              <Link href="/dashboard/categories/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* ── Desktop: full button ────────────────────── */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              asChild
              className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <Link href="/dashboard/categories/new">
                <Plus className="h-4 w-4" />
                Nueva categoría
              </Link>
            </Button>
          </div>
        </div>
        {content}
      </div>
    </section>
  );
}
