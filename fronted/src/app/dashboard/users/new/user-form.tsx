"use client";

import { useEffect, useState } from "react";
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

import { createUser, getUsers, type DashboardUser } from "../users.api";

const passwordSchema = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres")
  .regex(/\d/, "La contrasena debe incluir al menos un numero")
  .regex(/[^A-Za-z0-9]/, "La contrasena debe incluir al menos un caracter especial");

const userSchema = z
  .object({
    email: z.string().email("Correo electronico invalido"),
    username: z
      .string()
      .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
      .max(50, "El nombre de usuario no puede exceder 50 caracteres"),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "EMPLOYEE", "CLIENT"]),
    status: z.enum(["ACTIVO", "INACTIVO"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

type UserFormType = z.infer<typeof userSchema>;

const PASSWORD_REQUIREMENTS = [
  {
    label: "Minimo 8 caracteres",
    predicate: (value: string) => value.length >= 8,
  },
  {
    label: "Debe incluir al menos un numero",
    predicate: (value: string) => /\d/.test(value),
  },
  {
    label: "Debe incluir un caracter especial",
    predicate: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

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
  const [knownUsers, setKnownUsers] = useState<DashboardUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  const form = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { handleSubmit, register, setValue, formState, watch, reset } = form;
  const selectedRole = watch("role");
  const selectedStatus = watch("status");
  const emailValue = watch("email") ?? "";
  const usernameValue = watch("username") ?? "";
  const passwordValue = watch("password") ?? "";
  const confirmPasswordValue = watch("confirmPassword") ?? "";
  const passwordsMatch =
    confirmPasswordValue.length === 0
      ? null
      : passwordValue === confirmPasswordValue;
  const normalizedEmail = emailValue.trim().toLowerCase();
  const normalizedUsername = usernameValue.trim().toLowerCase();
  const emailExists =
    emailValue.length === 0 || isUsersLoading
      ? null
      : knownUsers.some(
          (user) => user.email.trim().toLowerCase() === normalizedEmail,
        );
  const usernameExists =
    usernameValue.length === 0 || isUsersLoading
      ? null
      : knownUsers.some(
          (user) => user.username.trim().toLowerCase() === normalizedUsername,
        );

  useEffect(() => {
    reset(DEFAULT_VALUES);
  }, [reset, version]);

  useEffect(() => {
    let active = true;
    setIsUsersLoading(true);

    const fetchUsers = async (): Promise<void> => {
      try {
        const users = await getUsers();
        if (active) {
          setKnownUsers(users);
        }
      } catch (error) {
        console.error("No se pudieron obtener los usuarios", error);
        if (active) {
          setKnownUsers([]);
        }
      } finally {
        if (active) {
          setIsUsersLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      active = false;
    };
  }, [version]);

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
        <FieldAvailabilityIndicator
          value={emailValue}
          exists={emailExists}
          loading={isUsersLoading}
          takenLabel="Este correo ya existe"
          availableLabel="Correo disponible"
        />
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Nombre de usuario</Label>
        <Input {...register("username")} />
        {formState.errors.username && (
          <p className="text-sm text-red-500">
            {formState.errors.username.message}
          </p>
        )}
        <FieldAvailabilityIndicator
          value={usernameValue}
          exists={usernameExists}
          loading={isUsersLoading}
          takenLabel="Este nombre de usuario ya existe"
          availableLabel="Nombre de usuario disponible"
        />
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Contrasena</Label>
        <Input type="password" {...register("password")} />
        {formState.errors.password && (
          <p className="text-sm text-red-500">
            {formState.errors.password.message}
          </p>
        )}
        <PasswordRequirementList value={passwordValue} />
      </div>

      <div className="flex flex-col">
        <Label className="py-3">Confirmar contrasena</Label>
        <Input type="password" {...register("confirmPassword")} />
        {formState.errors.confirmPassword && (
          <p className="text-sm text-red-500">
            {formState.errors.confirmPassword.message}
          </p>
        )}
        {confirmPasswordValue.length > 0 && (
          <p
            className={`mt-1 text-xs ${
              passwordsMatch === false ? "text-rose-500" : "text-emerald-600"
            }`}
          >
            {passwordsMatch
              ? "Las contrasenas coinciden"
              : "Las contrasenas no coinciden"}
          </p>
        )}
        <PasswordRequirementList value={confirmPasswordValue} />
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

function PasswordRequirementList({
  value,
}: {
  value: string;
}): React.ReactElement | null {
  if (value.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 space-y-1 text-xs" aria-live="polite">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const isValid = requirement.predicate(value);
        return (
          <p
            key={requirement.label}
            className={isValid ? "text-emerald-600" : "text-rose-500"}
          >
            {requirement.label}
          </p>
        );
      })}
    </div>
  );
}

type FieldAvailabilityIndicatorProps = {
  value: string;
  exists: boolean | null;
  loading: boolean;
  takenLabel: string;
  availableLabel: string;
};

function FieldAvailabilityIndicator({
  value,
  exists,
  loading,
  takenLabel,
  availableLabel,
}: FieldAvailabilityIndicatorProps): React.ReactElement | null {
  if (value.trim().length === 0 || loading || exists == null) {
    return null;
  }

  const toneClass = exists ? "text-rose-500" : "text-emerald-600";

  return (
    <p className={`mt-1 text-xs ${toneClass}`}>
      {exists ? takenLabel : availableLabel}
    </p>
  );
}
