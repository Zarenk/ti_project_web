"use client";

import { useEffect, useState, type ReactElement } from "react";
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

export default function ChartPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

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

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Chart of Accounts</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Account
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
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