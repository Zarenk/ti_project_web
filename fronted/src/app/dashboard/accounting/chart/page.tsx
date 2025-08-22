"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

  const renderRows = (items: Account[], level = 0): JSX.Element[] =>
    items.flatMap((acc) => [
      <TableRow key={acc.id}>
        <TableCell style={{ paddingLeft: level * 16 }}>{acc.code}</TableCell>
        <TableCell>{acc.name}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" onClick={() => setEditing(acc)}>
            Edit
          </Button>
        </TableCell>
      </TableRow>,
      ...(acc.children ? renderRows(acc.children, level + 1) : []),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>New Account</Button>
      </div>
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