"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Building2, FileText, Globe, History, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { CompanyDetail } from "../../../tenancy.api";
import {
  useCompanyForm,
  getTabsWithErrors,
  getFirstErrorTab,
  validateCompanyForm,
  type CompanyTab,
} from "./use-company-form";
import { useSunatHistory } from "./use-sunat-history";
import { CompanyGeneralTab } from "./company-general-tab";
import { CompanyReceiptsTab } from "./company-receipts-tab";
import { CompanySunatTab } from "./company-sunat-tab";
import { CompanyHistoryTab } from "./company-history-tab";

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: "general" as CompanyTab, label: "General", icon: Building2 },
  { id: "receipts" as CompanyTab, label: "Comprobantes", icon: FileText },
  { id: "sunat" as CompanyTab, label: "SUNAT", icon: Globe },
  { id: "history" as CompanyTab, label: "Historial", icon: History },
] as const;

interface CompanyEditFormProps {
  company: CompanyDetail;
}

export function CompanyEditForm({ company }: CompanyEditFormProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<CompanyTab>("general");

  const form = useCompanyForm(company);
  const history = useSunatHistory(company.id);

  const isEditable = activeTab !== "history";

  // Compute which tabs have errors for showing indicator dots
  const tabsWithErrors = useMemo(
    () => getTabsWithErrors(form.fieldErrors),
    [form.fieldErrors],
  );

  // Intercept form submit to auto-switch to error tab
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Run validation first to check for errors
    const errors = validateCompanyForm(form.formState, form.sequenceState);
    const hasErrors = Object.values(errors).some(Boolean);

    if (hasErrors) {
      const errorTab = getFirstErrorTab(errors);
      if (errorTab && errorTab !== activeTab) {
        setActiveTab(errorTab);
        toast.error(`Hay campos por corregir en la sección "${TABS.find((t) => t.id === errorTab)?.label}".`);
        event.preventDefault();
        return;
      }
    }

    // Delegate to the hook's submit handler
    form.handleSubmit(event);
  };

  const renderTabButton = (
    tab: (typeof TABS)[number],
    layout: "mobile" | "desktop",
  ) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const hasError = tabsWithErrors.has(tab.id);
    const isMobile = layout === "mobile";

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "relative flex items-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
          isMobile ? "px-3 py-2" : "gap-3 px-3 py-2.5 w-full",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {tab.label}
        {hasError && !isActive && (
          <span className="ml-auto h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Sidebar (desktop) / Horizontal tabs (mobile) ─── */}
      <nav className="w-full shrink-0 lg:w-52">
        {/* Mobile: horizontal scroll tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
          {TABS.map((tab) => renderTabButton(tab, "mobile"))}
        </div>

        {/* Desktop: vertical sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:gap-1 lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:p-2 lg:shadow-sm lg:dark:border-slate-700 lg:dark:bg-slate-900">
          {TABS.map((tab) => renderTabButton(tab, "desktop"))}

          {/* Company info at bottom of sidebar */}
          <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-slate-700">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {company.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {company.organization.name}
            </p>
          </div>
        </div>
      </nav>

      {/* ── Content area ──────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {isEditable ? (
          <form onSubmit={handleFormSubmit} className="flex flex-col min-h-[calc(100dvh-10rem)]">
            <Card className="flex-1 border-slate-200 shadow-sm dark:border-slate-700">
              <CardContent className="pt-6">
                <div
                  key={activeTab}
                  className="animate-in fade-in-0 slide-in-from-right-2 duration-200"
                >
                  {activeTab === "general" && (
                    <CompanyGeneralTab
                      company={company}
                      formState={form.formState}
                      fieldErrors={form.fieldErrors}
                      isPending={form.isPending}
                      setFormState={form.setFormState}
                      handleBasicChange={form.handleBasicChange}
                      handleLimitedTextChange={form.handleLimitedTextChange}
                      handleRucChange={form.handleRucChange}
                      inputValidationClass={form.inputValidationClass}
                    />
                  )}
                  {activeTab === "receipts" && (
                    <CompanyReceiptsTab
                      formState={form.formState}
                      sequenceState={form.sequenceState}
                      fieldErrors={form.fieldErrors}
                      isPending={form.isPending}
                      sunatEnvironment={form.formState.sunatEnvironment}
                      handleSequenceSerieChange={form.handleSequenceSerieChange}
                      handleSequenceCorrelativeChange={form.handleSequenceCorrelativeChange}
                      handleColorPickerChange={form.handleColorPickerChange}
                      handleColorTextChange={form.handleColorTextChange}
                      handleClearColor={form.handleClearColor}
                      inputValidationClass={form.inputValidationClass}
                    />
                  )}
                  {activeTab === "sunat" && (
                    <CompanySunatTab
                      company={company}
                      formState={form.formState}
                      fieldErrors={form.fieldErrors}
                      isPending={form.isPending}
                      handleBasicChange={form.handleBasicChange}
                      handleLimitedTextChange={form.handleLimitedTextChange}
                      handleRucChange={form.handleRucChange}
                      handleEnvironmentChange={form.handleEnvironmentChange}
                      inputValidationClass={form.inputValidationClass}
                      updateFormState={form.updateFormState}
                      onCertificateUploaded={() => {
                        history.fetchSunatLogs();
                        history.fetchSunatPdfs();
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Sticky footer: action buttons ── */}
            <div className="sticky bottom-0 z-10 mt-2 rounded-t-lg border-t bg-white/90 py-3 backdrop-blur dark:bg-background/90">
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer flex-1 sm:flex-none"
                  onClick={() => window.history.back()}
                  disabled={form.isPending}
                >
                  <ArrowLeft className="h-4 w-4 flex-shrink-0" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer flex-1 sm:flex-none"
                  disabled={form.isPending}
                >
                  <Save className="h-4 w-4 flex-shrink-0" />
                  {form.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <Card className="border-slate-200 shadow-sm dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
                <CompanyHistoryTab history={history} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}