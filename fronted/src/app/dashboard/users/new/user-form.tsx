"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenantSelection } from "@/context/tenant-selection-context";

import { createUser } from "../users.api";

const userSchema = z
  .object({
    email: z.string().email("Correo electronico invalido"),
    username: z
      .string()
      .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
      .max(50, "El nombre de usuario no puede exceder 50 caracteres"),
    password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "EMPLOYEE", "CLIENT"]),
    status: z.enum(["ACTIVO", "INACTIVO"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

type UserFormType = z.infer<typeof userSchema>;

const DEFAULT_VALUES: UserFormType = {
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "EMPLOYEE",
  status: "ACTIVO",
};

export default function UserForm(): React.ReactElement {
  const router = useRouter();
  const { version, selection } = useTenantSelection();

  const form = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, register, setValue, formState, watch, reset } = form;
  const selectedRole = watch("role");
  const selectedStatus = watch("status");

  useEffect(() => {
    reset(DEFAULT_VALUES);
  }, [reset, version]);

  const onSubmit = handleSubmit(async (data) => {
    if (selection.orgId == null) {
      toast.error("Selecciona una organización antes de crear un usuario.");
      return;
    }

    try {
      await createUser(
        data.email,
        data.username,
        data.password,
        data.role,
        data.status,
        selection.orgId,
      );
      toast.success("Usuario creado correctamente");
      router.push("/dashboard/users");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al crear usuario";
      toast.error(message);
    }
  });

  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <div className="flex flex-col">
        <Label className="py-3">Correo electronico</Label>
        <Input {...register("email")} />
        {formState.errors.email && (
          <p className="text-sm text-red-500">{formState.errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Nombre de usuario</Label>
        <Input {...register("username")} />
        {formState.errors.username && (
          <p className="text-sm text-red-500">
            {formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Contrasena</Label>
        <Input type="password" {...register("password")} />
        {formState.errors.password && (
          <p className="text-sm text-red-500">
            {formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Confirmar contrasena</Label>
        <Input type="password" {...register("confirmPassword")} />
        {formState.errors.confirmPassword && (
          <p className="text-sm text-red-500">
            {formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Rol</Label>
        <Select
          value={selectedRole}
          onValueChange={(value) =>
            setValue("role", value as "ADMIN" | "EMPLOYEE" | "CLIENT")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="EMPLOYEE">Empleado</SelectItem>
            <SelectItem value="CLIENT">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Estado</Label>
        <Select
          value={selectedStatus}
          onValueChange={(value) =>
            setValue("status", value as "ACTIVO" | "INACTIVO")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVO">Activo</SelectItem>
            <SelectItem value="INACTIVO">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="mt-4">Crear Usuario</Button>
    </form>
  );
}
