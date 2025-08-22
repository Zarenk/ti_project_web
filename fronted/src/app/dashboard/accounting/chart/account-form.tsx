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
import { Account, createAccount, updateAccount } from "./accounts.api";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().optional(),
});

export type AccountFormValues = z.infer<typeof schema>;

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Account & { id?: string };
  onCreate?: (account: Account) => void;
  onUpdate?: (account: Account) => void;
}

export function AccountForm({
  open,
  onOpenChange,
  defaultValues,
  onCreate,
  onUpdate,
}: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { code: "", name: "", parentId: "" },
  });

  const handleSubmit = async (values: AccountFormValues) => {
    try {
      if (defaultValues?.id) {
        const updated = await updateAccount(defaultValues.id, values);
        onUpdate?.(updated);
      } else {
        const created = await createAccount(values);
        onCreate?.(created);
        form.reset();
      }
      onOpenChange(false);
    } catch (errors: any) {
      Object.entries(errors).forEach(([key, message]) =>
        form.setError(key as keyof AccountFormValues, { message: String(message) })
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? "Edit Account" : "New Account"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
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