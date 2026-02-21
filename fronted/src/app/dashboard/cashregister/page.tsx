"use client";

import CashRegisterDashboard from "./components/cash-register-dashboard";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { CASHREGISTER_GUIDE_STEPS } from "./cashregister-guide-steps";

export default function CashRegisterPage() {
  return (
    <main className="container mx-auto py-8 px-8">
      <div className="flex items-center gap-2 mb-8">
        <h1 className="text-3xl font-bold">Gestión de Cajas</h1>
        <PageGuideButton steps={CASHREGISTER_GUIDE_STEPS} tooltipLabel="Guía de cajas" />
      </div>
      <CashRegisterDashboard />
    </main>
  );
}