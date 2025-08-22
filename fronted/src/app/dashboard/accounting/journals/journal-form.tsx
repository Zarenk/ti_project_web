"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Journal, createJournal, updateJournal } from "./journals.api";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number({ invalid_type_error: "Amount must be a number" }),
});

export type JournalFormValues = z.infer<typeof schema>;

interface JournalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Journal;
  onCreate?: (journal: Journal) => void;
  onUpdate?: (journal: Journal) => void;
}

export function JournalForm({
  open,
  onOpenChange,
  defaultValues,
  onCreate,
  onUpdate,
}: JournalFormProps) {
  const form = useForm<JournalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { date: "", description: "", amount: 0 },
  });

  const handleSubmit = async (values: JournalFormValues) => {
    try {
      if (defaultValues?.id) {
        const updated = await updateJournal(defaultValues.id, values);
        onUpdate?.(updated);
      } else {
        const created = await createJournal(values);
        onCreate?.(created);
        form.reset();
      }
      onOpenChange(false);
    } catch (errors: any) {
      Object.entries(errors).forEach(([key, message]) =>
        form.setError(key as keyof JournalFormValues, { message: String(message) })
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? "Edit Journal" : "New Journal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(+e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}