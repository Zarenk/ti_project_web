"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Account, fetchAccounts } from "./accounts.api";
import { AccountForm } from "./account-form";
import { useTenantSelection } from "@/context/tenant-selection-context";

export default function ChartPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const renderRows = (items: Account[], level = 0): ReactElement[] =>
    items.flatMap((acc) => [
      <TableRow key={acc.id}>
        <TableCell style={{ paddingLeft: level * 16 }}>{acc.code}</TableCell>
        <TableCell>{acc.name}</TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(acc)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>,
      ...(acc.children ? renderRows(acc.children, level + 1) : []),
    ]);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Cargando cuentas…</p>;
    }
    if (error) {
      return (
        <p className="text-sm text-destructive">
          {error}
        </p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>{renderRows(accounts)}</TableBody>
        </Table>
      </div>
    );
  }, [accounts, loading, error]);

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Chart of Accounts</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Account
          </Button>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
      <AccountForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
      <AccountForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultValues={editing ?? undefined}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
