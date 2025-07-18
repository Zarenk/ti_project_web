"use client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUser } from '../users.api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const userSchema = z
  .object({
    email: z.string().email('Correo electrónico inválido'),
    username: z
      .string()
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
      .max(50, 'El nombre de usuario no puede exceder 50 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
    role: z.enum(['ADMIN', 'EMPLOYEE', 'CLIENT']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type UserFormType = z.infer<typeof userSchema>;

export default function UserForm() {
  const router = useRouter();
  const form = useForm<UserFormType>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'EMPLOYEE',
    },
  });

  const { handleSubmit, register, setValue, formState } = form;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createUser(data.email, data.username, data.password, data.role);
      toast.success('Usuario creado correctamente');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    }
  });

  return (
    <form className="flex flex-col gap-2" onSubmit={onSubmit}>
      <div className="flex flex-col">
        <Label className="py-3">Correo electrónico</Label>
        <Input {...register('email')} />
        {formState.errors.email && (
          <p className="text-red-500 text-sm">{formState.errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col">
        <Label className="py-3">Nombre de usuario</Label>
        <Input {...register('username')} />
        {formState.errors.username && (
          <p className="text-red-500 text-sm">{formState.errors.username.message}</p>
        )}
      </div>
      <div className="flex flex-col">
        <Label className="py-3">Contraseña</Label>
        <Input type="password" {...register('password')} />
        {formState.errors.password && (
          <p className="text-red-500 text-sm">{formState.errors.password.message}</p>
        )}
      </div>
      <div className="flex flex-col">
        <Label className="py-3">Confirmar contraseña</Label>
        <Input type="password" {...register('confirmPassword')} />
        {formState.errors.confirmPassword && (
          <p className="text-red-500 text-sm">{formState.errors.confirmPassword.message}</p>
        )}
      </div>
      <div className="flex flex-col">
        <Label className="py-3">Rol</Label>
        <Select
          value={form.watch('role')}
          defaultValue={form.getValues('role')}
          onValueChange={(value) => setValue('role', value as 'ADMIN' | 'EMPLOYEE' | 'CLIENT')}
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
      <Button className="mt-4">Crear Usuario</Button>
    </form>
  );
}