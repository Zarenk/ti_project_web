"use client";

import CashRegisterDashboard from "./components/cash-register-dashboard";

export default function CashRegisterPage() {
  return (
    <main className="container mx-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-8">Gestión de Cajas</h1>
      <CashRegisterDashboard />
    </main>
  );
}