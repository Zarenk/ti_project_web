import { z } from "zod"

export const complaintSchema = z
  .object({
    // Sección 1: Consumidor
    consumerName: z
      .string()
      .min(1, "El nombre es obligatorio")
      .max(200),
    consumerDocType: z.enum(["DNI", "CE"], {
      required_error: "Seleccione tipo de documento",
    }),
    consumerDocNumber: z
      .string()
      .min(6, "Mínimo 6 caracteres")
      .max(20, "Máximo 20 caracteres"),
    consumerAddress: z.string().max(300).optional().or(z.literal("")),
    consumerPhone: z.string().max(20).optional().or(z.literal("")),
    consumerEmail: z
      .string()
      .min(1, "El email es obligatorio")
      .email("Email inválido"),
    isMinor: z.boolean().default(false),
    parentName: z.string().max(200).optional().or(z.literal("")),
    parentDocType: z.enum(["DNI", "CE"]).optional(),
    parentDocNumber: z.string().max(20).optional().or(z.literal("")),

    // Sección 2: Bien contratado
    goodType: z.enum(["PRODUCTO", "SERVICIO"], {
      required_error: "Seleccione producto o servicio",
    }),
    claimedAmount: z.coerce.number().positive().optional().or(z.literal(0)),
    amountCurrency: z.enum(["PEN", "USD"]).default("PEN"),
    goodDescription: z
      .string()
      .min(1, "La descripción es obligatoria")
      .max(500),

    // Sección 3: Detalle
    complaintType: z.enum(["RECLAMO", "QUEJA"], {
      required_error: "Seleccione reclamo o queja",
    }),
    detail: z
      .string()
      .min(10, "El detalle debe tener al menos 10 caracteres")
      .max(2000),
    consumerRequest: z
      .string()
      .min(5, "El pedido debe tener al menos 5 caracteres")
      .max(1000),

    // Firma virtual
    signatureConfirmed: z.literal(true, {
      errorMap: () => ({
        message: "Debe confirmar la declaración para enviar el reclamo",
      }),
    }),
  })
  .refine(
    (data) => {
      if (data.isMinor) {
        return !!data.parentName && !!data.parentDocType && !!data.parentDocNumber
      }
      return true
    },
    {
      message: "Los datos del padre/madre son obligatorios para menores de edad",
      path: ["parentName"],
    }
  )

export type ComplaintFormData = z.infer<typeof complaintSchema>
