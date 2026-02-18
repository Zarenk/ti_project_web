"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { useDebounce } from "@/app/hooks/useDebounce";

import { checkUserAvailability, createUser } from "../users.api";

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
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);

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
  const debouncedEmail = useDebounce(normalizedEmail, 300);
  const debouncedUsername = useDebounce(normalizedUsername, 300);

  useEffect(() => {
    reset(DEFAULT_VALUES);
  }, [reset, version]);

  useEffect(() => {
    let active = true;
    const hasEmail = debouncedEmail.length > 0;
    const hasUsername = debouncedUsername.length > 0;

    if (!hasEmail && !hasUsername) {
      setEmailExists(null);
      setUsernameExists(null);
      setIsUsersLoading(false);
      return;
    }

    setIsUsersLoading(true);

    const fetchAvailability = async (): Promise<void> => {
      try {
        const response = await checkUserAvailability({
          email: hasEmail ? debouncedEmail : undefined,
          username: hasUsername ? debouncedUsername : undefined,
        });
        if (!active) return;
        setEmailExists(hasEmail ? response.emailExists : null);
        setUsernameExists(hasUsername ? response.usernameExists : null);
      } catch (error) {
        console.error("No se pudieron verificar los usuarios", error);
        if (!active) return;
        setEmailExists(null);
        setUsernameExists(null);
      } finally {
        if (active) {
          setIsUsersLoading(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      active = false;
    };
  }, [debouncedEmail, debouncedUsername, version]);

  const hasEmail =
    Boolean(emailValue.trim()) && !formState.errors.email && emailExists !== true;
  const hasUsername =
    Boolean(usernameValue.trim()) &&
    !formState.errors.username &&
    usernameExists !== true;
  const hasPassword = PASSWORD_REQUIREMENTS.every((req) => req.predicate(passwordValue));
  const hasConfirmPassword = Boolean(confirmPasswordValue.trim()) && passwordsMatch === true;
  const hasRole = Boolean(selectedRole);
  const hasStatus = Boolean(selectedStatus);

  const renderRequiredChip = (filled: boolean) => (
    <span
      className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      }`}
    >
      {filled ? <Check className="mr-1 h-3 w-3" /> : null}
      {filled ? "Listo" : "Requerido"}
    </span>
  );

  const onSubmit = handleSubmit(async (data) => {
    if (selection.orgId == null) {
      toast.error("Selecciona una organizacion antes de crear un usuario.");
      return;
    }
    if (emailExists) {
      toast.error("El correo ya esta registrado. Usa otro correo.");
      return;
    }
    if (usernameExists) {
      toast.error("El nombre de usuario ya esta registrado. Usa otro.");
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
    <div className="container mx-auto grid w-full max-w-2xl sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-none">
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-6">
          <div className="flex flex-col">
            <Label className="py-3">
              Correo electronico
              {renderRequiredChip(hasEmail)}
            </Label>
            <Input {...register("email")} />
            {formState.errors.email && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.email.message}
              </p>
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
            <Label className="py-3">
              Nombre de usuario
              {renderRequiredChip(hasUsername)}
            </Label>
            <Input {...register("username")} />
            {formState.errors.username && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
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
            <Label className="py-3">
              Contrasena
              {renderRequiredChip(hasPassword)}
            </Label>
            <Input type="password" {...register("password")} />
            {formState.errors.password && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.password.message}
              </p>
            )}
            <PasswordRequirementList value={passwordValue} />
          </div>

          <div className="flex flex-col">
            <Label className="py-3">
              Confirmar contrasena
              {renderRequiredChip(hasConfirmPassword)}
            </Label>
            <Input type="password" {...register("confirmPassword")} />
            {formState.errors.confirmPassword && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.confirmPassword.message}
              </p>
            )}
            {confirmPasswordValue.length > 0 && (
              <p
                className={`mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium ${
                  passwordsMatch === false
                    ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                    : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                }`}
              >
                {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {passwordsMatch
                  ? "Las contrasenas coinciden"
                  : "Las contrasenas no coinciden"}
              </p>
            )}
            <PasswordRequirementList value={confirmPasswordValue} />
          </div>

          <div className="flex flex-col">
            <Label className="py-3">
              Rol
              {renderRequiredChip(hasRole)}
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setValue("role", value as "ADMIN" | "EMPLOYEE" | "CLIENT")
              }
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el rol del usuario</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                <SelectItem value="CLIENT">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <Label className="py-3">
              Estado
              {renderRequiredChip(hasStatus)}
            </Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setValue("status", value as "ACTIVO" | "INACTIVO")
              }
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el estado del usuario</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 lg:flex-row lg:items-center lg:justify-end">
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() => router.back()}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() => {
              reset(DEFAULT_VALUES)
              setEmailExists(null)
              setUsernameExists(null)
            }}
          >
            Limpiar
          </Button>
          <Button className="w-full cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600 lg:w-auto lg:min-w-[160px]">
            Crear Usuario
          </Button>
        </div>
      </form>
    </div>
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

  const toneClass = exists
    ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
    : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <p className={`mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-medium ${toneClass}`}>
      {exists ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      {exists ? takenLabel : availableLabel}
    </p>
  );
}
