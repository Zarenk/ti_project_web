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
import {
  Journal,
  fetchJournals,
  deleteJournal,
} from "./journals.api";
import { JournalForm } from "./journal-form";

export default function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Journal | null>(null);

  useEffect(() => {
    fetchJournals().then(setJournals).catch(() => setJournals([]));
  }, []);

  const handleCreate = (journal: Journal) => {
    setJournals((prev) => [...prev, journal]);
  };

  const handleUpdate = (journal: Journal) => {
    setJournals((prev) => prev.map((j) => (j.id === journal.id ? journal : j)));
  };

  const handleDelete = async (id: string) => {
    await deleteJournal(id);
    setJournals((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>New Journal</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {journals.map((j) => (
            <TableRow key={j.id}>
              <TableCell>{j.date}</TableCell>
              <TableCell>{j.description}</TableCell>
              <TableCell className="text-right">{j.amount}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(j)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(j.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <JournalForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
      <JournalForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        defaultValues={editing ?? undefined}
        onUpdate={handleUpdate}
      />
    </div>
  );
}