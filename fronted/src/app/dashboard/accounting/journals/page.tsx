"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
      <Card className="shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Journals</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Journal
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(j)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(j.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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