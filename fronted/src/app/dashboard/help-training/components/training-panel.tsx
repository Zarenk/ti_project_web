"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { approveEntry } from "../help-training.api"

const KB_SECTIONS = [
  { value: "general", label: "General" },
  { value: "sales", label: "Ventas" },
  { value: "entries", label: "Entradas/Compras" },
  { value: "inventory", label: "Inventario" },
  { value: "products", label: "Productos" },
  { value: "categories", label: "Categorías" },
  { value: "catalog", label: "Catálogo" },
  { value: "accounting", label: "Contabilidad" },
  { value: "cashregister", label: "Caja Registradora" },
  { value: "quotes", label: "Cotizaciones" },
  { value: "orders", label: "Órdenes" },
  { value: "providers", label: "Proveedores" },
  { value: "stores", label: "Tiendas" },
  { value: "users", label: "Usuarios" },
  { value: "tenancy", label: "Multi-tenancy" },
  { value: "reports", label: "Reportes" },
  { value: "exchange", label: "Tipo de Cambio" },
  { value: "messages", label: "Mensajes" },
  { value: "hardware", label: "Hardware" },
  { value: "api-integrations", label: "Integraciones API" },
]

interface TrainingPanelProps {
  onEntryAdded: () => void
}

export function TrainingPanel({ onEntryAdded }: TrainingPanelProps) {
  const [section, setSection] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [saving, setSaving] = useState(false)

  const canSubmit = section && question.trim().length >= 5 && answer.trim().length >= 10

  async function handleSubmit() {
    if (!canSubmit) return

    setSaving(true)
    try {
      await approveEntry({
        question: question.trim(),
        answer: answer.trim(),
        section,
      })
      toast.success("Entrada agregada al knowledge base")
      setQuestion("")
      setAnswer("")
      setSection("")
      onEntryAdded()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al agregar entrada",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          Agregar Pregunta al Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Sección</label>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una sección..." />
            </SelectTrigger>
            <SelectContent>
              {KB_SECTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pregunta</label>
          <Input
            placeholder="¿Cómo puedo registrar una venta?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 5 caracteres. Escribe la pregunta tal como la haría un usuario.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Respuesta</label>
          <Textarea
            placeholder="Para registrar una venta, ve a Ventas > Nueva Venta y..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 10 caracteres. Incluye pasos claros y concisos.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Agregar al Knowledge Base
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
