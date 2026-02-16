"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Account, AccountType, fetchAccounts } from "./accounts.api";
import { AccountForm } from "./account-form";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Account type configuration
const accountTypeConfig: Record<
  AccountType,
  { label: string; color: string; bgColor: string; icon: typeof Wallet; description: string }
> = {
  ACTIVO: {
    label: "Lo que tienes",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    icon: Wallet,
    description: "Recursos y bienes de tu negocio",
  },
  PASIVO: {
    label: "Lo que debes",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950",
    icon: TrendingDown,
    description: "Obligaciones y deudas",
  },
  PATRIMONIO: {
    label: "Tu capital",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    icon: DollarSign,
    description: "Capital propio del negocio",
  },
  INGRESO: {
    label: "Dinero que entra",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950",
    icon: TrendingUp,
    description: "Ventas e ingresos",
  },
  GASTO: {
    label: "Dinero que sale",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-950",
    icon: TrendingDown,
    description: "Compras y gastos",
  },
};

function AccountCard({ account, onEdit }: { account: Account; onEdit: () => void }) {
  const config = account.accountType ? accountTypeConfig[account.accountType] : null;
  const Icon = config?.icon || Wallet;

  return (
    <Card
      className="group hover:shadow-md transition-all duration-200 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      onClick={onEdit}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {config && (
                <Badge className={cn("rounded-full px-3 py-1", config.bgColor, config.color)}>
                  <Icon className="w-3 h-3 mr-1.5" />
                  {config.label}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 leading-tight">
                {account.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Código: <span className="font-mono">{account.code}</span>
              </p>
              {config && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {config.description}
                </p>
              )}
            </div>

            {account.balance !== undefined && account.balance !== 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Saldo actual</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(account.balance, "PEN")}
                </p>
              </div>
            )}

            {account.updatedAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Última actividad: {new Date(account.updatedAt).toLocaleDateString("es-PE")}
              </p>
            )}
          </div>
        </div>

        {account.children && account.children.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Subcuentas ({account.children.length})
            </p>
            <div className="space-y-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
              {account.children.map((child) => (
                <div key={child.id} className="text-sm">
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {child.code}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 mx-2">·</span>
                  <span className="text-slate-700 dark:text-slate-300">{child.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChartPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { version } = useTenantSelection();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAccounts()
      .then((data) => {
        if (!cancelled) {
          setAccounts(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
          setError("No se pudieron cargar las cuentas contables.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const handleCreate = (account: Account) => {
    setAccounts((prev) => [...prev, account]);
  };

  const handleUpdate = (account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
  };

  // Flatten all accounts for searching (including children)
  const flattenedAccounts = useMemo(() => {
    const flatten = (accs: Account[]): Account[] => {
      return accs.flatMap((acc) => [acc, ...(acc.children ? flatten(acc.children) : [])]);
    };
    return flatten(accounts);
  }, [accounts]);

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;

    const query = searchQuery.toLowerCase();
    const filtered = flattenedAccounts.filter(
      (acc) =>
        acc.code.toLowerCase().includes(query) ||
        acc.name.toLowerCase().includes(query) ||
        accountTypeConfig[acc.accountType!]?.label.toLowerCase().includes(query)
    );

    return filtered;
  }, [accounts, flattenedAccounts, searchQuery]);

  const isEmpty = accounts.length === 0 && !loading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Plan de Cuentas
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Organiza las cuentas contables de tu negocio
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="mr-2 h-5 w-5" />
            Agregar cuenta
          </Button>
        </div>

        {/* Search */}
        {!isEmpty && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por código, nombre o tipo de cuenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">Cargando cuentas…</p>
          </div>
        )}

        {error && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
            <CardContent className="py-8 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {isEmpty && !error && (
          <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <CardContent className="py-16 text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Empieza con las cuentas básicas
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Agrega tus primeras cuentas contables: Caja y Bancos, Ventas, Compras y Gastos.
                Luego podrás expandir según necesites.
              </p>
              <Button
                size="lg"
                onClick={() => setCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-5 w-5" />
                Crear primera cuenta
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredAccounts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => setEditing(account)}
              />
            ))}
          </div>
        )}

        {!loading && !error && searchQuery && filteredAccounts.length === 0 && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-slate-500 dark:text-slate-400">
                No se encontraron cuentas que coincidan con "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forms */}
      <AccountForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        existingAccounts={accounts}
      />
      <AccountForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultValues={editing ?? undefined}
        onUpdate={handleUpdate}
        existingAccounts={accounts}
      />
    </div>
  );
}
